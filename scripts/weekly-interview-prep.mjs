#!/usr/bin/env node
/**
 * scripts/weekly-interview-prep.mjs
 *
 * Weekly: pull last 7 days of AI vendor news, run a 3-node LangGraph
 * (generate_questions → extract_claims → verify_claims) to produce 3 fresh
 * AI PM interview questions whose factual claims have been sanity-checked,
 * then broadcast to all opted-in users.
 *
 * Fact-check pass:
 *   • Each candidate Q+A is decomposed into discrete factual claims.
 *   • The LLM (no internet, training-cutoff only) flags any claim it can't
 *     confirm with high confidence as `unverified` — current pricing,
 *     "latest version", "as of <date>" claims are auto-flagged.
 *   • Questions with unverified `price` or `model` claims are dropped and
 *     regenerated ONCE. After 2 attempts, fall back to a curated evergreen
 *     bank in scripts/data/interview-evergreen.json.
 *
 * LLM call budget: ≤ 12 per run (3 graph passes × ≤4 calls). 800 maxTokens
 * per call. Reads provider config via scripts/lib/llm-node.mjs (Foundry,
 * Anthropic, OpenAI). Falls back to the legacy GitHub Models endpoint if
 * no LangChain provider is configured AND a GH token is present.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — required
 *   RESEND_API_KEY                            — required (skipped in dry run)
 *   RESEND_FROM_EMAIL                         — optional
 *   AZURE_FOUNDRY_* | ANTHROPIC_API_KEY | OPENAI_API_KEY  — pick one
 *   GH_MODELS_TOKEN | GITHUB_TOKEN            — optional fallback
 *   DRY_RUN=true|1                            — print Qs + recipients, no send
 *   TEST_EMAIL=foo@bar.com                    — limit recipients to one
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { renderInterviewPrep } from './lib/email-templates.mjs';
import { sendTemplated, hashPayload } from '../lib/email.js';
import { getChatModelNode } from './lib/llm-node.mjs';

const DRY_RUN = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';
const TEST_EMAIL = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const MAX_TOKENS = 800;
const MAX_REGEN_ATTEMPTS = 2;

// Legacy fallback (only used if no LangChain provider is configured).
const MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const MODELS_TOKEN = process.env.GH_MODELS_TOKEN || process.env.GITHUB_TOKEN || '';
const MODEL_ID = process.env.INTERVIEW_MODEL || 'openai/gpt-4.1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVERGREEN_PATH = path.join(__dirname, 'data', 'interview-evergreen.json');

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

function weekLabel(now = new Date()) {
  const start = new Date(now.getTime() - 7 * 86400_000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(now)}`;
}

async function fetchHeadlines() {
  const out = [];
  await Promise.all(VENDOR_FEEDS.map(async (f) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(f.url, { signal: ctrl.signal, headers: { 'User-Agent': UA } });
      clearTimeout(t);
      if (!res.ok) return;
      const body = await res.text();
      const heads = [...body.matchAll(/<(?:h[12345]|title)[^>]*>([^<]{12,160})<\/(?:h[12345]|title)>/gi)]
        .map(m => m[1].trim().replace(/\s+/g, ' '))
        .filter(h => !/^(home|news|blog|loading|page not found)$/i.test(h))
        .slice(0, 6);
      for (const h of heads) out.push({ vendor: f.vendor, headline: h });
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

// ─── LLM call wrapper (LangChain → GH Models fallback) ─────────────────────

let _llmCallCount = 0;
function llmCallCount() { return _llmCallCount; }

async function callModel({ system, user, max_tokens = MAX_TOKENS, temperature = 0.4 }) {
  _llmCallCount++;
  try {
    const model = await getChatModelNode({ maxTokens: max_tokens, temperature });
    const res = await model.invoke([
      { role: 'system', content: system },
      { role: 'user', content: `${user}\n\nReturn ONLY a single valid JSON object. No prose, no code fences.` },
    ]);
    const content = typeof res?.content === 'string'
      ? res.content
      : Array.isArray(res?.content)
        ? res.content.map(c => (typeof c === 'string' ? c : c?.text || '')).join('')
        : '';
    return content;
  } catch (e) {
    if (!MODELS_TOKEN) throw e;
    console.warn(`  ⚠ LangChain provider unavailable (${e.message.split('\n')[0]}), falling back to GH Models`);
    const res = await fetch(MODELS_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MODELS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens, temperature,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error(`Models ${MODEL_ID} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

// ─── Graph nodes ────────────────────────────────────────────────────────────

async function generateNode(state) {
  const blob = state.headlines.map(h => `- [${h.vendor}] ${h.headline}`).join('\n');
  const sys = "You are an AI PM interview coach. Generate 3 distinct interview questions grounded in the past week's real AI industry events. Each question tests a different competency. Return strict JSON only.";
  const user = `Recent AI industry headlines (past 7 days):
${blob}

Generate exactly 3 AI Product Manager interview questions inspired by these events. Mix the competencies across the 3 questions: strategy / roadmap / prioritisation, model selection / cost / evals, safety / risk / red-teaming, GTM / positioning, org & PM craft.

Each question must:
- Be answerable in 2–4 minutes verbally.
- Reference a real shift the candidate could plausibly know from this week's news (don't invent specifics — prefer general framing over fabricated numbers).
- Avoid trivia. Test reasoning, not recall.

For each question also write a 2–3 sentence "answer guide" pointing to what a strong answer covers (frameworks, tradeoffs, signals an interviewer listens for). Plain text, no markdown.

Return JSON: {"questions":[{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."}]}`;

  const raw = await callModel({ system: sys, user, max_tokens: MAX_TOKENS, temperature: 0.6 });
  const parsed = safeParseJson(raw);
  const qs = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const candidates = qs
    .map(q => ({ question: String(q.question || '').trim(), answer: String(q.answer || '').trim() }))
    .filter(q => q.question && q.answer)
    .slice(0, 3);
  console.log(`  [graph] generate_questions → ${candidates.length} candidates (attempt ${state.attempt + 1})`);
  return { candidates, attempt: state.attempt + 1 };
}

async function extractClaimsNode(state) {
  const { candidates } = state;
  if (!candidates.length) return { claims: [] };
  const blob = candidates
    .map((q, i) => `[${i}] Q: ${q.question}\n     A: ${q.answer}`)
    .join('\n');
  const sys = 'You extract discrete factual claims from interview Q&A. A claim is anything that asserts a specific fact about the world (a price, a model name/version, a company action, a capability, a date). Subjective advice or framework names are NOT claims. Return strict JSON only.';
  const user = `For each Q&A below, list the discrete factual claims it makes. If a Q&A makes no factual claims, return an empty array for it.

${blob}

Allowed kinds: price, model, company, capability, date, other.

Return JSON: {"per_question":[{"index":0,"claims":[{"claim_text":"...","kind":"price"}, ...]}, {"index":1,"claims":[...]}, {"index":2,"claims":[...]}]}`;

  const raw = await callModel({ system: sys, user, max_tokens: MAX_TOKENS, temperature: 0 });
  const parsed = safeParseJson(raw);
  const arr = Array.isArray(parsed?.per_question) ? parsed.per_question : [];
  const claims = candidates.map((_, i) => {
    const row = arr.find(r => Number(r?.index) === i);
    const list = Array.isArray(row?.claims) ? row.claims : [];
    return list
      .map(c => ({ claim_text: String(c?.claim_text || '').trim(), kind: String(c?.kind || 'other').toLowerCase() }))
      .filter(c => c.claim_text);
  });
  const total = claims.reduce((n, l) => n + l.length, 0);
  console.log(`  [graph] extract_claims → ${total} claims across ${candidates.length} questions`);
  return { claims };
}

async function verifyClaimsNode(state) {
  const { candidates, claims } = state;
  const flat = [];
  claims.forEach((list, qi) => list.forEach((c, ci) => flat.push({ qi, ci, ...c })));
  if (!flat.length) {
    console.log('  [graph] verify_claims → no claims to verify');
    return { verifications: claims.map(list => list.map(() => ({ status: 'verified', reason: 'no claim' }))) };
  }
  const blob = flat.map((c, i) => `[${i}] (${c.kind}) ${c.claim_text}`).join('\n');
  const sys = `You are a careful fact-checker for AI industry claims. You have NO internet access — only your training knowledge. For each claim, mark it:
- "verified"   if you are highly confident it is true and stable (general well-known facts).
- "unverified" if you cannot confirm it, OR if it depends on current/latest pricing, current/latest model versions, or "as of <recent date>" facts. Auto-mark any "current price", "latest version", "as of <date in the last 12 months>" claim as unverified.
- "false"      if you are highly confident it is wrong.
Be conservative: when in doubt, mark unverified. Return strict JSON only.`;
  const user = `Claims to check:
${blob}

Return JSON: {"results":[{"index":0,"status":"verified|unverified|false","reason":"≤15 words"}, ...]}`;

  const raw = await callModel({ system: sys, user, max_tokens: MAX_TOKENS, temperature: 0 });
  const parsed = safeParseJson(raw);
  const results = Array.isArray(parsed?.results) ? parsed.results : [];
  const map = new Map(results.map(r => [Number(r?.index), r]));
  const verifications = claims.map(list => list.map(() => ({ status: 'unverified', reason: 'no verdict' })));
  flat.forEach((c, i) => {
    const v = map.get(i);
    const status = ['verified', 'unverified', 'false'].includes(v?.status) ? v.status : 'unverified';
    verifications[c.qi][c.ci] = { status, reason: String(v?.reason || '').slice(0, 120) };
  });
  const flagged = verifications.flat().filter(v => v.status !== 'verified').length;
  console.log(`  [graph] verify_claims → ${flagged}/${flat.length} flagged`);
  return { verifications };
}

// Filter: drop a question if it has any unverified claim of kind price|model,
// or any "false" claim of any kind.
function filterCandidates(candidates, claims, verifications) {
  const kept = [];
  const dropped = [];
  candidates.forEach((q, i) => {
    const qClaims = claims[i] || [];
    const qVerds  = verifications[i] || [];
    let bad = null;
    for (let j = 0; j < qClaims.length; j++) {
      const c = qClaims[j];
      const v = qVerds[j] || { status: 'unverified' };
      if (v.status === 'false') { bad = { c, v }; break; }
      if (v.status === 'unverified' && (c.kind === 'price' || c.kind === 'model')) { bad = { c, v }; break; }
    }
    if (bad) dropped.push({ q, claim: bad.c, verdict: bad.v });
    else kept.push({ q, claims: qClaims, verifications: qVerds });
  });
  return { kept, dropped };
}

// ─── LangGraph plumbing ────────────────────────────────────────────────────

async function buildInterviewGraph() {
  const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph');

  const State = Annotation.Root({
    headlines:     Annotation({ reducer: (_, n) => n, default: () => [] }),
    attempt:       Annotation({ reducer: (_, n) => n, default: () => 0 }),
    candidates:    Annotation({ reducer: (_, n) => n, default: () => [] }),
    claims:        Annotation({ reducer: (_, n) => n, default: () => [] }),
    verifications: Annotation({ reducer: (_, n) => n, default: () => [] }),
  });

  return new StateGraph(State)
    .addNode('generate_questions', generateNode)
    .addNode('extract_claims',     extractClaimsNode)
    .addNode('verify_claims',      verifyClaimsNode)
    .addEdge(START, 'generate_questions')
    .addEdge('generate_questions', 'extract_claims')
    .addEdge('extract_claims',     'verify_claims')
    .addEdge('verify_claims',      END)
    .compile();
}

function loadEvergreen() {
  try {
    const raw = fs.readFileSync(EVERGREEN_PATH, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => x?.q && x?.a) : [];
  } catch (e) {
    console.warn(`  ⚠ could not load evergreen bank: ${e.message}`);
    return [];
  }
}

function pickEvergreen(n) {
  const bank = loadEvergreen();
  if (!bank.length) return [];
  // Deterministic-ish weekly rotation: seed by ISO week.
  const now = new Date();
  const week = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400_000));
  const start = (week * n) % bank.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const item = bank[(start + i) % bank.length];
    out.push({ question: item.q, answer: item.a });
  }
  return out;
}

/**
 * Run the LangGraph up to MAX_REGEN_ATTEMPTS times. Returns:
 *   { questions, factCheck: { status, flaggedCount }, source }
 * where source ∈ {'graph', 'evergreen', 'graph+evergreen'}.
 */
async function runFactCheckedGeneration(headlines) {
  const graph = await buildInterviewGraph();
  let kept = [];
  let lastVerifications = [];
  let totalFlaggedDropped = 0;

  for (let attempt = 0; attempt < MAX_REGEN_ATTEMPTS && kept.length < 3; attempt++) {
    const result = await graph.invoke({ headlines, attempt });
    const filtered = filterCandidates(result.candidates, result.claims, result.verifications);
    console.log(`  [graph] attempt ${attempt + 1}: kept ${filtered.kept.length}, dropped ${filtered.dropped.length}`);
    totalFlaggedDropped += filtered.dropped.length;
    // Merge with anything already kept (avoid duplicate questions by text).
    const seen = new Set(kept.map(k => k.q.question.toLowerCase()));
    for (const k of filtered.kept) {
      if (!seen.has(k.q.question.toLowerCase())) {
        kept.push(k);
        seen.add(k.q.question.toLowerCase());
        if (kept.length >= 3) break;
      }
    }
    lastVerifications = result.verifications;
  }

  const questions = kept.slice(0, 3).map(k => k.q);
  const flaggedCount = kept.slice(0, 3).reduce((n, k) =>
    n + k.verifications.filter(v => v.status === 'unverified').length, 0);

  if (questions.length >= 3) {
    return {
      questions,
      factCheck: { status: flaggedCount === 0 ? 'all_verified' : 'some_flagged', flaggedCount },
      source: 'graph',
    };
  }

  // Fallback: top up from evergreen bank.
  const need = 3 - questions.length;
  console.warn(`  ⚠ only ${questions.length} fact-checked questions after ${MAX_REGEN_ATTEMPTS} attempts; topping up with ${need} evergreen.`);
  const evergreen = pickEvergreen(need);
  const finalQs = [...questions, ...evergreen].slice(0, 3);
  if (finalQs.length < 3) throw new Error('Could not produce 3 questions (graph failed and evergreen bank empty)');
  return {
    questions: finalQs,
    factCheck: { status: 'all_verified', flaggedCount: 0 },
    source: questions.length === 0 ? 'evergreen' : 'graph+evergreen',
  };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const haveSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!haveSupabase && !DRY_RUN) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = haveSupabase
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
  if (!haveSupabase) console.warn('  ⚠ DRY_RUN without Supabase creds — recipient lookup skipped.');

  const stamp = new Date().toISOString();
  console.log(`\n🎤 Weekly interview prep — ${stamp}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  // 1. Recipients
  let users = [];
  if (supabase) {
    let usersQuery = supabase
      .from('notification_prefs')
      .select('clerk_user_id,email,unsubscribe_token')
      .eq('interview_prep_opt_in', true);
    if (TEST_EMAIL) {
      usersQuery = usersQuery.ilike('email', TEST_EMAIL);
      console.log(`  TEST_EMAIL filter: ${TEST_EMAIL}`);
    }
    const { data, error: uErr } = await usersQuery;
    if (uErr) { console.error('users query', uErr); process.exit(1); }
    users = data || [];
  }
  console.log(`  ${users.length} opted-in users`);

  // 2. Headlines + LangGraph fact-checked generation (run even with 0 users
  //    so dry runs exercise the path).
  console.log('  fetching vendor headlines…');
  const headlines = await fetchHeadlines();
  console.log(`  got ${headlines.length} headlines`);
  if (!headlines.length) {
    console.error('No headlines fetched. Skipping run.');
    return;
  }

  console.log('  running LangGraph (generate → extract_claims → verify_claims)…');
  let questions, factCheck, source;
  try {
    const out = await runFactCheckedGeneration(headlines);
    questions = out.questions; factCheck = out.factCheck; source = out.source;
  } catch (e) {
    const noKey = /not configured|No LLM provider configured/i.test(e.message);
    if (noKey || (DRY_RUN && /no_access|403/.test(e.message))) {
      console.warn(`  ⚠ ${e.message.split('\n')[0]}`);
      if (!DRY_RUN) {
        // In production, fall back to evergreen rather than exit.
        console.warn('  ⚠ falling back to evergreen bank.');
        questions = pickEvergreen(3);
        factCheck = { status: 'all_verified', flaggedCount: 0 };
        source = 'evergreen';
        if (questions.length < 3) { console.error('Evergreen bank empty.'); process.exit(1); }
      } else {
        console.warn('  ⚠ DRY_RUN: cannot exercise LangGraph without LLM key. Using evergreen bank for template render.');
        questions = pickEvergreen(3).map(q => ({ question: `[evergreen] ${q.question}`, answer: q.answer }));
        factCheck = { status: 'all_verified', flaggedCount: 0 };
        source = 'evergreen';
        if (questions.length < 3) {
          console.error('No LLM key and evergreen bank empty — nothing to render.');
          process.exit(0);
        }
      }
    } else {
      throw e;
    }
  }
  console.log(`  generated ${questions.length} questions (source=${source}, llm_calls=${llmCallCount()}, flagged=${factCheck.flaggedCount})`);
  if (DRY_RUN) {
    questions.forEach((q, i) => console.log(`\n  Q${i + 1}: ${q.question}\n      → ${q.answer.slice(0, 140)}…`));
    console.log(`\n  fact-check: ${factCheck.status} (${factCheck.flaggedCount} flagged)`);
  }

  if (!users.length) {
    console.log('\nNo recipients. Done.');
    return;
  }

  // 3. Broadcast (same questions to all → same payload_hash → dedupe-safe)
  const wk = weekLabel();
  const headlineSamples = headlines.slice(0, 3).map(h => `${h.vendor}: ${h.headline}`);
  const payload = { week: wk, qHash: hashPayload({ questions }), source, factCheck };
  let sent = 0, skipped = 0, failed = 0;

  for (const u of users) {
    const tmpl = renderInterviewPrep({
      user: { unsubscribe_token: u.unsubscribe_token },
      questions,
      weekLabel: wk,
      headlines: headlineSamples,
      factCheck,
    });
    const result = await sendTemplated({
      clerkUserId: u.clerk_user_id,
      to: u.email,
      kind: 'interview_prep',
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
      payload,
      dryRun: DRY_RUN,
      supabase,
    });
    if (result.status === 'sent')         sent++;
    else if (result.status === 'skipped') skipped++;
    else                                  failed++;
    console.log(`  · ${u.email.substring(0, 3)}***  ${result.status}${result.error ? ' (' + result.error + ')' : ''}`);
  }

  console.log(`\n✅ done · sent=${sent} skipped=${skipped} failed=${failed} · llm_calls=${llmCallCount()} · source=${source}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
