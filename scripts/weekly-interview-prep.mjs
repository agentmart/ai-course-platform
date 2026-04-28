#!/usr/bin/env node
/**
 * scripts/weekly-interview-prep.mjs
 *
 * Weekly: pull last 7 days of AI vendor news, ONE LLM call to generate
 * 3 fresh AI PM interview questions, broadcast to all opted-in users.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — required
 *   RESEND_API_KEY                            — required (skipped in dry run)
 *   RESEND_FROM_EMAIL                         — optional
 *   GH_MODELS_TOKEN | GITHUB_TOKEN            — required for question generation
 *   DRY_RUN=true                              — print Qs + recipients, no send, no log
 */

import { createClient } from '@supabase/supabase-js';
import { renderInterviewPrep } from './lib/email-templates.mjs';
import { sendTemplated, hashPayload } from '../lib/email.js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const TEST_EMAIL = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const MODELS_TOKEN = process.env.GH_MODELS_TOKEN || process.env.GITHUB_TOKEN || '';
const MODEL_ID = process.env.INTERVIEW_MODEL || 'openai/gpt-4.1';

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

async function generateQuestions(headlines) {
  if (!MODELS_TOKEN) throw new Error('No GH_MODELS_TOKEN/GITHUB_TOKEN — cannot call models endpoint');
  const blob = headlines.map(h => `- [${h.vendor}] ${h.headline}`).join('\n');
  const sys = 'You are an AI PM interview coach. Generate 3 distinct interview questions grounded in the past week\'s real AI industry events. Each question tests a different competency. Return strict JSON only.';
  const user = `Recent AI industry headlines (past 7 days):
${blob}

Generate exactly 3 AI Product Manager interview questions inspired by these events. Mix the competencies across the 3 questions: strategy / roadmap / prioritisation, model selection / cost / evals, safety / risk / red-teaming, GTM / positioning, org & PM craft.

Each question must:
- Be answerable in 2–4 minutes verbally.
- Reference a real shift the candidate could plausibly know from this week's news (don't invent specifics).
- Avoid trivia. Test reasoning, not recall.

For each question also write a 2–3 sentence "answer guide" that points to what a strong answer covers (frameworks, tradeoffs, signals an interviewer listens for). Plain text, no markdown.

Return JSON: {"questions":[{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."}]}`;

  const res = await fetch(MODELS_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MODELS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      max_tokens: 1500,
      temperature: 0.6,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Models ${MODEL_ID} ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  const parsed = safeParseJson(raw);
  const qs = parsed?.questions;
  if (!Array.isArray(qs) || qs.length < 3) throw new Error('Model returned no usable questions');
  return qs.slice(0, 3).map(q => ({
    question: String(q.question || '').trim(),
    answer:   String(q.answer || '').trim(),
  })).filter(q => q.question && q.answer);
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const stamp = new Date().toISOString();
  console.log(`\n🎤 Weekly interview prep — ${stamp}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  // 1. Recipients
  let usersQuery = supabase
    .from('notification_prefs')
    .select('clerk_user_id,email,unsubscribe_token')
    .eq('interview_prep_opt_in', true);
  if (TEST_EMAIL) {
    usersQuery = usersQuery.ilike('email', TEST_EMAIL);
    console.log(`  TEST_EMAIL filter: ${TEST_EMAIL}`);
  }
  const { data: users, error: uErr } = await usersQuery;
  if (uErr) { console.error('users query', uErr); process.exit(1); }
  console.log(`  ${users.length} opted-in users`);

  // 2. Headlines + ONE LLM call (even with 0 users, useful for dry runs)
  console.log('  fetching vendor headlines…');
  const headlines = await fetchHeadlines();
  console.log(`  got ${headlines.length} headlines`);
  if (!headlines.length) {
    console.error('No headlines fetched. Skipping run.');
    return;
  }

  console.log(`  generating questions via ${MODEL_ID}…`);
  let questions;
  try {
    questions = await generateQuestions(headlines);
  } catch (e) {
    if (DRY_RUN && /no_access|403/.test(e.message)) {
      console.warn(`  ⚠  ${e.message.split('\n')[0]}`);
      console.warn('  ⚠  DRY_RUN fallback: using stub questions so the template still renders.');
      console.warn('     Production cron uses the workflow GITHUB_TOKEN which has models:read scope.');
      questions = [
        { question: '[stub] How do you decide between a frontier model and a smaller model for a new feature?',
          answer: 'Stub answer guide for dry-run only. Real answer would discuss latency, cost, eval scores, and routing strategies.' },
        { question: '[stub] A vendor releases a model with 2x cheaper inference. How do you validate before switching?',
          answer: 'Stub answer guide. Real answer would cover offline eval suite, A/B test plan, regression monitors, and rollback criteria.' },
        { question: '[stub] How would you respond to a major safety incident at a peer AI lab?',
          answer: 'Stub answer guide. Real answer would address surface audit, user comms, internal policy review, and red-team coverage.' },
      ];
    } else {
      throw e;
    }
  }
  console.log(`  generated ${questions.length} questions`);
  if (DRY_RUN) {
    questions.forEach((q, i) => console.log(`\n  Q${i+1}: ${q.question}\n      → ${q.answer.slice(0,140)}…`));
  }

  if (!users.length) {
    console.log('\nNo recipients. Done.');
    return;
  }

  // 3. Broadcast (same questions to all → same payload_hash → dedupe-safe)
  const wk = weekLabel();
  const headlineSamples = headlines.slice(0, 3).map(h => `${h.vendor}: ${h.headline}`);
  const payload = { week: wk, qHash: hashPayload({ questions }) };
  let sent = 0, skipped = 0, failed = 0;

  for (const u of users) {
    const tmpl = renderInterviewPrep({
      user: { unsubscribe_token: u.unsubscribe_token },
      questions,
      weekLabel: wk,
      headlines: headlineSamples,
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
    if (result.status === 'sent')       sent++;
    else if (result.status === 'skipped') skipped++;
    else                                  failed++;
    console.log(`  · ${u.email.substring(0,3)}***  ${result.status}${result.error ? ' ('+result.error+')' : ''}`);
  }

  console.log(`\n✅ done · sent=${sent} skipped=${skipped} failed=${failed}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
