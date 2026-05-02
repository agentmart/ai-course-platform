#!/usr/bin/env node
/**
 * scripts/weekly-gap-detector.mjs
 *
 * Weekly: fetch ~30d of vendor headlines, then run a LangGraph state machine
 * (cluster_headlines → lookup_course_titles → judge_gap → score_gaps) that
 * decides which clusters are missing from the 60-day course and scores them
 * on impact / novelty / relevance. Upsert into content_gaps and email the
 * admin a digest of the top 3.
 *
 * Sprint 7 (s7-gap-detector-graph): the analysis layer was migrated from a
 * single GH-Models call to a LangGraph graph using `getChatModelNode` so the
 * same Foundry/Anthropic/OpenAI provider rules used by Astro/Workers apply
 * here too. Total LLM calls per run is capped at 3 (well under the budget
 * of 8) — clustering, gap-judging, and scoring each run as one batched
 * call, with `maxTokens: 600` per call.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY              — required
 *   AZURE_FOUNDRY_API_KEY + AZURE_FOUNDRY_ENDPOINT       — preferred LLM
 *     (or ANTHROPIC_API_KEY, or OPENAI_API_KEY)
 *   AZURE_FOUNDRY_DEFAULT_MODEL                          — Foundry deployment name
 *   LLM_PROVIDER                                          — pin provider
 *   GH_MODELS_TOKEN | GITHUB_TOKEN                       — legacy fallback path
 *   GAP_DETECTOR_MODEL                                    — legacy GH-Models id
 *   RESEND_API_KEY                                        — optional (skipped on DRY_RUN)
 *   ADMIN_EMAIL                                           — defaults to stavanm@gmail.com
 *   TEST_EMAIL                                            — short-circuit recipient list
 *   DRY_RUN=true                                          — print only, no DB / no email
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { sendTemplated } from '../lib/email.js';
import { getChatModelNode } from './lib/llm-node.mjs';

const DRY_RUN     = process.env.DRY_RUN === 'true';
const TEST_EMAIL  = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const ADMIN_EMAIL_RAW = (process.env.ADMIN_EMAIL || 'stavanm@gmail.com').trim().toLowerCase();
// Honour TEST_EMAIL as in sibling weekly notification scripts.
const ADMIN_EMAIL = TEST_EMAIL || ADMIN_EMAIL_RAW;
const ADMIN_USER  = 'admin_stavanm';
const MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const MODELS_TOKEN = process.env.GH_MODELS_TOKEN || process.env.GITHUB_TOKEN || '';
const MODEL_ID = process.env.GAP_DETECTOR_MODEL || 'openai/gpt-4.1';
const MAX_TOKENS = 600;

const VENDOR_FEEDS = [
  { vendor: 'Anthropic',       url: 'https://www.anthropic.com/news' },
  { vendor: 'OpenAI',          url: 'https://openai.com/news/' },
  { vendor: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/' },
  { vendor: 'Meta AI',         url: 'https://ai.meta.com/blog/' },
  { vendor: 'xAI',             url: 'https://x.ai/news' },
  { vendor: 'Cohere',          url: 'https://cohere.com/blog' },
  { vendor: 'Mistral',         url: 'https://mistral.ai/news/' },
];
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

async function fetchHeadlines() {
  const out = [];
  await Promise.all(VENDOR_FEEDS.map(async (f) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(f.url, { signal: ctrl.signal, headers: { 'User-Agent': UA } });
      clearTimeout(t);
      if (!res.ok) return;
      const body = await res.text();
      const heads = [...body.matchAll(/<(?:h[12345]|title)[^>]*>([^<]{12,180})<\/(?:h[12345]|title)>/gi)]
        .map(m => m[1].trim().replace(/\s+/g, ' '))
        .filter(h => !/^(home|news|blog|loading|page not found|menu)$/i.test(h));
      // de-dupe within a vendor
      const seen = new Set();
      for (const h of heads) {
        const k = h.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > 12) break;
        out.push({ vendor: f.vendor, headline: h, source: f.url });
      }
    } catch (e) {
      console.warn(`  ! ${f.vendor} fetch failed: ${e.message}`);
    }
  }));
  return out;
}

function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const m = s.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const m2 = s.match(/\{[\s\S]*\}/);
  if (m2) { try { return JSON.parse(m2[0]); } catch {} }
  return null;
}

async function callModel({ system, user, max_tokens = MAX_TOKENS, json = true }) {
  // Try the LangChain chat model first (Foundry/Anthropic/OpenAI). If no
  // provider is configured, fall back to legacy GitHub Models endpoint.
  try {
    const model = await getChatModelNode({ maxTokens: max_tokens, temperature: 0.3 });
    const res = await model.invoke([
      { role: 'system', content: system },
      // Some providers ignore response_format on chat; we coax JSON via prompt.
      { role: 'user', content: json ? `${user}\n\nReturn ONLY a single valid JSON object. No prose, no code fences.` : user },
    ]);
    const content = typeof res?.content === 'string'
      ? res.content
      : Array.isArray(res?.content)
        ? res.content.map(c => (typeof c === 'string' ? c : c?.text || '')).join('')
        : '';
    return content;
  } catch (e) {
    if (!MODELS_TOKEN) throw e; // no fallback available — surface the original error
    console.warn(`  ⚠ LangChain provider unavailable (${e.message.split('\n')[0]}), falling back to GH Models`);
    const res = await fetch(MODELS_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MODELS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens, temperature: 0.3,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`Models ${MODEL_ID} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

async function clusterHeadlines(headlines) {
  const blob = headlines.map((h, i) => `[${i}] (${h.vendor}) ${h.headline}`).join('\n');
  const sys = 'You cluster AI industry headlines. Group near-duplicates into named clusters and provide search aliases used to find mentions in course content.';
  const user = `Headlines from major AI labs:
${blob}

Cluster these into distinct topics (max 15 clusters). For each cluster:
- title: short canonical name (e.g., "Claude 4.5 Sonnet release", "GPT-5.2 Codex preview", "Anthropic Constitutional Classifiers")
- aliases: 3-5 alternative search terms a course author might have used (model codes, product names, lower-case variants). Avoid generic words like "AI" or "model".
- headline_indices: the [i] indices that belong to this cluster.

Return JSON: {"clusters":[{"title":"...","aliases":["..."],"headline_indices":[0,4]}]}`;
  const raw = await callModel({ system: sys, user, max_tokens: MAX_TOKENS });
  const parsed = safeParseJson(raw);
  if (!Array.isArray(parsed?.clusters)) throw new Error('Cluster response unparseable');
  return parsed.clusters
    .filter(c => c && typeof c.title === 'string' && Array.isArray(c.headline_indices))
    .map(c => ({
      title: String(c.title).trim(),
      aliases: Array.isArray(c.aliases) ? c.aliases.map(String).map(s => s.trim()).filter(Boolean) : [],
      headlines: c.headline_indices.map(i => headlines[i]).filter(Boolean),
    }))
    .filter(c => c.headlines.length > 0);
}

async function loadDayCorpus() {
  const dir = path.resolve('public/days');
  const files = (await fs.readdir(dir)).filter(f => /^day-\d+\.js$/.test(f));
  const out = [];
  for (const f of files) {
    const num = parseInt(f.match(/day-(\d+)\.js/)[1], 10);
    const text = await fs.readFile(path.join(dir, f), 'utf8');
    out.push({ day: num, text: text.toLowerCase() });
  }
  return out.sort((a, b) => a.day - b.day);
}

function clusterIsCovered(cluster, dayCorpus) {
  const needles = [cluster.title, ...cluster.aliases]
    .map(s => s.toLowerCase().trim())
    .filter(s => s.length >= 4);
  if (!needles.length) return { covered: false, hits: [] };
  const hits = [];
  for (const day of dayCorpus) {
    for (const needle of needles) {
      if (day.text.includes(needle)) {
        hits.push({ day: day.day, needle });
        break;
      }
    }
    if (hits.length >= 3) break;
  }
  return { covered: hits.length > 0, hits };
}

async function scoreImportance(gaps) {
  if (!gaps.length) return [];
  const blob = gaps.map((g, i) => `[${i}] ${g.title}  (${g.headlines.length} mention${g.headlines.length === 1 ? '' : 's'} across vendors: ${[...new Set(g.headlines.map(h => h.vendor))].join(', ')})`).join('\n');
  const sys = 'You rate AI industry topics on how important they are for an AI Product Manager to know. Be calibrated: only major releases or industry-shaping shifts get 5; niche or speculative items get 1-2.';
  const user = `Rate each topic 1–5 on importance for an AI PM in 2026:
${blob}

Return JSON: {"scores":[{"index":0,"importance":4,"reason":"..."}, ...]}  (≤8 words for reason)`;
  try {
    const raw = await callModel({ system: sys, user, max_tokens: MAX_TOKENS });
    const parsed = safeParseJson(raw);
    const scores = Array.isArray(parsed?.scores) ? parsed.scores : [];
    const map = new Map(scores.map(s => [s.index, s]));
    return gaps.map((g, i) => {
      const s = map.get(i);
      return { ...g, importance: clamp(s?.importance, 1, 5, 3), score_reason: (s?.reason || '').slice(0, 80) };
    });
  } catch (e) {
    console.warn(`  ⚠ importance scoring failed: ${e.message}`);
    return gaps.map(g => ({ ...g, importance: 3, score_reason: 'default (scoring failed)' }));
  }
}

function clamp(v, lo, hi, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

function adminDigestHtml(gaps, weekLabel) {
  const rows = gaps.map((g, i) => {
    const sources = g.headlines.slice(0, 3).map(h => `${h.vendor}`).join(', ');
    return `<tr><td style="padding:10px 0;border-bottom:1px solid #ede8df;">
      <div style="font-size:14px;font-weight:600;color:#1a1512;">${i + 1}. ${escapeHtml(g.title)}</div>
      <div style="font-size:12px;color:#8c7f74;margin-top:3px;">importance ${g.importance}/5 · ${escapeHtml(sources)} · ${g.headlines.length} mention${g.headlines.length === 1 ? '' : 's'}</div>
      <div style="font-size:12px;color:#8c7f74;margin-top:2px;font-style:italic;">${escapeHtml(g.score_reason || '')}</div>
    </td></tr>`;
  }).join('');
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,sans-serif;color:#1a1512;">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border:1px solid #d4cdc4;border-radius:8px;padding:28px;">
        <h1 style="font-size:18px;margin:0 0 6px;">Content gaps — top ${gaps.length}</h1>
        <p style="font-size:13px;color:#8c7f74;margin:0 0 18px;">${escapeHtml(weekLabel)}</p>
        <p style="font-size:13px;color:#3d3530;line-height:1.6;margin:0 0 16px;">These topics appeared in vendor news in the past 30 days but aren't mentioned in any of the 60 day files. Sorted by importance.</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <p style="font-size:12px;color:#8c7f74;margin:22px 0 0;">View all on <a href="https://becomeaipm.com/gaps.html" style="color:#c8590a;">/gaps</a> · admin actions via SQL on content_gaps.</p>
      </div>
    </div></body></html>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function weekLabel(now = new Date()) {
  const start = new Date(now.getTime() - 30 * 86400_000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(now)}`;
}

async function loadDayTitles() {
  // Read frontmatter (day, subtitle) from astro-app/src/content/days/*.mdx so
  // the judge_gap node can reason over canonical course titles instead of
  // raw legacy day-NN.js bodies. Falls back silently if the directory is
  // missing (older checkouts).
  const dir = path.resolve('astro-app/src/content/days');
  let files;
  try {
    files = (await fs.readdir(dir)).filter(f => /\.mdx$/.test(f));
  } catch {
    return [];
  }
  const out = [];
  for (const f of files) {
    const text = await fs.readFile(path.join(dir, f), 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;
    const fm = fmMatch[1];
    const dayMatch = fm.match(/^day:\s*(\d+)/m);
    const subMatch = fm.match(/^subtitle:\s*"([^"]+)"/m);
    if (!dayMatch) continue;
    out.push({
      day: parseInt(dayMatch[1], 10),
      subtitle: subMatch ? subMatch[1] : '',
    });
  }
  return out.sort((a, b) => a.day - b.day);
}

// ─── LangGraph state machine ────────────────────────────────────────────────

async function buildGapGraph() {
  // Lazy-import LangGraph so we only pay the cost when we actually have
  // headlines to analyse (the script can early-exit before we ever load it).
  const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph');

  const State = Annotation.Root({
    headlines:    Annotation({ reducer: (_, n) => n, default: () => [] }),
    dayTitles:    Annotation({ reducer: (_, n) => n, default: () => [] }),
    dayCorpus:    Annotation({ reducer: (_, n) => n, default: () => [] }),
    clusters:     Annotation({ reducer: (_, n) => n, default: () => [] }),
    gaps:         Annotation({ reducer: (_, n) => n, default: () => [] }),
    scoredGaps:   Annotation({ reducer: (_, n) => n, default: () => [] }),
  });

  // Node 1 — cluster headlines (LLM call #1).
  async function clusterNode(state) {
    let clusters;
    try {
      clusters = await clusterHeadlines(state.headlines);
    } catch (e) {
      if (DRY_RUN && /no_access|403|not configured|provider configured|no llm/i.test(e.message)) {
        console.warn(`  ⚠ ${e.message.split('\n')[0]}`);
        console.warn('  ⚠ DRY_RUN fallback: treating each headline as its own cluster.');
        clusters = state.headlines.map(h => ({ title: h.headline, aliases: [], headlines: [h] }));
      } else { throw e; }
    }
    console.log(`  [graph] cluster_headlines → ${clusters.length} clusters`);
    return { clusters };
  }

  // Node 2 — lookup course titles (no LLM, fs-only "tool" call).
  async function lookupTitlesNode(state) {
    const titles = state.dayTitles.length ? state.dayTitles : await loadDayTitles();
    console.log(`  [graph] lookup_course_titles → ${titles.length} day titles`);
    return { dayTitles: titles };
  }

  // Node 3 — judge gap: combine grep-coverage with one batched LLM verdict
  // (LLM call #2). The LLM gets the cluster list and all course day titles
  // and decides for each cluster whether the topic is meaningfully missing.
  async function judgeGapNode(state) {
    const { clusters, dayCorpus, dayTitles } = state;
    // Cheap pre-filter: anything mentioned literally in any day is covered.
    const candidates = clusters
      .map((c) => ({ ...c, ...clusterIsCovered(c, dayCorpus) }))
      .filter(c => !c.covered);
    if (!candidates.length) {
      console.log('  [graph] judge_gap → 0 candidates (all clusters covered)');
      return { gaps: [] };
    }

    const titlesBlob = dayTitles.length
      ? dayTitles.map(t => `Day ${t.day}: ${t.subtitle}`).join('\n')
      : '(course title index unavailable)';
    const clustersBlob = candidates
      .map((c, i) => `[${i}] ${c.title}  (aliases: ${(c.aliases || []).slice(0, 4).join(', ') || 'none'})`)
      .join('\n');
    const sys = 'You are an AI curriculum auditor. Given a 60-day AI Product Manager course title list and a set of newly-emerging topic clusters, decide which clusters are genuinely missing from the course. A cluster is NOT a gap if a day already covers the same conceptual ground (even with different wording).';
    const user = `Course day titles:
${titlesBlob}

Topic clusters that did not match any day file by keyword:
${clustersBlob}

For each cluster, decide: is this a real gap (topic absent from course) or already covered conceptually? If covered, name the closest day. Either way, suggest where it would best slot in.

Return JSON: {"verdicts":[{"index":0,"is_gap":true,"closest_day":12,"suggested_day_to_add":34,"rationale":"..."}, ...]}  (rationale ≤15 words)`;
    let verdicts = [];
    try {
      const raw = await callModel({ system: sys, user, max_tokens: MAX_TOKENS });
      const parsed = safeParseJson(raw);
      verdicts = Array.isArray(parsed?.verdicts) ? parsed.verdicts : [];
    } catch (e) {
      if (DRY_RUN && /no_access|403|not configured|provider configured|no llm/i.test(e.message)) {
        console.warn(`  ⚠ judge_gap fallback: assuming all uncovered clusters are gaps. (${e.message.split('\n')[0]})`);
      } else { throw e; }
    }

    const verdictMap = new Map(verdicts.map(v => [v.index, v]));
    const gaps = candidates.flatMap((c, i) => {
      const v = verdictMap.get(i);
      const isGap = v ? !!v.is_gap : true; // default-true on missing verdict
      if (!isGap) return [];
      const canonicalUrl = (c.headlines[0]?.source || '') + '#' + encodeURIComponent(c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60));
      return [{
        title: c.title,
        aliases: c.aliases,
        canonical_url: canonicalUrl,
        headlines: c.headlines,
        suggested_day_to_add: clamp(v?.suggested_day_to_add, 1, 60, null),
        closest_day: clamp(v?.closest_day, 1, 60, null),
        rationale: (v?.rationale || '').slice(0, 140),
      }];
    });
    console.log(`  [graph] judge_gap → ${gaps.length} gaps (of ${candidates.length} uncovered)`);
    return { gaps };
  }

  // Node 4 — score gaps on impact, novelty, learner-relevance (LLM call #3).
  async function scoreNode(state) {
    if (!state.gaps.length) return { scoredGaps: [] };
    const blob = state.gaps.map((g, i) =>
      `[${i}] ${g.title}  (${g.headlines.length} mention${g.headlines.length === 1 ? '' : 's'} · vendors: ${[...new Set(g.headlines.map(h => h.vendor))].join(', ')})`
    ).join('\n');
    const sys = 'You rate AI industry topics for an AI Product Manager curriculum on three axes: impact (industry-wide significance), novelty (newness vs known territory), and learner_relevance (usefulness for a working PM). Be calibrated; reserve 5 for major releases or paradigm shifts.';
    const user = `Rate each topic 1–5 on impact, novelty, learner_relevance:
${blob}

Return JSON: {"scores":[{"index":0,"impact":4,"novelty":3,"relevance":5,"reason":"..."}, ...]}  (reason ≤10 words)`;
    let scores = [];
    try {
      const raw = await callModel({ system: sys, user, max_tokens: MAX_TOKENS });
      const parsed = safeParseJson(raw);
      scores = Array.isArray(parsed?.scores) ? parsed.scores : [];
    } catch (e) {
      if (DRY_RUN && /no_access|403|not configured|provider configured|no llm/i.test(e.message)) {
        console.warn(`  ⚠ score_gaps fallback: defaulting all to 3/5. (${e.message.split('\n')[0]})`);
      } else { throw e; }
    }
    const map = new Map(scores.map(s => [s.index, s]));
    const scoredGaps = state.gaps.map((g, i) => {
      const s = map.get(i);
      const impact    = clamp(s?.impact, 1, 5, 3);
      const novelty   = clamp(s?.novelty, 1, 5, 3);
      const relevance = clamp(s?.relevance, 1, 5, 3);
      // Composite importance keeps backwards-compatibility with the existing
      // `content_gaps.importance` column.
      const importance = Math.round((impact + novelty + relevance) / 3);
      return {
        ...g,
        impact, novelty, relevance, importance,
        score_reason: (s?.reason || '').slice(0, 80),
      };
    });
    console.log(`  [graph] score_gaps → ${scoredGaps.length} scored`);
    return { scoredGaps };
  }

  const graph = new StateGraph(State)
    .addNode('cluster_headlines', clusterNode)
    .addNode('lookup_course_titles', lookupTitlesNode)
    .addNode('judge_gap', judgeGapNode)
    .addNode('score_gaps', scoreNode)
    .addEdge(START, 'cluster_headlines')
    .addEdge('cluster_headlines', 'lookup_course_titles')
    .addEdge('lookup_course_titles', 'judge_gap')
    .addEdge('judge_gap', 'score_gaps')
    .addEdge('score_gaps', END);

  return graph.compile();
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1);
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  console.log(`\n🔎 Weekly gap detector — ${new Date().toISOString()}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  console.log('  fetching vendor headlines (30d window)…');
  const headlines = await fetchHeadlines();
  console.log(`  got ${headlines.length} headlines`);
  if (headlines.length < 3) { console.error('Too few headlines, aborting.'); return; }

  console.log('  loading day corpus…');
  const dayCorpus = await loadDayCorpus();
  console.log(`  ${dayCorpus.length} day files indexed`);

  console.log(`  building LangGraph state machine…`);
  const app = await buildGapGraph();

  const finalState = await app.invoke({
    headlines,
    dayCorpus,
    dayTitles: [],
    clusters: [],
    gaps: [],
    scoredGaps: [],
  });

  const clusters = finalState.clusters || [];
  const gaps     = finalState.gaps || [];
  let scored     = finalState.scoredGaps || [];

  if (!gaps.length) { console.log('\n✅ No content gaps detected. Done.\n'); return; }

  scored.sort((a, b) => b.importance - a.importance);
  const top10 = scored.slice(0, 10);
  const top3  = scored.slice(0, 3);

  if (DRY_RUN) {
    console.log('\n  Top gaps:');
    top10.forEach((g, i) => console.log(`  ${i + 1}. [I${g.importance}/N${g.novelty}/R${g.relevance} → ${g.importance}/5] ${g.title}  — ${g.score_reason}${g.suggested_day_to_add ? ` · suggest day ${g.suggested_day_to_add}` : ''}`));
  }

  // Persist (upsert by canonical_url)
  if (!DRY_RUN) {
    console.log('  upserting into content_gaps…');
    let upserted = 0;
    for (const g of scored) {
      const sources = [...new Set(g.headlines.map(h => h.source))];
      const row = {
        cluster_title: g.title,
        canonical_url: g.canonical_url,
        source_urls: sources,
        importance: g.importance,
        source_count: g.headlines.length,
      };
      const { error } = await supabase.from('content_gaps').upsert(row, { onConflict: 'canonical_url' });
      if (error) console.warn(`    ! upsert failed for ${g.title}: ${error.message}`);
      else upserted++;
    }
    console.log(`  upserted ${upserted} rows`);
  }

  // Admin digest email — top 3 (per Sprint 7 spec)
  const wk = weekLabel();
  const html = adminDigestHtml(top3, wk);
  const text = top3.map((g, i) => `${i + 1}. [I${g.impact}/N${g.novelty}/R${g.relevance}] ${g.title} (${g.headlines.length} mentions) — ${g.score_reason}${g.suggested_day_to_add ? ` · suggest day ${g.suggested_day_to_add}` : ''}`).join('\n');

  const result = await sendTemplated({
    clerkUserId: ADMIN_USER,
    to: ADMIN_EMAIL,
    kind: 'gap_digest',
    subject: `Content gaps — top ${top3.length} topics not yet covered`,
    html,
    text: `Content gaps · ${wk}\n\n${text}\n\nView: https://becomeaipm.com/gaps.html`,
    payload: { week: wk, count: top3.length, top: top3.map(g => g.title) },
    dryRun: DRY_RUN,
    supabase,
  });
  console.log(`  admin digest → ${ADMIN_EMAIL}: ${result.status}${result.error ? ' ('+result.error+')' : ''}`);

  console.log(`\n✅ done · clusters=${clusters.length} gaps=${gaps.length} top=${top3.length}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
