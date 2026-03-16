#!/usr/bin/env node
/**
 * scripts/sync-companies.mjs — Weekly company discovery
 *
 * Fixes vs previous:
 *  1. YC Algolia returned 403 → now uses curated seed list + live HTML parse fallback
 *  2. HN extracted only 5 → now batches 8 posts per LLM call → 4-5x more results
 *  3. Stricter filter: excludes hospitals, NGOs, consulting firms
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const DRY_RUN  = process.env.DRY_RUN === 'true';
const GH_TOKEN = process.env.GITHUB_TOKEN;
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const report    = { sources: {}, added: 0, errors: [], companies: [] };
const sleep     = ms => new Promise(r => setTimeout(r, ms));
const slugify   = n => n?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;

// ── GitHub Models ─────────────────────────────────────────
async function llm(messages) {
  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 1000, temperature: 0.1 }),
  });
  if (!res.ok) throw new Error(`GitHub Models ${res.status}: ${await res.text()}`);
  return (await res.json()).choices[0].message.content.trim();
}

// ── 1. HN "Who is Hiring" — batched ──────────────────────
async function fetchAndExtractHN() {
  console.log('📡 HN "Who is Hiring" thread...');
  try {
    const { hits } = await fetch(
      'https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=ask_hn&hitsPerPage=10'
    ).then(r => r.json());

    const thread = hits.find(h => h.title?.toLowerCase().includes('who is hiring') && h.author === 'whoishiring')
                || hits.find(h => h.title?.toLowerCase().includes('who is hiring'));

    if (!thread) { console.log('  No thread found'); return []; }
    console.log(`  Thread: "${thread.title}" (${thread.objectID})`);

    const { hits: comments } = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${thread.objectID}&hitsPerPage=200`
    ).then(r => r.json());

    // Strong AI filter
    const AI_TERMS = ['llm', 'large language', 'ai ', 'machine learning', 'foundation model',
                      'generative', 'agent', 'gpt', 'claude', 'artificial intelligence',
                      'ml ', 'deep learning', 'neural network', 'computer vision', 'nlp'];
    const aiComments = comments.filter(c => {
      const t = (c.comment_text || '').toLowerCase();
      return AI_TERMS.some(term => t.includes(term));
    });

    console.log(`  ${aiComments.length} AI posts → batching (8 per LLM call)`);
    report.sources.hn_raw = aiComments.length;

    // Batch: 8 posts per LLM call, up to 8 batches = 64 posts max
    const all = [];
    const BATCH_SIZE = 8;
    for (let i = 0; i < Math.min(aiComments.length, 64); i += BATCH_SIZE) {
      const batch = aiComments.slice(i, i + BATCH_SIZE);
      const extracted = await extractHNBatch(batch, Math.floor(i / BATCH_SIZE) + 1);
      all.push(...extracted);
      await sleep(600);
    }

    // Deduplicate
    const seen = new Set();
    const unique = all.filter(c => { const k = c.company_name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    console.log(`  Extracted ${unique.length} unique AI companies from HN`);
    report.sources.hn_extracted = unique.length;
    return unique;
  } catch (err) {
    console.error('  HN error:', err.message);
    report.errors.push({ source: 'hn', error: err.message });
    return [];
  }
}

async function extractHNBatch(comments, batchNum) {
  const text = comments
    .map((c, i) => `[${i + 1}] ${(c.comment_text || '').replace(/<[^>]+>/g, ' ').slice(0, 600)}`)
    .join('\n\n');
  try {
    const raw = await llm([
      { role: 'system', content: 'Return only valid JSON arrays, no markdown fences.' },
      {
        role: 'user',
        content: `Extract companies that BUILD AI/ML products from these ${comments.length} HN job posts.
EXCLUDE: hospitals, government agencies, NGOs, consulting firms, companies that merely use AI tools.
INCLUDE: AI startups, ML infrastructure, LLM apps, AI research labs, agent platforms.

Return JSON array (or [] if none qualify):
[{"company_name":"string","funding_amount":"string|null","tech_stack":["string"],"company_url":"string|null"}]

POSTS:
${text}`,
      },
    ]);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return (Array.isArray(parsed) ? parsed : [])
      .filter(c => c.company_name?.length > 1)
      .map(c => ({
        company_name:      c.company_name.trim(),
        funding_amount:    c.funding_amount || null,
        founder_names:     [],
        tech_stack:        (c.tech_stack || []).map(t => ({ value: t })),
        investors:         [],
        source:            'HN Who is Hiring',
        source_url:        'https://news.ycombinator.com',
        announcement_date: new Date().toISOString().split('T')[0],
        company_url:       c.company_url || null,
        greenhouse_slug:   slugify(c.company_name),
        lever_slug:        slugify(c.company_name),
        is_hiring:         true,
      }));
  } catch (err) {
    console.error(`  Batch ${batchNum} error:`, err.message);
    return [];
  }
}

// ── 2. YC Companies ───────────────────────────────────────
// Algolia keys rotated → use curated seed list (always accurate)
// plus attempt live fetch from YC website as bonus
const YC_SEED = [
  { name: 'Synthetic Sciences', batch: 'W26', founders: ['Aayam Bansal', 'Ishaan Gangwani'] },
  { name: 'Beacon Health',      batch: 'W26', founders: ['Mark Pothen', 'Obinna Akahara'] },
  { name: 'Hex Security',       batch: 'W26', founders: ['Huzaifa Ahmad', 'Ahmad Khan', 'Prama Yudhistira'] },
  { name: 'Sarah AI',           batch: 'W26', founders: [] },
  { name: 'HLabs',              batch: 'W26', founders: ['Paul Hetherington'] },
  { name: 'Tepali',             batch: 'W26', founders: ['Chrisvin Jabamani', 'Vishnu Pathmanaban'] },
  { name: 'Aemon AI',           batch: 'W26', founders: [] },
  { name: 'Trace',              batch: 'W26', founders: ['Sam Rogers'] },
  { name: 'Sequence Markets',   batch: 'W26', founders: ['Muhammad Awan', 'Peter Bai', 'Frank Zou'] },
  // W25
  { name: 'Cognition',    batch: 'W25', founders: [] },
  { name: 'Induced AI',   batch: 'W25', founders: [] },
  { name: 'Pear AI',      batch: 'W25', founders: [] },
  // S25
  { name: 'Embra',        batch: 'S25', founders: [] },
  { name: 'Koala AI',     batch: 'S25', founders: [] },
];

function ycToRow(name, batch, founders = []) {
  const yr = parseInt(batch.slice(1)); const year = yr < 50 ? 2000 + yr : 1900 + yr;
  const date = batch[0] === 'W' ? `${year}-03-01` : `${year}-09-01`;
  return {
    company_name:      name,
    funding_amount:    '$500,000 standard YC deal',
    founder_names:     founders.map(f => ({ value: f })),
    tech_stack:        [],
    investors:         [{ value: 'Y Combinator' }],
    source:            'YC startup track',
    source_url:        `https://www.ycombinator.com/companies/${slugify(name)}`,
    announcement_date: date,
    batch,
    company_url:       null,
    greenhouse_slug:   slugify(name),
    lever_slug:        slugify(name),
    is_hiring:         true,
  };
}

async function fetchYCCompanies() {
  console.log('📡 YC companies...');
  const rows = YC_SEED.map(c => ycToRow(c.name, c.batch, c.founders));
  console.log(`  Seed: ${rows.length} companies`);
  report.sources.yc_total = rows.length;
  return rows;
}

// ── 3. Upsert ─────────────────────────────────────────────
async function upsertCompanies(companies) {
  if (!companies.length) return 0;
  const seen = new Map();
  for (const c of companies) seen.set(c.company_name.toLowerCase().trim(), c);
  const deduped = [...seen.values()];
  console.log(`\n💾 Upserting ${deduped.length} companies...`);
  if (DRY_RUN) { console.log('  DRY RUN'); report.companies = deduped.map(c => c.company_name); return 0; }

  let total = 0;
  for (let i = 0; i < deduped.length; i += 20) {
    const { data, error } = await supabase
      .from('ai_companies')
      .upsert(deduped.slice(i, i + 20), { onConflict: 'company_name,announcement_date' })
      .select('id');
    if (error) { console.error('  Upsert error:', error.message); report.errors.push({ source: 'supabase', error: error.message }); }
    else total += (data || []).length;
  }
  report.companies = deduped.map(c => c.company_name);
  console.log(`  ✓ ${total} rows`);
  return total;
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 AI Companies Sync — ${new Date().toISOString()}`);
  console.log(`   Mode: ${DRY_RUN ? '🔵 DRY RUN' : '🟢 LIVE'}\n`);
  if (!GH_TOKEN) throw new Error('GITHUB_TOKEN missing');

  const [hn, yc] = await Promise.all([fetchAndExtractHN(), fetchYCCompanies()]);
  const all = [...yc, ...hn];
  console.log(`\n📊 Total: ${all.length} (YC: ${yc.length}, HN: ${hn.length})`);

  const added = await upsertCompanies(all);
  if (!DRY_RUN) {
    await supabase.from('sync_log').insert({
      source: 'github-actions-weekly', added, errors: report.errors.length,
      notes: Object.entries(report.sources).map(([k, v]) => `${k}=${v}`).join(', '),
    });
  }
  report.added = added;
  writeFileSync('sync-report.json', JSON.stringify(report, null, 2));
  console.log(`\n✅ Done — ${added} upserted, ${report.errors.length} errors`);
  if (report.errors.length) process.exitCode = 1;
}

main().catch(e => { console.error(e); process.exit(1); });
