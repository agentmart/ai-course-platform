#!/usr/bin/env node
/**
 * scripts/daily-jobs-check.mjs
 *
 * Fetches actual PM/product job listings from 4 ATS platforms.
 * Stores individual roles in job_postings table (not just counts).
 * Marks roles that disappeared as is_active = false.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// PM role title keywords — matches anywhere in the title (case-insensitive)
const PM_KEYWORDS = [
  'product manager', 'product lead', 'head of product', 'vp product', 'vp of product',
  'director of product', 'chief product', 'technical pm', 'ai pm', 'product operations',
  'program manager', 'product marketing', 'group product manager', 'senior pm', 'staff pm',
  'principal pm', 'product strategy', 'growth pm', 'associate pm', 'product owner',
  'technical product', 'product analyst', 'product designer', 'product engineer',
];

function isPMRole(title) {
  const t = (title || '').toLowerCase();
  return PM_KEYWORDS.some(k => t.includes(k));
}

// ── Known company → ATS slugs ─────────────────────────────
const KNOWN_COMPANIES = [
  // Frontier Labs
  { name: 'Anthropic',         greenhouse: 'anthropic' },
  { name: 'OpenAI',            greenhouse: 'openai' },
  { name: 'Mistral AI',        lever: 'mistral' },
  { name: 'Cohere',            greenhouse: 'cohere' },
  { name: 'Together AI',       greenhouse: 'togetherai' },
  { name: 'Scale AI',          greenhouse: 'scaleai' },
  { name: 'Hugging Face',      greenhouse: 'huggingface' },
  { name: 'Character AI',      greenhouse: 'characterai' },
  // AI Dev Tools
  { name: 'Weights & Biases',  greenhouse: 'wandb' },
  { name: 'Replicate',         lever: 'replicate' },
  { name: 'LangChain',         lever: 'langchain' },
  { name: 'Perplexity',        lever: 'perplexityai' },
  { name: 'Runway',            greenhouse: 'runway' },
  { name: 'ElevenLabs',        workable: 'elevenlabs' },
  // Ashby-hosted AI companies
  { name: 'Cognition',         ashby: 'cognition' },
  { name: 'Luma AI',           ashby: 'lumaai' },
  { name: 'Sierra AI',         ashby: 'sierra' },
  { name: 'Contextual AI',     ashby: 'contextualai' },
  { name: 'Cursor',            ashby: 'cursor' },
  { name: 'Glean',             ashby: 'glean' },
  { name: 'Harvey AI',         ashby: 'harvey' },
  { name: 'Imbue',             ashby: 'imbue' },
  { name: 'Magic AI',          ashby: 'magic' },
  { name: 'Norm AI',           ashby: 'normai' },
  // YC companies
  { name: 'Hex Security',      lever: 'hexsecurity' },
  { name: 'Code Metal',        greenhouse: 'codemetal' },
  { name: 'Beacon Health',     lever: 'beacon-health' },
];

// ── ATS Fetchers — return normalised job arrays ───────────

async function fetchGreenhouse(slug) {
  try {
    const r = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!r.ok) return null;
    const { jobs } = await r.json();
    if (!Array.isArray(jobs)) return null;
    return jobs.map(j => ({
      external_id: String(j.id),
      title:       j.title,
      department:  j.departments?.[0]?.name || null,
      location:    j.location?.name || null,
      remote:      (j.location?.name || '').toLowerCase().includes('remote'),
      job_url:     j.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${j.id}`,
      ats_source:  'greenhouse',
    }));
  } catch { return null; }
}

async function fetchLever(slug) {
  try {
    const r = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { signal: AbortSignal.timeout(7000) }
    );
    if (!r.ok) return null;
    const jobs = await r.json();
    if (!Array.isArray(jobs)) return null;
    return jobs.map(j => ({
      external_id: j.id,
      title:       j.text,
      department:  j.categories?.team || j.categories?.department || null,
      location:    j.categories?.location || null,
      remote:      j.categories?.commitment?.toLowerCase().includes('remote') || false,
      job_url:     j.hostedUrl || j.applyUrl || `https://jobs.lever.co/${slug}/${j.id}`,
      ats_source:  'lever',
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
        body: JSON.stringify({ query: '', location: [], remote: false }),
        signal: AbortSignal.timeout(7000),
      }
    );
    if (!r.ok) return null;
    const { results } = await r.json();
    if (!Array.isArray(results)) return null;
    return results.map(j => ({
      external_id: j.shortcode || j.id,
      title:       j.title,
      department:  j.department || null,
      location:    j.location ? `${j.location.city || ''} ${j.location.country || ''}`.trim() : null,
      remote:      j.remote || false,
      job_url:     `https://apply.workable.com/${slug}/j/${j.shortcode || j.id}/`,
      ats_source:  'workable',
    }));
  } catch { return null; }
}

async function fetchAshby(slug) {
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
                id title isRemote
                departmentName
                jobLocation { name }
                externalLink
              }
            }
          }`,
        }),
        signal: AbortSignal.timeout(7000),
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const postings = data?.data?.jobBoard?.jobPostings;
    if (!Array.isArray(postings)) return null;
    return postings.map(j => ({
      external_id: j.id,
      title:       j.title,
      department:  j.departmentName || null,
      location:    j.jobLocation?.name || null,
      remote:      j.isRemote || false,
      job_url:     j.externalLink || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      ats_source:  'ashby',
    }));
  } catch { return null; }
}

async function fetchJobs(company) {
  if (company.greenhouse) { const r = await fetchGreenhouse(company.greenhouse); if (r) return r; }
  if (company.lever)      { const r = await fetchLever(company.lever);           if (r) return r; }
  if (company.workable)   { const r = await fetchWorkable(company.workable);     if (r) return r; }
  if (company.ashby)      { const r = await fetchAshby(company.ashby);           if (r) return r; }
  return null;
}

// ── Upsert job_postings for a company ────────────────────
async function upsertJobs(company, allJobs, companyId) {
  const pmJobs = allJobs.filter(j => isPMRole(j.title));
  const now    = new Date().toISOString();

  // Mark ALL previously active jobs for this company as inactive first
  // (we'll re-activate the ones we still see)
  await supabase
    .from('job_postings')
    .update({ is_active: false })
    .eq('company_name', company.name)
    .eq('is_active', true);

  if (!pmJobs.length) return { total: allJobs.length, pm: 0 };

  // Upsert current PM jobs (re-marks as active via last_seen_at)
  const rows = pmJobs.map(j => ({
    company_id:   companyId || null,
    company_name: company.name,
    title:        j.title,
    department:   j.department || null,
    location:     j.location   || null,
    remote:       j.remote     || false,
    job_url:      j.job_url    || null,
    ats_source:   j.ats_source,
    external_id:  j.external_id,
    is_active:    true,
    last_seen_at: now,
  }));

  const { error } = await supabase
    .from('job_postings')
    .upsert(rows, { onConflict: 'company_name,external_id,ats_source' });

  if (error) console.error(`  job_postings upsert error (${company.name}):`, error.message);

  // Update open_roles count on ai_companies
  if (companyId) {
    await supabase
      .from('ai_companies')
      .update({ open_roles: pmJobs.length, roles_updated_at: now })
      .eq('id', companyId);
  } else {
    await supabase
      .from('ai_companies')
      .update({ open_roles: pmJobs.length, roles_updated_at: now })
      .ilike('company_name', company.name);
  }

  return { total: allJobs.length, pm: pmJobs.length };
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Daily PM jobs check — ${new Date().toISOString()}\n`);

  // Load DB companies so we can look up their IDs
  const { data: dbRows } = await supabase
    .from('ai_companies')
    .select('id, company_name, greenhouse_slug, lever_slug')
    .eq('is_hiring', true);

  const dbMap = new Map((dbRows || []).map(r => [r.company_name.toLowerCase(), r]));

  // Merge KNOWN_COMPANIES with DB rows
  const map = new Map();
  for (const c of KNOWN_COMPANIES) map.set(c.name.toLowerCase(), { ...c, db_id: null });
  for (const [key, row] of dbMap) {
    const existing = map.get(key) || {};
    map.set(key, {
      name:       row.company_name,
      greenhouse: row.greenhouse_slug || existing.greenhouse || null,
      lever:      row.lever_slug      || existing.lever      || null,
      workable:   existing.workable   || null,
      ashby:      existing.ashby      || null,
      db_id:      row.id,
    });
  }

  const toCheck = [...map.values()].filter(c => c.greenhouse || c.lever || c.workable || c.ashby);
  console.log(`Checking ${toCheck.length} companies for PM roles\n`);
  console.log(`${'Company'.padEnd(28)} ${'All'.padStart(5)} ${'PM'.padStart(5)}  ATS`);
  console.log('─'.repeat(55));

  let totalUpdated = 0, totalPMJobs = 0, notFound = 0;

  for (const company of toCheck) {
    const dbRow = dbMap.get(company.name.toLowerCase());
    const jobs  = await fetchJobs(company);

    if (jobs === null) {
      console.log(`${company.name.padEnd(28)}     —         not found`);
      notFound++;
      await sleep(200);
      continue;
    }

    const ats    = jobs[0]?.ats_source || '?';
    const result = await upsertJobs(company, jobs, dbRow?.id || null);

    const pmMark = result.pm > 0 ? '●' : '○';
    console.log(`${company.name.padEnd(28)} ${String(result.total).padStart(5)} ${String(result.pm).padStart(4)} ${pmMark}  ${ats}`);

    totalUpdated++;
    totalPMJobs += result.pm;
    await sleep(250);
  }

  console.log('\n' + '─'.repeat(55));
  console.log(`✅ ${totalUpdated} companies checked  |  ${totalPMJobs} PM roles active  |  ${notFound} not on ATS`);

  await supabase.from('sync_log').insert({
    source:  'github-actions-daily-jobs',
    updated: totalUpdated,
    errors:  notFound,
    notes:   `${totalPMJobs} PM roles across ${totalUpdated} companies. ${notFound} not found on ATS.`,
  });
}

main().catch(e => { console.error(e); process.exit(1); });
