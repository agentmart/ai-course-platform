#!/usr/bin/env node
/**
 * scripts/daily-jobs-check.mjs
 *
 * Daily PM job checker — verified ATS slugs (March 2026).
 *
 * Key corrections (March 2026 audit):
 *   OpenAI        → Ashby (slug: openai) ✅
 *   Cohere        → Ashby (slug: cohere) ✅
 *   Perplexity    → Ashby (slug: perplexity) ✅
 *   LangChain     → Ashby (slug: langchain) ✅
 *   ElevenLabs    → Ashby (slug: elevenlabs) ✅
 *   Contextual AI → moved from Ashby → Greenhouse (slug: contextualai) ✅
 *   Imbue         → moved from Ashby → Greenhouse (slug: imbue) ✅
 *   Runway        → Greenhouse slug: runwayml ✅
 *   Glean         → Greenhouse slug: gleanwork ✅
 *   Hugging Face  → Workable body fix (remote must be []) ✅
 *
 * Removed (acquired / board gone):
 *   Replicate     → acquired by Cloudflare (Nov 2025), no ATS board
 *   Weights&Biases→ acquired by CoreWeave; jobs now under CoreWeave
 *   Character AI  → Ashby board returns null (hiring paused?)
 *   Luma AI       → No active Ashby/GH board found
 *   Inflection AI → Greenhouse 404, Ashby null
 *   Norm AI       → Ashby null board
 *   Magic AI      → Ashby null board
 *   Hex Security  → Lever 404
 *   Beacon Health → Lever 404
 *   Code Metal    → Greenhouse 404
 *
 * New companies added (March 2026):
 *   CoreWeave     → Greenhouse (slug: coreweave)  — 281 jobs, 19 PM
 *   Descript      → Greenhouse (slug: descript)    — 18 jobs, 4 PM
 *   Airtable      → Greenhouse (slug: airtable)    — 53 jobs, 4 PM
 *   Replit        → Ashby (slug: replit)           — 85 jobs, 3 PM
 *   Ideogram      → Ashby (slug: ideogram)         — 11 jobs, 1 PM
 *   Linear        → Ashby (slug: linear)           — 21 jobs, 2 PM
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

// ─────────────────────────────────────────────────────────
// Verified ATS slugs — sourced from live careers pages
// Format: { name, greenhouse?, lever?, workable?, ashby? }
// Only one ATS field per company (the one that actually works).
// ─────────────────────────────────────────────────────────
const KNOWN_COMPANIES = [

  // ── Frontier Labs ─────────────────────────────────────────
  { name: 'Anthropic',    greenhouse: 'anthropic' },      // ✅ 28 PM roles
  { name: 'OpenAI',       ashby: 'openai' },              // ✅ 32 PM roles
  { name: 'Mistral AI',   lever: 'mistral' },             // ✅ 6 PM roles
  { name: 'Cohere',       ashby: 'cohere' },              // ✅ 9 PM roles
  { name: 'xAI',          greenhouse: 'xai' },            // ✅

  // ── AI Infrastructure & Cloud ─────────────────────────────
  { name: 'Scale AI',     greenhouse: 'scaleai' },        // ✅ 20 PM roles
  { name: 'Together AI',  greenhouse: 'togetherai' },     // ✅ 4 PM roles
  { name: 'Hugging Face', workable: 'huggingface' },      // ✅ Workable
  { name: 'CoreWeave',    greenhouse: 'coreweave' },      // ✅ 19 PM roles (W&B now here)

  // ── Creative & Generative AI ──────────────────────────────
  { name: 'Runway',       greenhouse: 'runwayml' },       // ✅ slug is runwayml
  { name: 'ElevenLabs',   ashby: 'elevenlabs' },          // ✅
  { name: 'Ideogram',     ashby: 'ideogram' },            // ✅ 1 PM role

  // ── Developer AI Platforms ────────────────────────────────
  { name: 'LangChain',    ashby: 'langchain' },           // ✅
  { name: 'Perplexity',   ashby: 'perplexity' },          // ✅ slug: perplexity (not perplexityai)
  { name: 'Glean',        greenhouse: 'gleanwork' },      // ✅ slug: gleanwork
  { name: 'Cursor',       ashby: 'cursor' },              // ✅
  { name: 'Cognition',    ashby: 'cognition' },           // ✅
  { name: 'Sierra AI',    ashby: 'sierra' },              // ✅
  { name: 'Harvey AI',    ashby: 'harvey' },              // ✅
  { name: 'Contextual AI',greenhouse: 'contextualai' },   // ✅ moved from Ashby → Greenhouse
  { name: 'Imbue',        greenhouse: 'imbue' },          // ✅ moved from Ashby → Greenhouse
  { name: 'Replit',       ashby: 'replit' },              // ✅ 3 PM roles
  { name: 'Linear',       ashby: 'linear' },              // ✅ 2 PM roles

  // ── AI-Native Productivity ────────────────────────────────
  { name: 'Descript',     greenhouse: 'descript' },       // ✅ 4 PM roles
  { name: 'Airtable',     greenhouse: 'airtable' },       // ✅ 4 PM roles

  // ── Robotics & Embodied AI ────────────────────────────────
  { name: 'Neuralink',    greenhouse: 'neuralink' },      // ✅
];

// ─────────────────────────────────────────────────────────
// ATS Fetchers — each returns array of job objects or null
// ─────────────────────────────────────────────────────────

async function fetchGreenhouse(slug) {
  try {
    const r = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
      { signal: AbortSignal.timeout(8000) }
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
      { signal: AbortSignal.timeout(8000) }
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
        body: JSON.stringify({ query: '', location: [], remote: [] }),  // remote must be array
        signal: AbortSignal.timeout(8000),
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
                id title isRemote departmentName
                jobLocation { name }
                externalLink
              }
            }
          }`,
        }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const postings = data?.data?.jobBoard?.jobPostings;
    if (!Array.isArray(postings)) return null;
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

  // Update open_roles count
  const updateQ = supabase.from('ai_companies').update({
    open_roles: pmJobs.length,
    roles_updated_at: now,
  });
  if (companyId) await updateQ.eq('id', companyId);
  else await updateQ.ilike('company_name', company.name);

  return { total: allJobs.length, pm: pmJobs.length };
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Daily PM jobs check — ${new Date().toISOString()}\n`);

  // Load DB companies for ID lookups and any extra slugs stored there
  const { data: dbRows } = await supabase
    .from('ai_companies')
    .select('id, company_name, greenhouse_slug, lever_slug')
    .eq('is_hiring', true);

  const dbMap = new Map((dbRows || []).map(r => [r.company_name.toLowerCase(), r]));

  // Merge KNOWN_COMPANIES (takes priority) with DB rows
  const map = new Map();
  for (const c of KNOWN_COMPANIES) map.set(c.name.toLowerCase(), { ...c, db_id: null });
  for (const [key, row] of dbMap) {
    const existing = map.get(key) || {};
    map.set(key, {
      name: row.company_name,
      greenhouse: existing.greenhouse || row.greenhouse_slug || null,
      lever: existing.lever || row.lever_slug || null,
      workable: existing.workable || null,
      ashby: existing.ashby || null,
      db_id: row.id,
    });
  }

  const toCheck = [...map.values()].filter(c => c.greenhouse || c.lever || c.workable || c.ashby);
  console.log(`Checking ${toCheck.length} companies (Greenhouse / Lever / Workable / Ashby)\n`);
  console.log(`${'Company'.padEnd(30)} ${'All'.padStart(5)} ${'PM'.padStart(5)}  ATS`);
  console.log('─'.repeat(58));

  let totalUpdated = 0, totalPM = 0, notFound = 0;
  const tally = {};

  for (const company of toCheck) {
    const dbRow = dbMap.get(company.name.toLowerCase());
    const jobs = await fetchJobs(company);

    if (jobs === null) {
      console.log(`${company.name.padEnd(30)}     —         not found on ATS`);
      notFound++;
      await sleep(250);
      continue;
    }

    const ats = jobs[0]?.ats_source || '?';
    const result = await upsertJobs(company, jobs, dbRow?.id || null);
    tally[ats] = (tally[ats] || 0) + 1;

    // If company not in DB, upsert it
    if (!dbRow?.id && result.total > 0) {
      await supabase.from('ai_companies').upsert({
        company_name: company.name,
        source: 'ATS discovery',
        announcement_date: new Date().toISOString().split('T')[0],
        open_roles: result.pm,
        roles_updated_at: new Date().toISOString(),
        greenhouse_slug: company.greenhouse || null,
        lever_slug: company.lever || null,
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
    await sleep(250);
  }

  console.log('\n' + '─'.repeat(58));
  console.log(`✅ ${totalUpdated} checked  |  ${totalPM} PM roles active  |  ${notFound} not on ATS`);
  console.log(`\nBreakdown: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  await supabase.from('sync_log').insert({
    source: 'github-actions-daily-jobs',
    updated: totalUpdated,
    errors: notFound,
    notes: `${totalPM} PM roles across ${totalUpdated} companies. ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(' ')} NotFound=${notFound}`,
  });
}

main().catch(e => { console.error(e); process.exit(1); });
