#!/usr/bin/env node
/**
 * scripts/daily-jobs-check.mjs
 *
 * Daily PM job checker — DB-driven, all 4 ATS providers (March 2026).
 *
 * Architecture:
 *   - Reads companies exclusively from ai_companies table (is_hiring=true, has at least one slug)
 *   - KNOWN_COMPANIES below is only used as a fallback override / seed on first run
 *   - Run migrate-ats-slugs.mjs once to bootstrap the DB with correct slugs
 *
 * ATS Providers supported:
 *   Greenhouse — greenhouse_slug column
 *   Lever      — lever_slug column
 *   Workable   — workable_slug column
 *   Ashby      — ashby_slug column
 *
 * Ashby note: Rate-limited after ~3-4 rapid calls. Uses 600ms sleep + 1 retry with backoff.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// PM role keywords — matched case-insensitively anywhere in title
const PM_KEYWORDS = [
  'product manager', 'product lead', 'head of product', 'vp of product', 'vp product',
  'director of product', 'chief product', 'technical pm', 'ai pm', 'product operations',
  'program manager', 'product marketing', 'group product manager', 'senior pm', 'staff pm',
  'principal pm', 'product strategy', 'growth pm', 'associate pm', 'product owner',
  'technical product', 'product analyst', 'product designer', 'product engineer',
];
const isPMRole = title => PM_KEYWORDS.some(k => (title || '').toLowerCase().includes(k));

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN_COMPANIES — fallback / seed data only.
// Used when a company hasn't been written to the DB yet (e.g. first-ever run).
// After running migrate-ats-slugs.mjs, the DB is the source of truth.
// Add new companies here and they'll get upserted into the DB automatically.
// ─────────────────────────────────────────────────────────────────────────────
const KNOWN_COMPANIES = [
  // Frontier Labs
  { name: 'Anthropic',    greenhouse: 'anthropic' },
  { name: 'OpenAI',       ashby:      'openai' },
  { name: 'Mistral AI',   lever:      'mistral' },
  { name: 'Cohere',       ashby:      'cohere' },
  { name: 'xAI',          greenhouse: 'xai' },
  // AI Infrastructure & Cloud
  { name: 'Scale AI',     greenhouse: 'scaleai' },
  { name: 'Together AI',  greenhouse: 'togetherai' },
  { name: 'Hugging Face', workable:   'huggingface' },
  { name: 'CoreWeave',    greenhouse: 'coreweave' },
  // Creative & Generative AI
  { name: 'Runway',       greenhouse: 'runwayml' },
  { name: 'ElevenLabs',   ashby:      'elevenlabs' },
  { name: 'Ideogram',     ashby:      'ideogram' },
  // Developer AI Platforms
  { name: 'LangChain',    ashby:      'langchain' },
  { name: 'Perplexity',   ashby:      'perplexity' },
  { name: 'Glean',        greenhouse: 'gleanwork' },
  { name: 'Cursor',       ashby:      'cursor' },
  { name: 'Cognition',    ashby:      'cognition' },
  { name: 'Sierra AI',    ashby:      'sierra' },
  { name: 'Harvey AI',    ashby:      'harvey' },
  { name: 'Contextual AI',greenhouse: 'contextualai' },
  { name: 'Imbue',        greenhouse: 'imbue' },
  { name: 'Replit',       ashby:      'replit' },
  { name: 'Linear',       ashby:      'linear' },
  // AI-Native Productivity
  { name: 'Descript',     greenhouse: 'descript' },
  { name: 'Airtable',     greenhouse: 'airtable' },
  // Robotics & Embodied AI
  { name: 'Neuralink',    greenhouse: 'neuralink' },
];

// ─────────────────────────────────────────────────────────
// ATS Fetchers — each returns array of job objects or null
// ─────────────────────────────────────────────────────────

async function fetchGreenhouse(slug) {
  try {
    const r = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return null;
    const { jobs } = await r.json();
    if (!Array.isArray(jobs)) return null;
    return jobs.map(j => ({
      external_id: String(j.id),
      title: j.title,
      department: j.departments?.[0]?.name || null,
      location: j.location?.name || null,
      remote: (j.location?.name || '').toLowerCase().includes('remote'),
      job_url: j.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${j.id}`,
      ats_source: 'greenhouse',
    }));
  } catch { return null; }
}

async function fetchLever(slug) {
  try {
    const r = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return null;
    const jobs = await r.json();
    if (!Array.isArray(jobs)) return null;
    return jobs.map(j => ({
      external_id: j.id,
      title: j.text,
      department: j.categories?.team || j.categories?.department || null,
      location: j.categories?.location || null,
      remote: (j.categories?.commitment || '').toLowerCase().includes('remote'),
      job_url: j.hostedUrl || `https://jobs.lever.co/${slug}/${j.id}`,
      ats_source: 'lever',
    }));
  } catch { return null; }
}

async function fetchWorkable(slug) {
  try {
    const r = await fetch(
      `https://apply.workable.com/api/v3/accounts/${slug}/jobs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '', location: [], remote: [] }), // remote must be array
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!r.ok) return null;
    const { results } = await r.json();
    if (!Array.isArray(results)) return null;
    return results.map(j => ({
      external_id: j.shortcode || j.id,
      title: j.title,
      department: j.department || null,
      location: j.location ? `${j.location.city || ''} ${j.location.country || ''}`.trim() : null,
      remote: j.remote || false,
      job_url: `https://apply.workable.com/${slug}/j/${j.shortcode || j.id}/`,
      ats_source: 'workable',
    }));
  } catch { return null; }
}

/**
 * Ashby GraphQL fetcher with 1 automatic retry after 2s backoff.
 * Ashby rate-limits ~3-4 rapid requests, so we retry once on null board response.
 */
async function fetchAshby(slug, attempt = 1) {
  try {
    const r = await fetch(
      'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'ApiJobBoardWithTeams',
          variables: { organizationHostedJobsPageName: slug },
          query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
            jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
              jobPostings {
                id title isRemote departmentName
                jobLocation { name }
                externalLink
              }
            }
          }`,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const postings = data?.data?.jobBoard?.jobPostings;

    // Retry once if Ashby returned null (rate-limit graceful response)
    if (!Array.isArray(postings)) {
      if (attempt < 2) {
        await sleep(2000); // wait 2s before retry
        return fetchAshby(slug, attempt + 1);
      }
      return null;
    }

    return postings.map(j => ({
      external_id: j.id,
      title: j.title,
      department: j.departmentName || null,
      location: j.jobLocation?.name || null,
      remote: j.isRemote || false,
      job_url: j.externalLink || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      ats_source: 'ashby',
    }));
  } catch { return null; }
}

async function fetchJobs(company) {
  if (company.greenhouse) return await fetchGreenhouse(company.greenhouse);
  if (company.lever)      return await fetchLever(company.lever);
  if (company.workable)   return await fetchWorkable(company.workable);
  if (company.ashby)      return await fetchAshby(company.ashby);
  return null;
}

// ─────────────────────────────────────────────────────────
// Upsert PM roles into job_postings
// ─────────────────────────────────────────────────────────
async function upsertJobs(company, allJobs, companyId) {
  const pmJobs = allJobs.filter(j => isPMRole(j.title));
  const now = new Date().toISOString();

  // Mark all currently active jobs for this company as inactive
  await supabase
    .from('job_postings')
    .update({ is_active: false })
    .eq('company_name', company.name)
    .eq('is_active', true);

  // Upsert jobs that are still live
  if (pmJobs.length) {
    const rows = pmJobs.map(j => ({
      company_id:   companyId || null,
      company_name: company.name,
      title:        j.title,
      department:   j.department || null,
      location:     j.location || null,
      remote:       j.remote || false,
      job_url:      j.job_url || null,
      ats_source:   j.ats_source,
      external_id:  j.external_id,
      is_active:    true,
      last_seen_at: now,
    }));

    const { error } = await supabase
      .from('job_postings')
      .upsert(rows, { onConflict: 'company_name,external_id,ats_source' });

    if (error) console.error(`  ⚠  job_postings upsert (${company.name}):`, error.message);
  }

  // Update open_roles count and ATS slug columns
  const slugUpdate = {
    open_roles:       pmJobs.length,
    roles_updated_at: now,
    greenhouse_slug:  company.greenhouse || null,
    lever_slug:       company.lever      || null,
    ashby_slug:       company.ashby      || null,
    workable_slug:    company.workable   || null,
  };

  const updateQ = supabase.from('ai_companies').update(slugUpdate);
  if (companyId) await updateQ.eq('id', companyId);
  else await updateQ.ilike('company_name', company.name);

  return { total: allJobs.length, pm: pmJobs.length };
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Daily PM jobs check — ${new Date().toISOString()}\n`);

  // ── Build company list: DB is source of truth, KNOWN_COMPANIES fills gaps ─
  //
  // DB query now reads all 4 ATS slug columns.
  // Only companies with at least one slug are included.
  const { data: dbRows, error: dbErr } = await supabase
    .from('ai_companies')
    .select('id, company_name, greenhouse_slug, lever_slug, ashby_slug, workable_slug')
    .eq('is_hiring', true);

  if (dbErr) {
    // ashby_slug / workable_slug may not exist yet — fall back to KNOWN_COMPANIES only
    if (dbErr.message?.includes('does not exist')) {
      console.warn('⚠  ashby_slug / workable_slug columns not found in DB.');
      console.warn('   Run: node scripts/migrate-ats-slugs.mjs\n');
    } else {
      console.error('DB error:', dbErr.message);
    }
  }

  const dbMap = new Map((dbRows || []).map(r => [r.company_name.toLowerCase(), r]));

  // Seed with KNOWN_COMPANIES so any new hardcoded entry gets checked even before
  // it's been written to the DB (first run). DB values take priority for slugs.
  const map = new Map();

  // Start with KNOWN_COMPANIES as baseline
  for (const c of KNOWN_COMPANIES) {
    map.set(c.name.toLowerCase(), { ...c, db_id: null });
  }

  // Overlay with DB rows — DB wins for slug values; adds any DB-only companies
  for (const [key, row] of dbMap) {
    const existing = map.get(key) || {};
    const merged = {
      name:       row.company_name,
      // DB columns take precedence over hardcoded; fall back to existing if DB null
      greenhouse: row.greenhouse_slug || existing.greenhouse || null,
      lever:      row.lever_slug      || existing.lever      || null,
      ashby:      row.ashby_slug      || existing.ashby      || null,
      workable:   row.workable_slug   || existing.workable   || null,
      db_id:      row.id,
    };
    map.set(key, merged);
  }

  // Only check companies that have at least one valid ATS slug
  const toCheck = [...map.values()].filter(c => c.greenhouse || c.lever || c.workable || c.ashby);

  const atsLabel = 'Greenhouse / Lever / Workable / Ashby';
  console.log(`Checking ${toCheck.length} companies (${atsLabel})\n`);
  console.log(`${'Company'.padEnd(30)} ${'All'.padStart(5)} ${'PM'.padStart(5)}  ATS`);
  console.log('─'.repeat(60));

  let totalUpdated = 0, totalPM = 0, notFound = 0;
  const tally = {};

  for (const company of toCheck) {
    const dbRow = dbMap.get(company.name.toLowerCase());
    const jobs = await fetchJobs(company);
    const atsSlug = company.greenhouse || company.lever || company.workable || company.ashby;

    if (jobs === null) {
      console.log(`${company.name.padEnd(30)}     —         not found on ATS [${atsSlug}]`);
      notFound++;
      await sleep(400); // slightly longer to avoid cascading failures
      continue;
    }

    const ats = jobs[0]?.ats_source || '?';
    const result = await upsertJobs(company, jobs, dbRow?.id || null);
    tally[ats] = (tally[ats] || 0) + 1;

    // Upsert company into DB if it's new (discovered via KNOWN_COMPANIES but not yet in DB)
    if (!dbRow?.id && result.total > 0) {
      await supabase.from('ai_companies').upsert({
        company_name:    company.name,
        source:          'ATS discovery',
        announcement_date: new Date().toISOString().split('T')[0],
        open_roles:      result.pm,
        roles_updated_at: new Date().toISOString(),
        greenhouse_slug: company.greenhouse || null,
        lever_slug:      company.lever      || null,
        ashby_slug:      company.ashby      || null,
        workable_slug:   company.workable   || null,
        is_hiring:       true,
        founder_names:   [],
        tech_stack:      [],
        investors:       [],
      }, { onConflict: 'company_name,announcement_date' });
    }

    const mark = result.pm > 0 ? '●' : '○';
    console.log(`${company.name.padEnd(30)} ${String(result.total).padStart(5)} ${String(result.pm).padStart(4)} ${mark}  ${ats}`);
    totalUpdated++;
    totalPM += result.pm;
    await sleep(400); // 400ms between calls; Ashby gets 2s retry on top of this
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ ${totalUpdated} checked  |  ${totalPM} PM roles active  |  ${notFound} not on ATS`);
  if (notFound > 0) {
    console.log(`\n⚠  ${notFound} companies returned null — may be rate-limited, acquired, or slug changed.`);
    console.log('   Re-run in a few minutes if transient; otherwise update slug in DB.');
  }
  console.log(`\nBreakdown: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  await supabase.from('sync_log').insert({
    source:  'github-actions-daily-jobs',
    updated: totalUpdated,
    errors:  notFound,
    notes:   `${totalPM} PM roles across ${totalUpdated} companies. ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' ')} NotFound=${notFound}`,
  });
}

main().catch(e => { console.error(e); process.exit(1); });
