#!/usr/bin/env node
/**
 * scripts/daily-jobs-check.mjs
 *
 * Daily PM job checker — DB-driven, all 4 ATS providers.
 *
 * Architecture:
 *   - Greenhouse / Lever / Workable: direct fetch() — no bot detection
 *   - Ashby: ALL slugs batched into ONE Playwright subprocess call
 *     (fetch-ashby-playwright.mjs) which launches real Chromium,
 *     bypasses Cloudflare, returns results as JSON. Single browser
 *     launch for all Ashby companies = fast + no per-call overhead.
 */

import { createClient } from '@supabase/supabase-js';
import { execFile }      from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabase   = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sleep      = ms => new Promise(r => setTimeout(r, ms));

// PM role keywords
const PM_KEYWORDS = [
  'product manager', 'product lead', 'head of product', 'vp of product', 'vp product',
  'director of product', 'chief product', 'technical pm', 'ai pm', 'product operations',
  'program manager', 'product marketing', 'group product manager', 'senior pm', 'staff pm',
  'principal pm', 'product strategy', 'growth pm', 'associate pm', 'product owner',
  'technical product', 'product analyst', 'product designer', 'product engineer',
];
const isPMRole = title => PM_KEYWORDS.some(k => (title || '').toLowerCase().includes(k));

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN_COMPANIES — verified ATS slugs only. No auto-slugify() entries.
// DB is the source of truth after first run; this list seeds new companies.
// ─────────────────────────────────────────────────────────────────────────────
const KNOWN_COMPANIES = [
  // Frontier Labs
  { name: 'Anthropic',         greenhouse: 'anthropic' },
  { name: 'OpenAI',            ashby:      'openai' },
  { name: 'Mistral AI',        lever:      'mistral' },
  { name: 'Cohere',            ashby:      'cohere' },
  { name: 'xAI',               greenhouse: 'xai' },
  // AI Infrastructure
  { name: 'Scale AI',          greenhouse: 'scaleai' },
  { name: 'Together AI',       greenhouse: 'togetherai' },
  { name: 'Hugging Face',      workable:   'huggingface' },
  { name: 'CoreWeave',         greenhouse: 'coreweave' },
  // Creative & Generative AI
  { name: 'Runway',            greenhouse: 'runwayml' },
  { name: 'ElevenLabs',        ashby:      'elevenlabs' },
  { name: 'Ideogram',          ashby:      'ideogram' },
  // Developer AI Platforms
  { name: 'Perplexity',        ashby:      'perplexity' },
  { name: 'Glean',             greenhouse: 'gleanwork' },
  { name: 'Cursor',            ashby:      'cursor' },
  { name: 'Cognition',         ashby:      'cognition' },
  { name: 'LangChain',         ashby:      'langchain' },
  { name: 'Sierra AI',         ashby:      'sierra' },
  { name: 'Harvey AI',         ashby:      'harvey' },
  { name: 'Contextual AI',     greenhouse: 'contextualai' },
  { name: 'Imbue',             greenhouse: 'imbue' },
  { name: 'Replit',            ashby:      'replit' },
  { name: 'Linear',            ashby:      'linear' },
  // AI-Native Productivity
  { name: 'Descript',          greenhouse: 'descript' },
  { name: 'Airtable',          greenhouse: 'airtable' },
  // Other high-signal AI companies
  { name: 'Neuralink',         greenhouse: 'neuralink' },
  { name: 'Weights & Biases',  lever:      'wandb' },
  { name: 'Modal',             ashby:      'modal' },
  { name: 'Stability AI',      greenhouse: 'stabilityai' },
  { name: 'Midjourney',        greenhouse: 'midjourney' },
  { name: 'Covariant',         greenhouse: 'covariant' },
  { name: 'Adept AI',          greenhouse: 'adeptai' },
  { name: 'Inflection AI',     ashby:      'inflection' },
  { name: 'Character AI',      greenhouse: 'characterai' },
];

// ─────────────────────────────────────────────────────────
// Non-Ashby ATS fetchers (direct API, no bot detection)
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
      { signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return null;
    const jobs = await r.json();
    if (!Array.isArray(jobs)) return null;
    return jobs.map(j => ({
      external_id: j.id,
      title:       j.text,
      department:  j.categories?.team || j.categories?.department || null,
      location:    j.categories?.location || null,
      remote:      (j.categories?.commitment || '').toLowerCase().includes('remote'),
      job_url:     j.hostedUrl || `https://jobs.lever.co/${slug}/${j.id}`,
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
        body: JSON.stringify({ query: '', location: [], remote: [] }),
        signal: AbortSignal.timeout(10000),
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

// ─────────────────────────────────────────────────────────
// Ashby: batch all slugs through one Playwright subprocess
// ─────────────────────────────────────────────────────────

function runPlaywrightAshby(slugs) {
  return new Promise((resolve) => {
    if (!slugs.length) return resolve({});

    const scriptPath = join(__dirname, 'fetch-ashby-playwright.mjs');
    execFile(
      process.execPath,
      [scriptPath, slugs.join(',')],
      { maxBuffer: 10 * 1024 * 1024, timeout: 5 * 60 * 1000 }, // 5 min, 10MB
      (err, stdout, stderr) => {
        if (stderr) process.stderr.write(stderr);
        if (err) {
          console.error('Playwright subprocess error:', err.message);
          resolve(Object.fromEntries(slugs.map(s => [s, null])));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          console.error('Failed to parse Playwright output:', e.message);
          resolve(Object.fromEntries(slugs.map(s => [s, null])));
        }
      }
    );
  });
}

// ─────────────────────────────────────────────────────────
// Upsert PM roles into job_postings
// ─────────────────────────────────────────────────────────
async function upsertJobs(company, allJobs, companyId) {
  const pmJobs = allJobs.filter(j => isPMRole(j.title));
  const now    = new Date().toISOString();

  await supabase
    .from('job_postings')
    .update({ is_active: false })
    .eq('company_name', company.name)
    .eq('is_active', true);

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
  else           await updateQ.ilike('company_name', company.name);

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

  if (dbErr) console.error('DB error:', dbErr.message);

  const dbMap = new Map((dbRows || []).map(r => [r.company_name.toLowerCase(), r]));

  // Merge KNOWN_COMPANIES (baseline) with DB (source of truth for slugs)
  const map = new Map();
  for (const c of KNOWN_COMPANIES) map.set(c.name.toLowerCase(), { ...c, db_id: null });
  for (const [key, row] of dbMap) {
    const existing = map.get(key) || {};
    map.set(key, {
      name:       row.company_name,
      greenhouse: row.greenhouse_slug || existing.greenhouse || null,
      lever:      row.lever_slug      || existing.lever      || null,
      ashby:      row.ashby_slug      || existing.ashby      || null,
      workable:   row.workable_slug   || existing.workable   || null,
      db_id:      row.id,
    });
  }

  const toCheck = [...map.values()].filter(c => c.greenhouse || c.lever || c.workable || c.ashby);

  // ── Batch ALL Ashby slugs → one Playwright launch ──────────
  const ashbyCompanies = toCheck.filter(c => c.ashby);
  let ashbyResults = {};
  if (ashbyCompanies.length) {
    console.log(`🎭 Playwright: fetching ${ashbyCompanies.length} Ashby companies in one browser session...\n`);
    ashbyResults = await runPlaywrightAshby(ashbyCompanies.map(c => c.ashby));
  }

  // ── Main loop ───────────────────────────────────────────────
  console.log(`Checking ${toCheck.length} companies (Greenhouse / Lever / Workable / Ashby)\n`);
  console.log(`${'Company'.padEnd(30)} ${'All'.padStart(5)} ${'PM'.padStart(5)}  ATS`);
  console.log('─'.repeat(60));

  let totalUpdated = 0, totalPM = 0, notFound = 0;
  const tally = {};

  for (const company of toCheck) {
    const dbRow = dbMap.get(company.name.toLowerCase());
    let jobs = null;

    if (company.ashby) {
      // Already fetched in the Playwright batch — no extra HTTP call
      jobs = ashbyResults[company.ashby] ?? null;
    } else if (company.greenhouse) {
      jobs = await fetchGreenhouse(company.greenhouse);
      await sleep(400);
    } else if (company.lever) {
      jobs = await fetchLever(company.lever);
      await sleep(400);
    } else if (company.workable) {
      jobs = await fetchWorkable(company.workable);
      await sleep(400);
    }

    const atsSlug = company.ashby || company.greenhouse || company.lever || company.workable;

    if (jobs === null) {
      console.log(`${company.name.padEnd(30)}     —         not found [${atsSlug}]`);
      notFound++;
      continue;
    }

    const ats = jobs[0]?.ats_source || (
      company.ashby      ? 'ashby' :
      company.greenhouse ? 'greenhouse' :
      company.lever      ? 'lever' : 'workable'
    );
    const result = await upsertJobs(company, jobs, dbRow?.id || null);
    tally[ats] = (tally[ats] || 0) + 1;

    // Auto-insert new companies not yet in DB
    if (!dbRow?.id && result.total > 0) {
      await supabase.from('ai_companies').upsert({
        company_name:      company.name,
        source:            'ATS discovery',
        announcement_date: new Date().toISOString().split('T')[0],
        open_roles:        result.pm,
        roles_updated_at:  new Date().toISOString(),
        greenhouse_slug:   company.greenhouse || null,
        lever_slug:        company.lever      || null,
        ashby_slug:        company.ashby      || null,
        workable_slug:     company.workable   || null,
        is_hiring:         true,
        founder_names:     [],
        tech_stack:        [],
        investors:         [],
      }, { onConflict: 'company_name,announcement_date' });
    }

    const mark = result.pm > 0 ? '●' : '○';
    console.log(`${company.name.padEnd(30)} ${String(result.total).padStart(5)} ${String(result.pm).padStart(4)} ${mark}  ${ats}`);
    totalUpdated++;
    totalPM += result.pm;
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ ${totalUpdated} checked  |  ${totalPM} PM roles active  |  ${notFound} not on ATS`);
  if (notFound > 0) {
    console.log(`\n⚠  ${notFound} not found — slug may have changed or company inactive.`);
  }
  console.log(`\nBreakdown: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join('  ')}`);

  await supabase.from('sync_log').insert({
    source:  'github-actions-daily-jobs',
    updated: totalUpdated,
    errors:  notFound,
    notes:   `${totalPM} PM roles. ${Object.entries(tally).map(([k,v])=>`${k}=${v}`).join(' ')} NotFound=${notFound}`,
  });
}

main().catch(e => { console.error(e); process.exit(1); });
