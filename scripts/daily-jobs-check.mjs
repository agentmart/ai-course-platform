#!/usr/bin/env node
/**
 * scripts/daily-jobs-check.mjs
 *
 * Daily job posting status checker.
 * For each company in the DB that has a known ATS slug, hits the
 * PUBLIC job board API (no auth required) and updates open_roles count.
 *
 * Supported ATS platforms (all have public unauthenticated APIs):
 *   • Greenhouse  — boards-api.greenhouse.io/v1/boards/{slug}/jobs
 *   • Lever       — api.lever.co/v0/postings/{slug}?mode=json
 *   • Workable    — {company}.workable.com/api/v2/jobs
 *
 * Known AI company slugs are maintained in KNOWN_SLUGS below.
 * The daily check updates the open_roles column and sets roles_updated_at.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─────────────────────────────────────────────
// Known ATS slugs for top AI companies
// Add more as you discover them
// ─────────────────────────────────────────────
const KNOWN_SLUGS = [
  // Greenhouse
  { company_name: 'Anthropic',    greenhouse_slug: 'anthropic',      lever_slug: null },
  { company_name: 'OpenAI',       greenhouse_slug: 'openai',         lever_slug: null },
  { company_name: 'Mistral AI',   greenhouse_slug: 'mistral',        lever_slug: 'mistral' },
  { company_name: 'Cohere',       greenhouse_slug: 'cohere',         lever_slug: null },
  { company_name: 'Together AI',  greenhouse_slug: 'togetherai',     lever_slug: null },
  { company_name: 'Scale AI',     greenhouse_slug: 'scaleai',        lever_slug: null },
  { company_name: 'Weights & Biases', greenhouse_slug: 'wandb',      lever_slug: null },
  { company_name: 'Hugging Face', greenhouse_slug: 'huggingface',    lever_slug: null },
  { company_name: 'Replicate',    greenhouse_slug: null,             lever_slug: 'replicate' },
  { company_name: 'LangChain',    greenhouse_slug: null,             lever_slug: 'langchain' },
  { company_name: 'Perplexity',   greenhouse_slug: null,             lever_slug: 'perplexityai' },
  { company_name: 'Character AI', greenhouse_slug: 'characterai',    lever_slug: null },
  { company_name: 'Inflection AI',greenhouse_slug: 'inflection',     lever_slug: null },
  { company_name: 'Adept AI',     greenhouse_slug: 'adept',          lever_slug: null },
  { company_name: 'Sakana AI',    greenhouse_slug: null,             lever_slug: 'sakana-ai' },
  // Add new YC companies as they grow
  { company_name: 'Hex Security', greenhouse_slug: null,             lever_slug: 'hexsecurity' },
  { company_name: 'Code Metal',   greenhouse_slug: 'codemetal',      lever_slug: null },
  { company_name: 'Beacon Health',greenhouse_slug: null,             lever_slug: 'beacon-health' },
];

// ─────────────────────────────────────────────
// Greenhouse public API
// ─────────────────────────────────────────────
async function getGreenhouseJobCount(slug) {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.jobs) ? data.jobs.length : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Lever public API
// ─────────────────────────────────────────────
async function getLeverJobCount(slug) {
  try {
    const res = await fetch(
      `https://api.lever.co/v0/postings/${slug}?mode=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data.length : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Daily jobs check — ${new Date().toISOString()}\n`);

  // Fetch all companies from DB that we should check
  const { data: dbCompanies } = await supabase
    .from('ai_companies')
    .select('id, company_name, greenhouse_slug, lever_slug')
    .eq('is_hiring', true);

  // Merge DB slugs with our curated KNOWN_SLUGS list
  const slugMap = new Map();

  // Add curated slugs first
  for (const known of KNOWN_SLUGS) {
    slugMap.set(known.company_name.toLowerCase(), known);
  }

  // Overlay DB slugs (DB takes precedence for custom overrides)
  for (const c of (dbCompanies || [])) {
    const key = c.company_name.toLowerCase();
    const existing = slugMap.get(key) || {};
    slugMap.set(key, {
      ...existing,
      company_name: c.company_name,
      db_id: c.id,
      greenhouse_slug: c.greenhouse_slug || existing.greenhouse_slug || null,
      lever_slug: c.lever_slug || existing.lever_slug || null,
    });
  }

  const toCheck = [...slugMap.values()].filter(c => c.greenhouse_slug || c.lever_slug);
  console.log(`Checking ${toCheck.length} companies across Greenhouse + Lever APIs...\n`);

  let updated = 0; let notFound = 0; const results = [];

  for (const company of toCheck) {
    let count = null;
    let ats = null;

    // Try Greenhouse first
    if (company.greenhouse_slug) {
      count = await getGreenhouseJobCount(company.greenhouse_slug);
      if (count !== null) ats = 'greenhouse';
    }

    // Fall back to Lever
    if (count === null && company.lever_slug) {
      count = await getLeverJobCount(company.lever_slug);
      if (count !== null) ats = 'lever';
    }

    const status = count !== null ? `${count} open roles (${ats})` : 'not found';
    console.log(`  ${company.company_name.padEnd(25)} ${status}`);
    results.push({ company: company.company_name, count, ats });

    if (count !== null) {
      // Find the matching DB row (by name if no db_id)
      let query = supabase
        .from('ai_companies')
        .update({
          open_roles: count,
          roles_updated_at: new Date().toISOString(),
          greenhouse_slug: ats === 'greenhouse' ? company.greenhouse_slug : company.greenhouse_slug,
          lever_slug: ats === 'lever' ? company.lever_slug : company.lever_slug,
        });

      if (company.db_id) {
        query = query.eq('id', company.db_id);
      } else {
        query = query.ilike('company_name', company.company_name);
      }

      const { error } = await query;
      if (!error) updated++;
    } else {
      notFound++;
    }

    // Polite rate limiting — 200ms between requests
    await new Promise(r => setTimeout(r, 200));
  }

  // Log to sync_log
  await supabase.from('sync_log').insert({
    source: 'github-actions-daily-jobs',
    updated,
    errors: notFound,
    notes: `Checked ${toCheck.length} companies. ${updated} updated, ${notFound} job boards not found.`,
  });

  console.log(`\n✅ Done — ${updated} updated, ${notFound} not found on ATS`);
}

main().catch(err => { console.error(err); process.exit(1); });
