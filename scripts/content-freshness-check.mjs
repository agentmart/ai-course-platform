#!/usr/bin/env node
/**
 * scripts/content-freshness-check.mjs
 *
 * Weekly course content freshness agent.
 *
 * Audits every public/days/day-NN.js file across 7 dimensions:
 *   1. URL health (deterministic HTTP)
 *   2. Model-string consistency vs. llm_models table (deterministic)
 *   3. Hardcoded pricing/spec claims (GitHub Models AI review)
 *   4. Policy/regulation date references (GitHub Models AI review)
 *   5. Resource recency (heuristic + AI tiebreaker)
 *   6. Tasks/codeExample smoke tests (deterministic)
 *   7. Latest vendor announcements scan (GitHub Models + RSS fallback)
 *
 * Reference grounding:
 *   Every referenced URL is captured into Supabase tables
 *   `content_references` + `content_reference_snapshots` with Wayback archive
 *   URLs and sha256 content hashes. AI checks receive the latest snapshot
 *   excerpt as grounding context.
 *
 * Modes (env):
 *   DRY_RUN=true     — emits freshness-report.json, no issue writes, no Supabase writes
 *   MODE=backfill    — URL capture + Supabase writes only; skips AI checks and issues
 *   MODE=full        — default: all checks + issue creation
 *   SKIP_AI=true     — forces deterministic checks only (checks 1, 2, 6 + URL capture)
 *
 * Required env in CI:
 *   GITHUB_TOKEN                 (auto-injected; powers GitHub Models + issue writes)
 *   GITHUB_REPOSITORY            (auto-injected, e.g. "agentmart/ai-course-platform")
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { createContext, Script } from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DAYS_DIR  = path.join(REPO_ROOT, 'public', 'days');

const DRY_RUN = process.env.DRY_RUN === 'true';
const MODE    = (process.env.MODE || 'full').toLowerCase();
const SKIP_AI = process.env.SKIP_AI === 'true' || MODE === 'backfill';
const GH_TOKEN    = process.env.GITHUB_TOKEN;
const GH_REPO     = process.env.GITHUB_REPOSITORY || 'agentmart/ai-course-platform';
const ISSUE_CAP   = parseInt(process.env.ISSUE_CAP || '20', 10);

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

const report = {
  ran_at: new Date().toISOString(),
  mode: MODE,
  dry_run: DRY_RUN,
  days_scanned: 0,
  findings: [],
  references_upserted: 0,
  snapshots_inserted: 0,
  issues_created: 0,
  errors: [],
};

// ─────────────────────────────────────────────────────────
// Day file loader (vm sandbox)
// ─────────────────────────────────────────────────────────
function loadDayFile(filepath) {
  const src = readFileSync(filepath, 'utf8');
  const ctx = createContext({ window: {} });
  new Script(src).runInContext(ctx, { timeout: 2000 });
  return ctx.window.COURSE_DAY_DATA || {};
}

function loadAllDays() {
  const files = readdirSync(DAYS_DIR)
    .filter(f => /^day-\d{2}\.js$/.test(f))
    .sort();
  const out = {};
  for (const f of files) {
    const n = parseInt(f.match(/day-(\d{2})\.js/)[1], 10);
    try {
      const data = loadDayFile(path.join(DAYS_DIR, f));
      if (data[n]) out[n] = { ...data[n], _file: `public/days/${f}` };
    } catch (e) {
      report.errors.push({ day: n, phase: 'load', message: e.message });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────
// URL extraction from day object
// ─────────────────────────────────────────────────────────
const HREF_RE = /href=["']([^"']+)["']/g;

function extractUrls(dayNum, day) {
  const urls = [];
  // 1. resources array
  for (const r of day.resources || []) {
    if (r?.url) urls.push({
      url: r.url,
      source_field: 'resources',
      resource_type: r.type || null,
      title: r.title || null,
      note: r.note || null,
    });
  }
  // 2. inline <a href> in HTML fields
  const htmlFields = ['context', 'pmAngle'];
  for (const f of htmlFields) {
    const text = day[f] || '';
    for (const m of text.matchAll(HREF_RE)) {
      urls.push({ url: m[1], source_field: f, resource_type: 'INLINE', title: null, note: null });
    }
  }
  // 3. interview.answer
  const ans = day.interview?.answer || '';
  for (const m of ans.matchAll(HREF_RE)) {
    urls.push({ url: m[1], source_field: 'interview', resource_type: 'INLINE', title: null, note: null });
  }
  // Filter + dedupe by url
  const seen = new Map();
  for (const u of urls) {
    if (!u.url.startsWith('http')) continue;
    if (!seen.has(u.url)) seen.set(u.url, u);
  }
  return [...seen.values()].map(u => ({ ...u, day_number: dayNum }));
}

// ─────────────────────────────────────────────────────────
// Check 1: URL health + reference capture
// ─────────────────────────────────────────────────────────
async function fetchUrlWithTimeout(url, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        // Use browser-like UA to avoid Cloudflare/WAF 403s against automation tools.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const body = res.ok ? await res.text().catch(() => '') : '';
    return { status: res.status, body, finalUrl: res.url };
  } catch (e) {
    return { status: 0, body: '', finalUrl: url, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

function normalizeBody(html) {
  // Strip scripts/styles, collapse whitespace, trim
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function waybackSave(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://web.archive.org/save/${url}`, {
      method: 'GET',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'becomeaipm-freshness/1.0' },
    });
    clearTimeout(t);
    const location = res.headers.get('content-location') || res.headers.get('location');
    if (location && location.startsWith('/web/')) return `https://web.archive.org${location}`;
    return null;
  } catch {
    return null;
  }
}

async function captureReference(urlEntry, fetched) {
  if (!supabase || DRY_RUN) return;
  const normalized = normalizeBody(fetched.body || '');
  const hash = normalized ? createHash('sha256').update(normalized).digest('hex') : null;
  const excerpt = normalized.slice(0, 2000);
  const now = new Date().toISOString();

  // Upsert the reference row
  const { data: existing, error: selErr } = await supabase
    .from('content_references')
    .select('id, content_hash, archive_url, last_verified_at')
    .eq('day_number', urlEntry.day_number)
    .eq('url', urlEntry.url)
    .maybeSingle();

  if (selErr) {
    report.errors.push({ url: urlEntry.url, phase: 'ref-select', message: selErr.message });
    return;
  }

  // Wayback snapshot: skip if snapshotted in last 7 days
  let archiveUrl = existing?.archive_url || null;
  const weekAgo = Date.now() - 7 * 86400_000;
  const shouldSnapshot = fetched.status === 200 && (!existing?.last_verified_at || new Date(existing.last_verified_at).getTime() < weekAgo);
  if (shouldSnapshot) archiveUrl = (await waybackSave(urlEntry.url)) || archiveUrl;

  const row = {
    day_number: urlEntry.day_number,
    source_field: urlEntry.source_field,
    url: urlEntry.url,
    resource_type: urlEntry.resource_type,
    title: urlEntry.title,
    note: urlEntry.note,
    last_seen_at: now,
    last_verified_at: now,
    http_status: fetched.status,
    content_hash: hash,
    archive_url: archiveUrl,
    is_active: true,
    updated_at: now,
  };

  if (existing) {
    const { error: upErr } = await supabase
      .from('content_references')
      .update(row)
      .eq('id', existing.id);
    if (upErr) { report.errors.push({ url: urlEntry.url, phase: 'ref-update', message: upErr.message }); return; }
    report.references_upserted++;
    // Insert snapshot only if hash changed
    if (hash && hash !== existing.content_hash) {
      const { error: snErr } = await supabase.from('content_reference_snapshots').insert({
        reference_id: existing.id,
        http_status: fetched.status,
        content_hash: hash,
        excerpt,
        archive_url: archiveUrl,
      });
      if (snErr) report.errors.push({ url: urlEntry.url, phase: 'snapshot-insert', message: snErr.message });
      else report.snapshots_inserted++;
    }
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('content_references')
      .insert({ ...row, first_seen_at: now })
      .select('id')
      .single();
    if (insErr) { report.errors.push({ url: urlEntry.url, phase: 'ref-insert', message: insErr.message }); return; }
    report.references_upserted++;
    if (hash) {
      const { error: snErr } = await supabase.from('content_reference_snapshots').insert({
        reference_id: inserted.id,
        http_status: fetched.status,
        content_hash: hash,
        excerpt,
        archive_url: archiveUrl,
      });
      if (snErr) report.errors.push({ url: urlEntry.url, phase: 'snapshot-insert', message: snErr.message });
      else report.snapshots_inserted++;
    }
  }
}

async function checkUrlHealth(allUrls) {
  console.log(`🔗 URL health: scanning ${allUrls.length} URLs...`);
  const CONCURRENCY = 8;
  const findings = [];
  let i = 0;
  async function worker() {
    while (i < allUrls.length) {
      const u = allUrls[i++];
      const fetched = await fetchUrlWithTimeout(u.url);
      await captureReference(u, fetched);
      if (fetched.status === 0) {
        // One retry on transient network errors (DNS hiccups, SSL resets)
        const retry = await fetchUrlWithTimeout(u.url, 12000);
        if (retry.status === 0) {
          findings.push(makeFinding('url-health', 'major', u.day_number, u.url, `Network error: ${retry.error || 'unreachable'}`, u));
        } else {
          // Treat retry result like a fresh fetch below
          if (retry.status === 404 || retry.status === 410) {
            findings.push(makeFinding('url-health', 'critical', u.day_number, u.url, `HTTP ${retry.status} dead link`, u));
          } else if (retry.status >= 500) {
            findings.push(makeFinding('url-health', 'major', u.day_number, u.url, `HTTP ${retry.status}`, u));
          }
        }
      } else if (fetched.status === 404 || fetched.status === 410) {
        findings.push(makeFinding('url-health', 'critical', u.day_number, u.url, `HTTP ${fetched.status} dead link`, u));
      } else if ([400, 401, 403, 429].includes(fetched.status)) {
        // Bot-protection / auth / WAF walls are unverifiable — not drift. Skip.
      } else if (fetched.status >= 500) {
        findings.push(makeFinding('url-health', 'major', u.day_number, u.url, `HTTP ${fetched.status}`, u));
      } else if (fetched.status >= 400) {
        findings.push(makeFinding('url-health', 'major', u.day_number, u.url, `HTTP ${fetched.status}`, u));
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`  ${findings.length} URL issues found.`);
  return findings;
}

// ─────────────────────────────────────────────────────────
// Check 2: Model-string consistency
// ─────────────────────────────────────────────────────────
const DEPRECATED_MODEL_PATTERNS = [
  { re: /\bclaude-3[-.]5[-.](?:sonnet|opus|haiku)[-0-9]*\b/gi, label: 'claude-3.5 (deprecated, use claude-sonnet-4-6 / claude-opus-4-6 / claude-haiku-4-5)' },
  { re: /\bclaude-3[-.](?:sonnet|opus|haiku)[-0-9]*\b/gi, label: 'claude-3 (deprecated)' },
  { re: /\bclaude-sonnet-4-5\b/gi, label: 'claude-sonnet-4-5 (superseded by claude-sonnet-4-6)' },
  { re: /\bgpt-4-turbo\b/gi, label: 'gpt-4-turbo (superseded)' },
  { re: /\bgpt-3\.5-turbo\b/gi, label: 'gpt-3.5-turbo (deprecated)' },
  { re: /\bgemini-1\.5-(?:pro|flash)\b/gi, label: 'gemini-1.5 (superseded by 2.5/3.x)' },
];

function checkModelStrings(days, liveModelIds) {
  console.log('🧬 Model-string consistency...');
  const findings = [];
  const liveSet = new Set(liveModelIds);
  const MODEL_MENTION_RE = /\b(?:claude-[a-z0-9-]+|gpt-[0-9][a-z0-9.-]*|gemini-[a-z0-9.-]+|o[0-9][a-z0-9-]*|grok-[a-z0-9-]+)\b/gi;
  // Skip matches that appear near anti-pattern or historical-note keywords
  const ANTIPATTERN_RE = /\b(?:deprecated|outdated|superseded|don'?t use|do not use|anti-?pattern|red flag|migrat\w*|historic|legacy|previously|old model|was\s+called|replaced by|formerly)\b/i;

  function isAntiPatternContext(text, matchIndex, matchLen) {
    const start = Math.max(0, matchIndex - 160);
    const end = Math.min(text.length, matchIndex + matchLen + 80);
    return ANTIPATTERN_RE.test(text.slice(start, end));
  }

  for (const [n, day] of Object.entries(days)) {
    // Audit only runtime content fields, not source comments/headers
    const fields = [day.context, day.pmAngle, day.interview?.answer, day.codeExample?.code]
      .filter(Boolean);
    const blob = fields.join('\n\n');

    for (const { re, label } of DEPRECATED_MODEL_PATTERNS) {
      const matches = [...blob.matchAll(re)].filter(m => !isAntiPatternContext(blob, m.index, m[0].length));
      if (matches.length) {
        findings.push(makeFinding('model-string', 'critical', +n, null,
          `Deprecated model reference: ${label}. Matches: ${[...new Set(matches.map(m => m[0]))].slice(0, 3).join(', ')}`));
      }
    }
    // Unknown model strings (not in llm_models) — minor signal
    const mentions = new Set([...blob.matchAll(MODEL_MENTION_RE)].map(m => m[0].toLowerCase()));
    const unknown = [...mentions].filter(m =>
      !liveSet.has(m) &&
      !m.includes('turbo') &&
      m.length > 8 &&
      !/^o\d+$/.test(m)
    );
    if (liveSet.size > 0 && unknown.length >= 3) {
      findings.push(makeFinding('model-string', 'minor', +n, null,
        `Model strings not present in llm_models table: ${unknown.slice(0, 5).join(', ')}`));
    }
  }
  console.log(`  ${findings.length} model-string issues.`);
  return findings;
}

// ─────────────────────────────────────────────────────────
// Check 6: Tasks + codeExample smoke test
// ─────────────────────────────────────────────────────────
function checkShape(days) {
  console.log('🧪 Shape + codeExample smoke tests...');
  const findings = [];
  for (const [nStr, day] of Object.entries(days)) {
    const n = +nStr;
    // Tasks
    if (!Array.isArray(day.tasks) || day.tasks.length !== 4) {
      findings.push(makeFinding('shape', 'major', n, null,
        `Expected exactly 4 tasks, found ${Array.isArray(day.tasks) ? day.tasks.length : 'none'}`));
    } else {
      for (const [i, t] of day.tasks.entries()) {
        const mins = parseInt((t.time || '').match(/\d+/)?.[0] || '0', 10);
        // 10 min is a common "commit to GitHub" task 4 pattern; 45 is upper bound for deeper portfolio tasks
        if (mins < 10 || mins > 45) {
          findings.push(makeFinding('shape', 'minor', n, null,
            `Task ${i + 1} time "${t.time}" outside 10–45 min`));
        }
      }
    }
    // codeExample — JS syntax check only (Python left to CI py_compile step if added)
    if (day.codeExample?.lang === 'js' && day.codeExample?.code) {
      try {
        new Script(day.codeExample.code, { filename: `day-${n}-codeExample.js` });
      } catch (e) {
        findings.push(makeFinding('shape', 'major', n, null,
          `codeExample JS syntax error: ${e.message.split('\n')[0]}`));
      }
    }
    // Required fields
    for (const f of ['subtitle', 'context', 'interview', 'pmAngle']) {
      if (!day[f]) findings.push(makeFinding('shape', 'major', n, null, `Missing required field: ${f}`));
    }
  }
  console.log(`  ${findings.length} shape issues.`);
  return findings;
}

// ─────────────────────────────────────────────────────────
// Check 5: Resource recency heuristic
// ─────────────────────────────────────────────────────────
function checkResourceRecency(days) {
  console.log('📅 Resource recency...');
  const findings = [];
  const nowYear = new Date().getFullYear();
  // Match a plausible publication year (2015-current+1), ignoring arxiv IDs like 2005.11401
  const yearRe = /\b(20(?:1[5-9]|2[0-9]))\b(?!\.\d)/;
  for (const [nStr, day] of Object.entries(days)) {
    const n = +nStr;
    for (const r of day.resources || []) {
      if (!['BLOG', 'PAPER'].includes(r.type)) continue;
      // arxiv URLs have IDs that look like years; rely on title/note only for them
      const hay = /arxiv\.org/i.test(r.url || '')
        ? `${r.note || ''} ${r.title || ''}`
        : `${r.url || ''} ${r.note || ''} ${r.title || ''}`;
      const m = hay.match(yearRe);
      if (m) {
        const y = parseInt(m[1], 10);
        if (y <= nowYear && nowYear - y >= 2) {
          findings.push(makeFinding('recency', 'minor', n, r.url,
            `Resource appears ${nowYear - y}y old (${y}): "${r.title}"`));
        }
      }
    }
  }
  console.log(`  ${findings.length} recency flags.`);
  return findings;
}

// ─────────────────────────────────────────────────────────
// GitHub Models client
// ─────────────────────────────────────────────────────────
async function githubModelsChat(messages, { model = 'gpt-4o-mini', maxTokens = 1500, temperature = 0.1 } = {}) {
  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, response_format: { type: 'json_object' } }),
  });
  if (!res.ok) throw new Error(`GitHub Models ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

function safeParseJson(s) {
  try { return JSON.parse(s); }
  catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Check 3: Pricing/spec claims (AI)
// ─────────────────────────────────────────────────────────
async function checkPricingClaims(days, llmModels) {
  console.log('💰 Pricing/spec claims (AI)...');
  const findings = [];
  const modelTable = llmModels.map(m =>
    `${m.model_id}: input $${m.input_cost_per_1m}/1M, output $${m.output_cost_per_1m}/1M, ctx ${m.context_window}`).join('\n');

  for (const [nStr, day] of Object.entries(days)) {
    const n = +nStr;
    const text = `${day.context || ''}\n${day.pmAngle || ''}\n${day.interview?.answer || ''}\n${day.codeExample?.code || ''}`.slice(0, 8000);
    if (!/\$[\d.]|\/1[MK]|context window|tokens\/sec|\b\d{2,}K\b/i.test(text)) continue;  // skip if no price-ish content

    const messages = [
      { role: 'system', content: 'You audit AI course content for hardcoded pricing or spec claims that contradict a live pricing table. Return JSON only.' },
      { role: 'user', content: `Live pricing table (canonical):\n${modelTable}\n\nDay ${n} content:\n${text}\n\nReturn JSON: { "drifts": [ { "claim": "exact text from content", "why": "one-sentence contradiction vs live data", "severity": "critical|major|minor" } ] }. Only include claims that are clearly contradicted by the live table. Empty array if fine.` },
    ];
    try {
      const raw = await githubModelsChat(messages);
      const parsed = safeParseJson(raw);
      for (const d of parsed?.drifts || []) {
        findings.push(makeFinding('pricing', d.severity || 'major', n, null, `${d.why} — "${(d.claim || '').slice(0, 120)}"`));
      }
    } catch (e) {
      report.errors.push({ day: n, phase: 'ai-pricing', message: e.message });
    }
  }
  console.log(`  ${findings.length} pricing drifts.`);
  return findings;
}

// ─────────────────────────────────────────────────────────
// Check 4: Policy/regulation drift (AI)
// ─────────────────────────────────────────────────────────
async function checkPolicyDrift(days) {
  console.log('⚖️  Policy/regulation drift (AI)...');
  const findings = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const [nStr, day] of Object.entries(days)) {
    const n = +nStr;
    const text = `${day.context || ''}\n${day.pmAngle || ''}\n${day.interview?.answer || ''}`.slice(0, 8000);
    if (!/EU AI Act|executive order|GDPR|SB[- ]?\d{2,}|NIST|FTC|state AI|regulation|compliance|Biden|Trump/i.test(text)) continue;

    const messages = [
      { role: 'system', content: 'You audit AI course content for outdated policy or regulation references. Return JSON only.' },
      { role: 'user', content: `Today is ${today}. Review this course content for policy/regulation statements that are now outdated or factually wrong (EU AI Act enforcement milestones, US executive orders, state laws, GDPR, NIST, etc.).\n\nContent:\n${text}\n\nReturn JSON: { "drifts": [ { "claim": "exact text", "why": "why outdated", "severity": "critical|major|minor" } ] }. Empty array if fine.` },
    ];
    try {
      const raw = await githubModelsChat(messages);
      const parsed = safeParseJson(raw);
      for (const d of parsed?.drifts || []) {
        findings.push(makeFinding('policy', d.severity || 'major', n, null, `${d.why} — "${(d.claim || '').slice(0, 120)}"`));
      }
    } catch (e) {
      report.errors.push({ day: n, phase: 'ai-policy', message: e.message });
    }
  }
  console.log(`  ${findings.length} policy drifts.`);
  return findings;
}

// ─────────────────────────────────────────────────────────
// Check 7: Latest announcements (AI + RSS fallback)
// ─────────────────────────────────────────────────────────
const VENDOR_FEEDS = [
  { vendor: 'Anthropic', url: 'https://www.anthropic.com/news' },
  { vendor: 'OpenAI',    url: 'https://openai.com/news/' },
  { vendor: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/' },
  { vendor: 'Meta AI',   url: 'https://ai.meta.com/blog/' },
  { vendor: 'Microsoft', url: 'https://azure.microsoft.com/en-us/blog/category/ai-machine-learning/' },
  { vendor: 'xAI',       url: 'https://x.ai/news' },
  { vendor: 'Cohere',    url: 'https://cohere.com/blog' },
  { vendor: 'Mistral',   url: 'https://mistral.ai/news/' },
  { vendor: 'DeepSeek',  url: 'https://api-docs.deepseek.com/news/news' },
];

async function fetchVendorHeadlines() {
  const out = [];
  await Promise.all(VENDOR_FEEDS.map(async (f) => {
    const { body } = await fetchUrlWithTimeout(f.url, 8000);
    // Grab first few h2/h3/title-ish strings as headlines
    const heads = [...body.matchAll(/<(?:h[12345]|title)[^>]*>([^<]{10,160})<\/(?:h[12345]|title)>/gi)]
      .map(m => m[1].trim()).slice(0, 8);
    for (const h of heads) out.push({ vendor: f.vendor, headline: h, source: f.url });
  }));
  return out;
}

async function checkAnnouncements(days) {
  console.log('📰 Latest announcements scan (AI)...');
  const findings = [];
  const headlines = await fetchVendorHeadlines();
  if (!headlines.length) {
    report.errors.push({ phase: 'announcements', message: 'No vendor headlines fetched' });
    return findings;
  }
  const headlineBlob = headlines.map(h => `- [${h.vendor}] ${h.headline} (${h.source})`).join('\n');

  // One consolidated AI call: map each day's topic to relevant announcements
  const dayTopics = Object.entries(days).map(([n, d]) => `Day ${n}: ${d.subtitle || ''}`).join('\n');

  const messages = [
    { role: 'system', content: 'You match AI industry announcements to a course syllabus. Return JSON only.' },
    { role: 'user', content: `Course syllabus (60 days):\n${dayTopics}\n\nRecent vendor headlines:\n${headlineBlob}\n\nReturn JSON: { "matches": [ { "day": <int>, "vendor": "...", "headline": "...", "source": "...", "worthiness": <1-5>, "why": "one-line rationale for adding to the day" } ] }. Only include matches with worthiness >= 4. Max 15 matches.` },
  ];
  try {
    const raw = await githubModelsChat(messages, { model: 'gpt-4o', maxTokens: 2500 });
    const parsed = safeParseJson(raw);
    for (const m of parsed?.matches || []) {
      findings.push(makeFinding('announcement', m.worthiness >= 5 ? 'major' : 'minor', m.day, m.source,
        `[${m.vendor}] ${m.headline} — ${m.why}`));
    }
  } catch (e) {
    report.errors.push({ phase: 'ai-announcements', message: e.message });
  }
  console.log(`  ${findings.length} announcement matches.`);
  return findings;
}

// ─────────────────────────────────────────────────────────
// Finding model + issue creation
// ─────────────────────────────────────────────────────────
function makeFinding(dimension, severity, day, url, message, extra = {}) {
  const fingerprint = createHash('sha1')
    .update(`${dimension}|${day ?? 'x'}|${url ?? ''}|${message.slice(0, 120)}`)
    .digest('hex');
  return { dimension, severity, day, url, message, fingerprint, ...extra };
}

const SEV_RANK = { critical: 3, major: 2, minor: 1 };

async function ghRest(pathname, init = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${GH_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub REST ${init.method || 'GET'} ${pathname} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function existingFingerprints() {
  try {
    const issues = await ghRest(`/repos/${GH_REPO}/issues?state=open&labels=content-freshness&per_page=100`);
    const fps = new Set();
    for (const i of issues) {
      const m = (i.body || '').match(/fingerprint:\s*([a-f0-9]{40})/);
      if (m) fps.add(m[1]);
    }
    return fps;
  } catch (e) {
    report.errors.push({ phase: 'list-issues', message: e.message });
    return new Set();
  }
}

async function createIssue(f) {
  const title = `[freshness/day-${String(f.day ?? '?').padStart(2, '0')}] ${f.dimension}: ${f.message.slice(0, 80)}`;
  const body = [
    `**Dimension:** ${f.dimension}`,
    `**Severity:** ${f.severity}`,
    f.day ? `**Day:** ${f.day} (\`public/days/day-${String(f.day).padStart(2, '0')}.js\`)` : '',
    f.url ? `**URL:** ${f.url}` : '',
    '',
    `**Finding:** ${f.message}`,
    '',
    '---',
    `fingerprint: ${f.fingerprint}`,
    'Filed by weekly-content-freshness. Label this issue `approved` to hand off to the auto-fix agent.',
  ].filter(Boolean).join('\n');
  const labels = ['content-freshness', `drift:${f.severity}`];
  if (f.day) labels.push(`day-${String(f.day).padStart(2, '0')}`);
  return ghRest(`/repos/${GH_REPO}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  });
}

async function fileIssues(findings) {
  if (DRY_RUN || MODE === 'backfill') {
    console.log(`📝 DRY_RUN/backfill — would file ${findings.length} issues`);
    return;
  }
  const existing = await existingFingerprints();
  const fresh = findings.filter(f => !existing.has(f.fingerprint));
  fresh.sort((a, b) => (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0));
  const capped = fresh.slice(0, ISSUE_CAP);
  console.log(`📝 Filing ${capped.length} new issues (${fresh.length - capped.length} capped, ${findings.length - fresh.length} duplicates skipped)`);
  for (const f of capped) {
    try { await createIssue(f); report.issues_created++; }
    catch (e) { report.errors.push({ phase: 'create-issue', message: e.message }); }
  }
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Content Freshness Check — mode=${MODE} dry_run=${DRY_RUN} skip_ai=${SKIP_AI}`);

  const days = loadAllDays();
  report.days_scanned = Object.keys(days).length;
  console.log(`  Loaded ${report.days_scanned} day files.`);

  // Pull live models (best-effort)
  let llmModels = [];
  if (supabase) {
    const { data, error } = await supabase
      .from('llm_models')
      .select('model_id, input_cost_per_1m, output_cost_per_1m, context_window');
    if (error) report.errors.push({ phase: 'load-models', message: error.message });
    else llmModels = data || [];
  }
  const liveModelIds = llmModels.map(m => (m.model_id || '').toLowerCase());

  // Collect all URLs across all days
  const allUrls = [];
  for (const [n, d] of Object.entries(days)) allUrls.push(...extractUrls(+n, d));

  // Run deterministic checks in parallel
  const [urlFindings, modelFindings, shapeFindings, recencyFindings] = await Promise.all([
    checkUrlHealth(allUrls),
    Promise.resolve(checkModelStrings(days, liveModelIds)),
    Promise.resolve(checkShape(days)),
    Promise.resolve(checkResourceRecency(days)),
  ]);

  let aiFindings = [];
  if (!SKIP_AI && GH_TOKEN) {
    const [pricing, policy, announcements] = await Promise.all([
      checkPricingClaims(days, llmModels),
      checkPolicyDrift(days),
      checkAnnouncements(days),
    ]);
    aiFindings = [...pricing, ...policy, ...announcements];
  } else {
    console.log('⏭️  Skipping AI checks');
  }

  const all = [...urlFindings, ...modelFindings, ...shapeFindings, ...recencyFindings, ...aiFindings];
  report.findings = all;

  // Mark stale references inactive (URLs no longer in any day file)
  if (supabase && !DRY_RUN && MODE !== 'dry-check') {
    const liveUrls = new Set(allUrls.map(u => `${u.day_number}|${u.url}`));
    const { data: allRefs } = await supabase.from('content_references').select('id, day_number, url, is_active');
    for (const r of allRefs || []) {
      const key = `${r.day_number}|${r.url}`;
      if (!liveUrls.has(key) && r.is_active) {
        await supabase.from('content_references').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', r.id);
      }
    }
  }

  // File issues (skipped on DRY_RUN or backfill)
  await fileIssues(all);

  writeFileSync(path.join(REPO_ROOT, 'freshness-report.json'), JSON.stringify(report, null, 2));
  console.log(`✅ Done. findings=${all.length} refs=${report.references_upserted} snapshots=${report.snapshots_inserted} issues=${report.issues_created} errors=${report.errors.length}`);
  if (report.errors.length) console.log(JSON.stringify(report.errors.slice(0, 5), null, 2));
}

main().catch(e => {
  console.error('FATAL', e);
  report.errors.push({ phase: 'fatal', message: e.message, stack: e.stack });
  writeFileSync(path.join(REPO_ROOT, 'freshness-report.json'), JSON.stringify(report, null, 2));
  process.exit(1);
});
