/**
 * scripts/lib/freshness-handlers.mjs
 *
 * Shared helpers for the freshness agents:
 *   - freshness-auto-fix.mjs          (single-issue runner)
 *   - freshness-auto-fix-batch.mjs    (multi-issue batch runner)
 *   - freshness-plan.mjs              (daily planner)
 *
 * All model calls go through the GitHub Models inference endpoint, using
 * publisher-prefixed IDs like "openai/gpt-4.1". Free tier, low rate limits
 * (15 RPM / 150 req/day for low-tier OpenAI).
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

// ─────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────
export const REPO         = process.env.GITHUB_REPOSITORY || 'agentmart/ai-course-platform';
export const GH_TOKEN     = process.env.GH_TOKEN;
export const MODELS_TOKEN = process.env.GH_MODELS_TOKEN || process.env.GITHUB_TOKEN || GH_TOKEN;
export const DRY_RUN      = process.env.DRY_RUN === 'true';

// GitHub Models catalog endpoint (new) — uses publisher-prefixed IDs.
export const MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';

// Role assignments — pinned here so we can swap in one place.
export const MODELS = {
  coding:  'openai/gpt-4.1',       // stronger at exact-string find/replace than gpt-4o
  planner: 'openai/gpt-4o-mini',   // cheap categorical clustering
  qa:      'openai/gpt-4o-mini',   // kept for compatibility with existing qa-validation
  urlHint: 'openai/gpt-4o-mini',   // trivial single-URL suggestion
};

export const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ─────────────────────────────────────────────────────────
// GitHub REST
// ─────────────────────────────────────────────────────────
export async function gh(pathname, init = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${GH_TOKEN}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${init.method || 'GET'} ${pathname} -> ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function commentOnIssue(issueNumber, body) {
  if (DRY_RUN) { console.log(`[dry-run comment #${issueNumber}]`, body.slice(0, 200)); return; }
  return gh(`/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function addLabels(issueNumber, labels) {
  if (DRY_RUN) { console.log(`[dry-run label #${issueNumber}]`, labels); return; }
  return gh(`/repos/${REPO}/issues/${issueNumber}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  });
}

// ─────────────────────────────────────────────────────────
// GitHub Models chat
// ─────────────────────────────────────────────────────────
export async function chat(messages, {
  role = 'coding',
  model = null,
  maxTokens = 4000,
  temperature = 0.1,
  jsonMode = true,
} = {}) {
  const resolvedModel = model || MODELS[role] || MODELS.coding;
  const body = {
    model: resolvedModel,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(MODELS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MODELS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Models ${resolvedModel} ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export function safeParseJson(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  // Strip markdown fences if model wrapped JSON.
  const m = s.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const m2 = s.match(/\{[\s\S]*\}/);
  if (m2) { try { return JSON.parse(m2[0]); } catch {} }
  return null;
}

// ─────────────────────────────────────────────────────────
// URL helpers
// ─────────────────────────────────────────────────────────
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

export async function resolveRedirect(url, timeoutMs = 10000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': BROWSER_UA },
    });
    clearTimeout(t);
    if (res.ok && res.url && res.url !== url) return res.url;
    return null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────
// Issue body parser (produced by content-freshness-check.mjs)
// ─────────────────────────────────────────────────────────
export function parseIssueBody(body) {
  const out = {};
  const grab = (re) => { const m = (body || '').match(re); return m ? m[1] : null; };
  out.dimension   = grab(/\*\*Dimension:\*\*\s*(\S+)/);
  out.severity    = grab(/\*\*Severity:\*\*\s*(\S+)/);
  const day       = grab(/\*\*Day:\*\*\s*(\d+)/);
  out.day         = day ? parseInt(day, 10) : null;
  out.url         = grab(/\*\*URL:\*\*\s*(\S+)/);
  const finding   = grab(/\*\*Finding:\*\*\s*([\s\S]+?)(?=\n---|\nfingerprint:|$)/);
  out.finding     = finding ? finding.trim() : null;
  out.fingerprint = grab(/fingerprint:\s*([a-f0-9]{40})/);
  return out;
}

// ─────────────────────────────────────────────────────────
// Dimension handlers — deterministic
// ─────────────────────────────────────────────────────────
export async function handleUrlHealth(issue, src) {
  const url = issue.url;
  if (!url) return { applied: false, reason: 'url-health finding missing **URL:**' };

  // 1) Follow redirects to find the live target.
  let replacement = await resolveRedirect(url);

  // 2) Fallback: query content_references for an archived/verified URL.
  if (!replacement && supabase) {
    const { data } = await supabase
      .from('content_references')
      .select('archive_url')
      .eq('day_number', issue.day)
      .eq('url', url)
      .maybeSingle();
    if (data?.archive_url) replacement = data.archive_url;
  }

  // 3) Last resort: AI suggestion on same domain, then verify live.
  if (!replacement) {
    try {
      const raw = await chat(
        [
          { role: 'system', content: 'You suggest replacement URLs for dead links. Return JSON only.' },
          { role: 'user', content: `The URL "${url}" returns ${issue.finding || 'an error'}. Suggest a single replacement URL on the same organization's site that covers the same topic. Prefer stable docs pages or official announcement index pages. Return JSON: { "url": "https://..." }. If unsure, return { "url": null }.` },
        ],
        { role: 'urlHint', maxTokens: 200 },
      );
      const parsed = safeParseJson(raw);
      if (parsed?.url && /^https?:\/\//.test(parsed.url)) {
        const verify = await resolveRedirect(parsed.url);
        replacement = verify || parsed.url;
      }
    } catch (e) { console.error('urlHint chat failed:', e.message); }
  }

  if (!replacement) return { applied: false, reason: 'No working replacement URL found' };
  if (!src.includes(url)) return { applied: false, reason: `URL ${url} not found in file` };

  const updated = src.split(url).join(replacement);
  return {
    applied: true,
    updated,
    summary: `Replaced dead link \`${url}\` → \`${replacement}\``,
    edits: [{ from: url, to: replacement }],
  };
}

export function handleShape(issue, src) {
  if (/codeExample JS syntax/.test(issue.finding || '')) {
    return { applied: false, reason: 'codeExample JS syntax fixes require human review' };
  }
  const m = (issue.finding || '').match(/Task\s+(\d+)\s+time\s+"(\d+)\s*min"/);
  if (!m) return { applied: false, reason: 'shape finding not auto-fixable' };
  const [, idx, mins] = m;
  const clamped = Math.max(15, Math.min(30, parseInt(mins, 10)));
  const timeRe = new RegExp(`(time:\\s*['"])${mins}\\s*min(['"])`);
  const matches = [...src.matchAll(timeRe)];
  if (matches.length !== 1) {
    return { applied: false, reason: `Could not uniquely locate task time "${mins} min"` };
  }
  const updated = src.replace(timeRe, `$1${clamped} min$2`);
  return {
    applied: true,
    updated,
    summary: `Clamped task ${idx} time from ${mins}m to ${clamped}m`,
    edits: [{ from: `${mins} min`, to: `${clamped} min` }],
  };
}

// ─────────────────────────────────────────────────────────
// AI-patch handler (pricing/policy/recency/announcement)
// Supports SINGLE finding (original) and MULTIPLE findings for a day (batch).
// ─────────────────────────────────────────────────────────
const SYSTEM_BY_DIMENSION = {
  pricing:      'You correct hardcoded pricing or spec claims in AI-course HTML content so they match a live pricing table. Be conservative: only edit text that is clearly wrong; never rewrite surrounding narrative. Prefer generic phrasing that links to live pricing pages rather than new hardcoded numbers. Preserve HTML tags, JS string escaping, and the surrounding story flow.',
  policy:       'You correct outdated policy/regulation statements in AI-course HTML content. Replace specific date claims with "as of" phrasing or most-recent-known milestone. Keep tone and HTML formatting identical.',
  recency:      'You replace outdated BLOG or PAPER resource entries with newer authoritative URLs. Keep the `type`, update `url`, `title`, and `note` minimally.',
  announcement: 'You add one new resource entry to a course day resources array for a recent vendor announcement. Keep existing array formatting.',
  mixed:        'You correct multiple freshness issues in a single AI-course day file. Preserve narrative flow across edits — they should read as coherent revisions, not isolated patches. Be conservative; never rewrite surrounding text that is not part of a finding. Preserve HTML tags, JS string escaping.',
};

export async function handleAIPatch({ findings, src, filepath, extraContext = '', model = null }) {
  // `findings` is an array of { dimension, severity, finding, url?, day, issueNumber }
  if (!findings.length) return { applied: false, reason: 'No AI-patchable findings' };

  const uniqDims = [...new Set(findings.map(f => f.dimension))];
  const systemKey = uniqDims.length === 1 ? uniqDims[0] : 'mixed';
  const system = SYSTEM_BY_DIMENSION[systemKey] || SYSTEM_BY_DIMENSION.mixed;

  const findingsBlock = findings.map((f, i) =>
    `  ${i + 1}. [${f.dimension}/${f.severity}${f.issueNumber ? ` • issue #${f.issueNumber}` : ''}] ${f.finding}`
  ).join('\n');

  const userPrompt = `<file path="${filepath}">
${src}
</file>

${extraContext ? `<grounding>\n${extraContext}\n</grounding>\n\n` : ''}<findings>
${findingsBlock}
</findings>

Return JSON only with this shape:
{
  "edits": [
    { "find": "exact substring from the file (must match ONCE, include 30+ chars of context)", "replace": "new text", "addresses": [1, 2] }
  ],
  "summary": "one-sentence human-readable change summary",
  "confidence": "high|medium|low",
  "rationale": "why these edits address the findings",
  "unfixable": [{ "finding_index": 3, "reason": "..." }]
}

Rules:
- Each "find" MUST appear exactly once in the file. Include enough surrounding text to make it unique.
- Do NOT edit code comments that start with //, import lines, or the raw codeExample.code string (you may edit codeExample.title or prose around it).
- Do NOT introduce new hardcoded prices — prefer "see anthropic.com/pricing" style phrasing.
- Keep HTML tags and JS string escaping intact.
- If a finding cannot be confidently fixed, list it in "unfixable" and omit its edit.
- "addresses" is a 1-based array of finding numbers this edit resolves.
- Maximum 8 edits per response.
- If you cannot make ANY confident fix, return { "edits": [], "confidence": "low", "rationale": "..." }.`;

  const raw = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt },
    ],
    { role: 'coding', model, maxTokens: 4000 },
  );

  const parsed = safeParseJson(raw);
  if (!parsed || !Array.isArray(parsed.edits)) {
    return { applied: false, reason: `AI returned no parseable JSON: ${(raw || '').slice(0, 200)}` };
  }
  if (parsed.confidence === 'low' || parsed.edits.length === 0) {
    return { applied: false, reason: `AI low/no-confidence: ${parsed.rationale || ''}`, unfixable: parsed.unfixable };
  }

  // Apply edits; each `find` must match exactly once.
  let updated = src;
  const applied = [];
  const skipped = [];
  for (const e of parsed.edits) {
    if (typeof e.find !== 'string' || typeof e.replace !== 'string') {
      skipped.push({ edit: e, reason: 'malformed find/replace' });
      continue;
    }
    const count = updated.split(e.find).length - 1;
    if (count === 0) {
      skipped.push({ edit: e, reason: `"find" text not present (${e.find.slice(0, 60)}...)` });
      continue;
    }
    if (count > 1) {
      skipped.push({ edit: e, reason: `"find" matches ${count}x, must be unique (${e.find.slice(0, 60)}...)` });
      continue;
    }
    updated = updated.replace(e.find, e.replace);
    applied.push(e);
  }

  if (applied.length === 0) {
    return {
      applied: false,
      reason: `All proposed edits rejected by unique-match check. First reason: ${skipped[0]?.reason || 'unknown'}`,
      skipped,
      unfixable: parsed.unfixable,
    };
  }

  return {
    applied: true,
    updated,
    summary: parsed.summary || 'AI-patched content per freshness findings',
    edits: applied,
    skipped,
    rationale: parsed.rationale,
    unfixable: parsed.unfixable || [],
  };
}

// ─────────────────────────────────────────────────────────
// Grounding helpers
// ─────────────────────────────────────────────────────────
export async function fetchPricingGrounding() {
  if (!supabase) return '';
  const { data: models } = await supabase
    .from('llm_models')
    .select('model_id, input_price_per_1m, output_price_per_1m, context_window');
  if (!models?.length) return '';
  return `Live pricing table (canonical — use these values or link to the provider's pricing page):\n` +
    models.map(m => `- ${m.model_id}: input $${m.input_price_per_1m}/1M, output $${m.output_price_per_1m}/1M, ctx ${m.context_window}`).join('\n');
}

// ─────────────────────────────────────────────────────────
// git
// ─────────────────────────────────────────────────────────
export function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

export function hasChanges() {
  return sh('git status --porcelain').length > 0;
}

export function configureGitUser() {
  sh('git config user.name "freshness-auto-fix[bot]"');
  sh('git config user.email "freshness-auto-fix@users.noreply.github.com"');
}
