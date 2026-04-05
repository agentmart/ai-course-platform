#!/usr/bin/env node
/**
 * scripts/sync-companies.mjs
 *
 * Weekly AI company discovery agent using GitHub Models.
 *
 * Why GitHub Models:
 *   - GITHUB_TOKEN is auto-injected in every Actions run — zero extra secrets
 *   - GitHub Enterprise gives higher rate limits
 *   - OpenAI-compatible API, trivial fetch() call
 *   - Uses gpt-4o-mini for fast, cheap structured extraction
 *
 * Data sources (all free public APIs, no scraping):
 *   1. HN Algolia API  — "Ask HN: Who is Hiring?" monthly thread
 *   2. YC Algolia     — W25/W26/S25 batch AI companies
 *
 * GitHub Models API reference:
 *   POST https://models.inference.ai.azure.com/chat/completions
 *   Header: Authorization: Bearer <GITHUB_TOKEN>
 *   Body:   OpenAI-compatible { model, messages, max_tokens }
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const DRY_RUN  = process.env.DRY_RUN === 'true';
const GH_TOKEN = process.env.GITHUB_TOKEN;       // auto-injected by Actions
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const report = { sources: {}, upserted: 0, updated: 0, errors: [], companies: [] };

// ─────────────────────────────────────────────────────────
// GitHub Models: OpenAI-compatible chat completions
// Model options (all available on GitHub Enterprise):
//   Fast + cheap extraction:  gpt-4o-mini
//   Better reasoning:         gpt-4o, Phi-4
//   Open source option:       Llama-3.3-70B-Instruct
// ─────────────────────────────────────────────────────────
async function githubModelsChat(messages, model = 'gpt-4o-mini') {
  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 2000,
      temperature: 0.1,  // low temp for structured extraction
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub Models API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────
// 1. HN ALGOLIA — "Who is Hiring" thread
// ─────────────────────────────────────────────────────────
async function fetchHNHiringThread() {
  console.log('📡 Fetching HN "Who is Hiring" thread...');
  try {
    const res = await fetch(
      'https://hn.algolia.com/api/v1/search?query=Ask+HN+Who+is+hiring&tags=ask_hn&hitsPerPage=5'
    );
    const { hits } = await res.json();

    const thread = hits.find(h =>
      h.title?.toLowerCase().includes('who is hiring') && h.author === 'whoishiring'
    );

    if (!thread) {
      console.log('  No current "whoishiring" thread found');
      return [];
    }

    console.log(`  Found: "${thread.title}" (ID: ${thread.objectID})`);

    const commentsRes = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=comment,story_${thread.objectID}&hitsPerPage=100`
    );
    const { hits: comments } = await commentsRes.json();

    // Filter to AI/ML job posts only
    const aiComments = comments.filter(c => {
      const t = (c.comment_text || '').toLowerCase();
      return /\bai\b/.test(t) || t.includes('llm') || t.includes('machine learning') ||
             t.includes('agent') || t.includes('foundation model') || /\bml\b/.test(t);
    });

    console.log(`  ${aiComments.length} AI-related posts found`);
    report.sources.hn_raw = aiComments.length;
    return aiComments.slice(0, 40); // cap for token budget
  } catch (err) {
    console.error('  HN error:', err.message);
    report.errors.push({ source: 'hn', error: err.message });
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// 2. YC COMPANY DIRECTORY — Algolia public search
// ─────────────────────────────────────────────────────────
async function fetchYCCompanies() {
  console.log('📡 Fetching YC AI companies (W26, W25, S25)...');
  const batches = ['W26', 'W25', 'S25'];
  const companies = [];

  const algoliaKey = process.env.YC_ALGOLIA_API_KEY || 'Gy9bmiXhDiTBl4NCbLJv3iYGBuGQmSJRlQFf1gms';
  const algoliaAppId = process.env.YC_ALGOLIA_APP_ID || '45BWZJ1SGC';
  for (const batch of batches) {
    try {
      const res = await fetch(`https://${algoliaAppId.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-API-Key': algoliaKey,
          'X-Algolia-Application-Id': algoliaAppId,
        },
        body: JSON.stringify({
          requests: [{
            indexName: 'YCCompany_production',
            params: `query=&filters=batch%3A${batch}&hitsPerPage=100`,
          }]
        })
      });

      if (!res.ok) { console.log(`  ${batch}: API returned ${res.status}`); continue; }

      const data = await res.json();
      const hits = data.results?.[0]?.hits || [];

      const filtered = hits.filter(c => {
        const d = (c.one_liner || c.long_description || '').toLowerCase();
        return d.includes('ai') || d.includes('machine learning') ||
               d.includes('llm') || d.includes('agent') || d.includes(' ml');
      });

      const mapped = filtered.map(c => ({
        company_name:      c.name,
        funding_amount:    '$500,000 standard YC deal',
        founder_names:     (c.founders || []).map(f => ({ value: f.name })).filter(f => f.value),
        tech_stack:        [],
        investors:         [{ value: 'Y Combinator' }],
        source:            'YC startup track',
        source_url:        `https://www.ycombinator.com/companies/${c.slug}`,
        announcement_date: ycBatchToDate(batch),
        batch,
        company_url:       c.website || null,
        greenhouse_slug:   slugify(c.name),
        lever_slug:        slugify(c.name),
        is_hiring:         true,
      }));

      companies.push(...mapped);
      console.log(`  ${batch}: ${mapped.length} AI companies`);
    } catch (err) {
      console.error(`  YC ${batch} error:`, err.message);
      report.errors.push({ source: `yc_${batch}`, error: err.message });
    }
  }

  report.sources.yc_total = companies.length;
  return companies;
}

// ─────────────────────────────────────────────────────────
// 3. GITHUB MODELS EXTRACTION from HN posts
// ─────────────────────────────────────────────────────────
async function extractFromHN(comments) {
  if (!comments.length) return [];
  console.log(`🤖 GitHub Models (gpt-4o-mini) extracting from ${comments.length} HN posts...`);

  // Strip HTML tags and trim each comment
  const rawText = comments
    .slice(0, 30)
    .map((c, i) => `--- Post ${i + 1} ---\n${(c.comment_text || '').replace(/<[^>]+>/g, ' ').slice(0, 500)}`)
    .join('\n\n');

  try {
    const reply = await githubModelsChat([
      {
        role: 'system',
        content: 'You are a structured data extractor. Always respond with valid JSON only — no markdown fences, no explanation.',
      },
      {
        role: 'user',
        content: `Extract AI companies from these Hacker News "Who is Hiring" job posts.
Return ONLY a JSON array. Each item must have exactly these fields:
[
  {
    "company_name": "string",
    "funding_amount": "string or null",
    "tech_stack": ["string"],
    "company_url": "string or null",
    "announcement_date": "YYYY-MM-DD or null",
    "is_ai_company": true
  }
]

Rules:
- Only include companies clearly building AI/ML products
- Skip staffing agencies, non-tech companies
- tech_stack: list languages, frameworks, cloud platforms mentioned
- funding_amount: include if mentioned (e.g. "Series A", "$5M seed"), else null

POSTS:
${rawText}`,
      }
    ]);

    const parsed = JSON.parse(reply.trim());
    const normalised = parsed
      .filter(c => c.is_ai_company && c.company_name)
      .map(c => ({
        company_name:      c.company_name.trim(),
        funding_amount:    c.funding_amount || null,
        founder_names:     [],
        tech_stack:        (c.tech_stack || []).map(t => ({ value: t })),
        investors:         [],
        source:            'HN Who is Hiring',
        source_url:        'https://news.ycombinator.com',
        announcement_date: c.announcement_date || new Date().toISOString().split('T')[0],
        company_url:       c.company_url || null,
        greenhouse_slug:   slugify(c.company_name),
        lever_slug:        slugify(c.company_name),
        is_hiring:         true,
      }));

    console.log(`  Extracted ${normalised.length} AI companies from HN`);
    report.sources.hn_extracted = normalised.length;
    return normalised;
  } catch (err) {
    console.error('  GitHub Models extraction error:', err.message);
    report.errors.push({ source: 'github_models_extract', error: err.message });
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// 4. UPSERT TO SUPABASE
// ─────────────────────────────────────────────────────────
async function upsertCompanies(companies) {
  if (!companies.length) { console.log('  No companies to upsert'); return { upserted: 0 }; }

  // Deduplicate by lowercase company name — latest entry wins
  const seen = new Map();
  for (const c of companies) {
    seen.set(c.company_name.toLowerCase().trim(), c);
  }
  const deduped = [...seen.values()];

  console.log(`\n💾 Upserting ${deduped.length} unique companies...`);

  if (DRY_RUN) {
    console.log('  DRY RUN — no writes performed');
    report.companies = deduped.map(c => c.company_name);
    return { upserted: 0 };
  }

  let upserted = 0;
  // Batch in groups of 20 to stay within Supabase payload limits
  for (let i = 0; i < deduped.length; i += 20) {
    const chunk = deduped.slice(i, i + 20);
    const { data, error } = await supabase
      .from('ai_companies')
      .upsert(chunk, { onConflict: 'company_name,announcement_date' })
      .select('id');

    if (error) {
      console.error(`  Batch ${Math.floor(i / 20) + 1} error:`, error.message);
      report.errors.push({ source: 'supabase', error: error.message });
    } else {
      upserted += (data || []).length;
      console.log(`  Batch ${Math.floor(i / 20) + 1}: ${(data || []).length} rows`);
    }
  }

  report.companies = deduped.map(c => c.company_name);
  return { upserted };
}

// ─────────────────────────────────────────────────────────
// 5. LOG SYNC RUN
// ─────────────────────────────────────────────────────────
async function logRun(upserted) {
  if (DRY_RUN) return;
  await supabase.from('sync_log').insert({
    source: 'github-actions-weekly',
    added: upserted,
    errors: report.errors.length,
    notes: Object.entries(report.sources).map(([k, v]) => `${k}=${v}`).join(', '),
  });
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function slugify(name) {
  return name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || null;
}

function ycBatchToDate(batch) {
  const season = batch[0];
  const yr = parseInt(batch.slice(1));
  const year = yr < 50 ? 2000 + yr : 1900 + yr;
  return season === 'W' ? `${year}-03-01` : `${year}-09-01`;
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 AI Companies Sync — ${new Date().toISOString()}`);
  console.log(`   Mode: ${DRY_RUN ? '🔵 DRY RUN' : '🟢 LIVE'}`);
  console.log(`   Model: gpt-4o-mini via GitHub Models\n`);

  if (!GH_TOKEN) throw new Error('GITHUB_TOKEN not found — check workflow permissions block');

  // Fetch sources in parallel
  const [hnComments, ycCompanies] = await Promise.all([
    fetchHNHiringThread(),
    fetchYCCompanies(),
  ]);

  // Run LLM extraction on HN comments
  const hnCompanies = await extractFromHN(hnComments);

  const all = [...ycCompanies, ...hnCompanies];
  console.log(`\n📊 Total candidates: ${all.length} (YC: ${ycCompanies.length}, HN: ${hnCompanies.length})`);

  const { upserted } = await upsertCompanies(all);
  await logRun(upserted);

  report.upserted = upserted;
  writeFileSync('sync-report.json', JSON.stringify(report, null, 2));

  console.log(`\n✅ Done — upserted: ${upserted}, errors: ${report.errors.length}`);
  if (report.errors.length > 0) {
    console.error('Errors:', JSON.stringify(report.errors, null, 2));
    process.exitCode = 1;
  }
}

main().catch(err => { console.error(err); process.exit(1); });
