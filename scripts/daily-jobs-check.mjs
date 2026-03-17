#!/usr/bin/env node
/**
 * scripts/daily-jobs-check.mjs
 *
 * Daily PM job checker — DB-driven, all 4 ATS providers.
 *
 * Key fixes (March 2026):
 *  - Ashby now requires browser-like headers (User-Agent, Origin, Referer)
 *    without these, jobBoard returns null → false "not found" for all Ashby companies
 *  - Exponential backoff for Ashby: 3 retries (2s, 4s, 8s)
 *  - Separate sleep timing: 1500ms between Ashby calls, 400ms for others
 *  - fetchAshby returns { jobs, rateLimited } so the caller can log accurately
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
// DB is the source of truth after first run.
// ─────────────────────────────────────────────────────────────────────────────
const KNOWN_COMPANIES = [
  // Frontier Labs
  { name: 'Anthropic', greenhouse: 'anthropic' },
  { name: 'OpenAI', ashby: 'openai' },
  { name: 'Mistral AI', lever: 'mistral' },
  { name: 'Cohere', ashby: 'cohere' },
  { name: 'xAI', greenhouse: 'xai' },
  // AI Infrastructure & Cloud
  { name: 'Scale AI', greenhouse: 'scaleai' },
  { name: 'Together AI', greenhouse: 'togetherai' },
  { name: 'Hugging Face', workable: 'huggingface' },
  { name: 'CoreWeave', greenhouse: 'coreweave' },
  // Creative & Generative AI
  { name: 'Runway', greenhouse: 'runwayml' },
  { name: 'ElevenLabs', ashby: 'elevenlabs' },
  { name: 'Ideogram', ashby: 'ideogram' },
  // Developer AI Platforms
  { name: 'LangChain', ashby: 'langchain' },
  { name: 'Perplexity', ashby: 'perplexity' },
  { name: 'Glean', greenhouse: 'gleanwork' },
  { name: 'Cursor', ashby: 'cursor' },
  { name: 'Cognition', ashby: 'cognition' },
  { name: 'Sierra AI', ashby: 'sierra' },
  { name: 'Harvey AI', ashby: 'harvey' },
  { name: 'Contextual AI', greenhouse: 'contextualai' },
  { name: 'Imbue', greenhouse: 'imbue' },
  { name: 'Replit', ashby: 'replit' },
  { name: 'Linear', ashby: 'linear' },
  // AI-Native Productivity
  { name: 'Descript', greenhouse: 'descript' },
  { name: 'Airtable', greenhouse: 'airtable' },
  // Robotics & Embodied AI
  { name: 'Neuralink', greenhouse: 'neuralink' },
  // Additional high-value AI companies
  { name: 'Weights & Biases', greenhouse: 'wandb' },
  { name: 'Modal', ashby: 'modal' },
  { name: 'Midjourney', greenhouse: 'midjourney' },
  { name: 'Stability AI', greenhouse: 'stabilityai' },
];

// ─────────────────────────────────────────────────────────
// ATS Fetchers
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
        body: JSON.stringify({ query: '', location: [], remote: [] }),
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
 * Ashby requires browser-like headers — without them, Cloudflare returns
 * a null jobBoard even for valid slugs. Uses exponential backoff: 3 retries.
 */
async function fetchAshby(slug, attempt = 1) {
  try {
    const r = await fetch(
      'https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://jobs.ashbyhq.com',
          'Referer': `https://jobs.ashbyhq.com/${slug}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
        },
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
        signal: AbortSignal.timeout(12000),
      }
    );

    if (!r.ok) {
      // 429 = rate limited, retry with longer backoff
      if (r.status === 429 && attempt <= 3) {
        const backoff = attempt * 3000;
        console.log(`    Ashby 429 for ${slug} — retry ${attempt} in ${backoff / 1000}s`);
        await sleep(backoff);
        return fetchAshby(slug, attempt + 1);
      }
      return null;
    }

    const data = await r.json();
    const postings = data?.data?.jobBoard?.jobPostings;

    // null jobBoard = slug doesn't exist OR Cloudflare blocked us despite headers
    if (!Array.isArray(postings)) {
      if (attempt <= 3) {
        const backoff = attempt * 2000; // 2s, 4s, 6s
        await sleep(backoff);
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
  } catch (e) {
    if (attempt <= 3) {
      const backoff = attempt * 2000;
      await sleep(backoff);
      return fetchAshby(slug, attempt + 1);
    }
    return null;
  }
}

async function fetchJobs(company) {
  if (company.greenhouse) return await fetchGreenhouse(company.greenhouse);
  if (company.lever) return await fetchLever(company.lever);
  if (company.workable) return await fetchWorkable(company.workable);
  if (company.ashby) return await fetchAshby(company.ashby);
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
      company_id: companyId || null,
      company_name: company.name,
      title: j.title,
      department: j.department || null,
      location: j.location || null,
      remote: j.remote || false,
      job_url: j.job_url || null,
      ats_source: j.ats_source,
      external_id: j.external_id,
      is_active: true,
      last_seen_at: now,
    }));

    const { error } = await supabase
      .from('job_postings')
      .upsert(rows, { onConflict: 'company_name,external_id,ats_source' });

    if (error) console.error(`  ⚠  job_postings upsert (${company.name}):`, error.message);
  }

  // Update open_roles count and ATS slug columns
  const slugUpdate = {
    open_roles: pmJobs.length,
    roles_updated_at: now,
    greenhouse_slug: company.greenhouse || null,
    lever_slug: company.lever || null,
    ashby_slug: company.ashby || null,
    workable_slug: company.workable || null,
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

  const { data: dbRows, error: dbErr } = await supabase
    .from('ai_companies')
    .select('id, company_name, greenhouse_slug, lever_slug, ashby_slug, workable_slug')
    .eq('is_hiring', true);

  if (dbErr) {
    console.error('DB error:', dbErr.message);
  }

  const dbMap = new Map((dbRows || []).map(r => [r.company_name.toLowerCase(), r]));

  const map = new Map();
  for (const c of KNOWN_COMPANIES) {
    map.set(c.name.toLowerCase(), { ...c, db_id: null });
  }
  for (const [key, row] of dbMap) {
    const existing = map.get(key) || {};
    map.set(key, {
      name: row.company_name,
      greenhouse: row.greenhouse_slug || existing.greenhouse || null,
      lever: row.lever_slug || existing.lever || null,
      ashby: row.ashby_slug || existing.ashby || null,
      workable: row.workable_slug || existing.workable || null,
      db_id: row.id,
    });
  }

  const toCheck = [...map.values()].filter(c => c.greenhouse || c.lever || c.workable || c.ashby);

  console.log(`Checking ${toCheck.length} companies (Greenhouse / Lever / Workable / Ashby)\n`);
  console.log(`${'Company'.padEnd(30)} ${'All'.padStart(5)} ${'PM'.padStart(5)}  ATS`);
  console.log('─'.repeat(60));

  let totalUpdated = 0, totalPM = 0, notFound = 0;
  const tally = {};

  for (const company of toCheck) {
    const dbRow = dbMap.get(company.name.toLowerCase());
    const jobs = await fetchJobs(company);
    const atsSlug = company.ashby || company.greenhouse || company.lever || company.workable;

    if (jobs === null) {
      console.log(`${company.name.padEnd(30)}     —         not found on ATS [${atsSlug}]`);
      notFound++;
      // Longer pause after a failed Ashby call to avoid cascading rate limits
      await sleep(company.ashby ? 2000 : 600);
      continue;
    }

    const ats = jobs[0]?.ats_source || (
      company.ashby ? 'ashby' :
        company.greenhouse ? 'greenhouse' :
          company.lever ? 'lever' : 'workable'
    );
    const result = await upsertJobs(company, jobs, dbRow?.id || null);
    tally[ats] = (tally[ats] || 0) + 1;

    // Auto-insert new companies discovered via KNOWN_COMPANIES but not yet in DB
    if (!dbRow?.id && result.total > 0) {
      await supabase.from('ai_companies').upsert({
        company_name: company.name,
        source: 'ATS discovery',
        announcement_date: new Date().toISOString().split('T')[0],
        open_roles: result.pm,
        roles_updated_at: new Date().toISOString(),
        greenhouse_slug: company.greenhouse || null,
        lever_slug: company.lever || null,
        ashby_slug: company.ashby || null,
        workable_slug: company.workable || null,
        is_hiring: true,
        founder_names: [],
        tech_stack: [],
        investors: [],
      }, { onConflict: 'company_name,announcement_date' });
    }

    const mark = result.pm > 0 ? '●' : '○';
    console.log(`${company.name.padEnd(30)} ${String(result.total).padStart(5)} ${String(result.pm).padStart(4)} ${mark}  ${ats}`);
    totalUpdated++;
    totalPM += result.pm;

    // Ashby needs more breathing room between calls
    await sleep(company.ashby ? 1500 : 400);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ ${totalUpdated} checked  |  ${totalPM} PM roles active  |  ${notFound} not on ATS`);
  if (notFound > 0) {
    console.log(`\n⚠  ${notFound} companies returned null.`);
    console.log('   Likely causes: Ashby rate limit (re-run in 5 min), slug changed, or company acquired.');
  }
  console.log(`\nBreakdown: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  await supabase.from('sync_log').insert({
    source: 'github-actions-daily-jobs',
    updated: totalUpdated,
    errors: notFound,
    notes: `${totalPM} PM roles. ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' ')} NotFound=${notFound}`,
  });
}

main().catch(e => { console.error(e); process.exit(1); });
