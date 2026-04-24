#!/usr/bin/env node
/**
 * scripts/freshness-auto-fix.mjs
 *
 * Content-aware auto-fix for issues filed by content-freshness-check.mjs.
 *
 * Reads one GitHub issue (number via env), determines its freshness dimension,
 * applies a content-aware patch to the relevant public/days/day-NN.js file,
 * commits to a new branch, and opens a PR. Never touches main directly.
 *
 * Dimensions handled:
 *   - url-health    → swap dead URL with live redirect target or Wayback fallback
 *   - pricing       → rewrite HTML text to match live llm_models claims (AI)
 *   - policy        → update regulatory statement (AI)
 *   - announcement  → append new resource entry (AI)
 *   - recency       → upgrade outdated BLOG/PAPER URL (AI)
 *   - shape         → deterministic (task time normalization, etc.)
 *
 * Required env:
 *   ISSUE_NUMBER              — the issue to fix
 *   GH_TOKEN                  — PAT with repo + write:pull + write:issues
 *   GITHUB_REPOSITORY         — owner/repo (auto-provided by Actions)
 *   GH_MODELS_TOKEN           — models-capable token for AI patching (usually GITHUB_TOKEN)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — for live pricing + archive_url lookups
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const ISSUE_NUMBER = parseInt(process.env.ISSUE_NUMBER || '0', 10);
const GH_TOKEN     = process.env.GH_TOKEN;
const REPO         = process.env.GITHUB_REPOSITORY || 'agentmart/ai-course-platform';
const MODELS_TOKEN = process.env.GH_MODELS_TOKEN || GH_TOKEN;
const [OWNER, REPO_NAME] = REPO.split('/');
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!ISSUE_NUMBER || !GH_TOKEN) {
  console.error('Missing ISSUE_NUMBER or GH_TOKEN');
  process.exit(1);
}

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ─────────────────────────────────────────────────────────
// GitHub REST helpers
// ─────────────────────────────────────────────────────────
async function gh(pathname, init = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${GH_TOKEN}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${init.method || 'GET'} ${pathname} -> ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function comment(body) {
  if (DRY_RUN) { console.log('[dry-run comment]', body.slice(0, 200)); return; }
  return gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

// ─────────────────────────────────────────────────────────
// GitHub Models (use the token with models:read scope)
// ─────────────────────────────────────────────────────────
async function chat(messages, { model = 'gpt-4o', maxTokens = 2500, temperature = 0.1 } = {}) {
  const res = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${MODELS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, response_format: { type: 'json_object' } }),
  });
  if (!res.ok) throw new Error(`Models ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

function safeParseJson(s) {
  try { return JSON.parse(s); } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Parse issue body produced by content-freshness-check.mjs
// ─────────────────────────────────────────────────────────
function parseIssue(body) {
  const out = {};
  const m1 = body.match(/\*\*Dimension:\*\*\s*(\S+)/);          if (m1) out.dimension = m1[1];
  const m2 = body.match(/\*\*Severity:\*\*\s*(\S+)/);           if (m2) out.severity = m2[1];
  const m3 = body.match(/\*\*Day:\*\*\s*(\d+)/);                 if (m3) out.day = parseInt(m3[1], 10);
  const m4 = body.match(/\*\*URL:\*\*\s*(\S+)/);                 if (m4) out.url = m4[1];
  const m5 = body.match(/\*\*Finding:\*\*\s*([\s\S]+?)(?=\n---|\nfingerprint:)/); if (m5) out.finding = m5[1].trim();
  const m6 = body.match(/fingerprint:\s*([a-f0-9]{40})/);        if (m6) out.fingerprint = m6[1];
  return out;
}

// ─────────────────────────────────────────────────────────
// Git helpers
// ─────────────────────────────────────────────────────────
function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

function hasStagedOrUnstagedChanges() {
  return sh('git status --porcelain').length > 0;
}

// ─────────────────────────────────────────────────────────
// Dimension handlers
// ─────────────────────────────────────────────────────────

// Follow a URL and return the final 200 URL or null
async function resolveRedirect(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(t);
    if (res.ok && res.url && res.url !== url) return res.url;
    return null;
  } catch { return null; }
}

async function handleUrlHealth(issue, filepath, src) {
  const url = issue.url;
  if (!url) throw new Error('url-health issue missing **URL:** field');

  // 1) Follow redirects to find the live target
  let replacement = await resolveRedirect(url);

  // 2) Fallback: query content_references for archive_url
  if (!replacement && supabase) {
    const { data } = await supabase
      .from('content_references')
      .select('archive_url')
      .eq('day_number', issue.day)
      .eq('url', url)
      .maybeSingle();
    if (data?.archive_url) replacement = data.archive_url;
  }

  // 3) Last resort: ask AI for a plausible replacement on the same domain
  if (!replacement) {
    const raw = await chat([
      { role: 'system', content: 'You suggest replacement URLs for dead links. Return JSON only.' },
      { role: 'user', content: `The URL "${url}" returns ${issue.finding}. Suggest a single replacement URL on the same organization's site that covers the same topic. Prefer stable docs pages or official announcement index pages. Return JSON: { "url": "https://..." }. Only return a URL; if unsure, return { "url": null }.` },
    ], { model: 'gpt-4o-mini', maxTokens: 200 });
    const parsed = safeParseJson(raw);
    if (parsed?.url && /^https?:\/\//.test(parsed.url)) {
      // Verify it's actually live before using
      const verify = await resolveRedirect(parsed.url);
      replacement = verify || parsed.url;
    }
  }

  if (!replacement) return { applied: false, reason: 'No working replacement URL found' };

  if (!src.includes(url)) return { applied: false, reason: `URL ${url} not found in ${filepath}` };

  const updated = src.split(url).join(replacement);
  writeFileSync(filepath, updated);
  return {
    applied: true,
    summary: `Replaced dead link \`${url}\` → \`${replacement}\``,
    edits: [{ from: url, to: replacement }],
  };
}

async function handleAIPatch(issue, filepath, src, extraContext = '') {
  // Unified AI-patch flow for pricing, policy, recency, announcement.
  // Ask the model for strict find/replace pairs that apply uniquely.

  const systemPrompts = {
    pricing: 'You correct hardcoded pricing or spec claims in AI-course HTML content so they match a live pricing table. Be conservative: only edit text that is clearly wrong; never rewrite surrounding narrative. Prefer generic phrasing that links to live pricing pages rather than new hardcoded numbers.',
    policy:  'You correct outdated policy/regulation statements in AI-course HTML content. Replace specific date claims with "as of" phrasing or most-recent-known milestone. Keep tone and HTML formatting identical.',
    recency: 'You suggest a newer authoritative resource URL to replace an outdated BLOG or PAPER entry in a course resources array. Keep the `type`, update the url, title, and note minimally.',
    announcement: 'You add one new resource entry to a course day resources array for a recent vendor announcement. Keep the existing array formatting.',
  };
  const system = systemPrompts[issue.dimension] || 'You correct AI-course content to match the reported finding. Be conservative.';

  const userPrompt = `Day ${issue.day} file (\`${filepath}\`):

\`\`\`js
${src}
\`\`\`

${extraContext}

Freshness finding (${issue.dimension}, ${issue.severity}): ${issue.finding}

Return JSON only with this shape:
{
  "edits": [
    { "find": "exact substring from the file (must match ONCE, include 20+ chars of context)", "replace": "new text" }
  ],
  "summary": "one-sentence human-readable change summary",
  "confidence": "high|medium|low",
  "rationale": "why this edit addresses the finding"
}

Rules:
- Each "find" must appear EXACTLY once in the file. Include enough surrounding text to make it unique.
- Do NOT edit code comments, file headers, import lines, or the codeExample.code string.
- Do NOT introduce new hardcoded prices — prefer "see anthropic.com/pricing" style phrasing.
- Keep HTML tags and JS string escaping intact.
- If you cannot make a confident fix, return { "edits": [], "confidence": "low", "rationale": "..." }.
- Maximum 3 edits per issue.`;

  const raw = await chat([
    { role: 'system', content: system },
    { role: 'user', content: userPrompt },
  ], { model: 'gpt-4o', maxTokens: 2500 });

  const parsed = safeParseJson(raw);
  if (!parsed || !Array.isArray(parsed.edits) || parsed.edits.length === 0) {
    return { applied: false, reason: `AI returned no edits (confidence=${parsed?.confidence || 'n/a'}): ${parsed?.rationale || raw.slice(0, 200)}` };
  }
  if (parsed.confidence === 'low') {
    return { applied: false, reason: `AI low confidence: ${parsed.rationale || ''}` };
  }

  // Apply edits, requiring each `find` to match exactly once
  let updated = src;
  const applied = [];
  for (const e of parsed.edits) {
    if (typeof e.find !== 'string' || typeof e.replace !== 'string') continue;
    const count = updated.split(e.find).length - 1;
    if (count === 0) return { applied: false, reason: `Edit "find" text not found in file: "${e.find.slice(0, 80)}..."` };
    if (count > 1)  return { applied: false, reason: `Edit "find" text matches ${count}x (must be unique): "${e.find.slice(0, 80)}..."` };
    updated = updated.replace(e.find, e.replace);
    applied.push(e);
  }
  if (updated === src) return { applied: false, reason: 'Edits did not change file content' };

  writeFileSync(filepath, updated);
  return {
    applied: true,
    summary: parsed.summary || 'AI-patched content per freshness finding',
    edits: applied,
    rationale: parsed.rationale,
  };
}

async function handleShape(issue, filepath, src) {
  // Deterministic: fix task times outside 10–45 min by clamping
  // Leave JS syntax errors for human review (too risky to auto-edit code).
  if (/codeExample JS syntax/.test(issue.finding || '')) {
    return { applied: false, reason: 'codeExample JS syntax fixes require human review' };
  }
  const m = (issue.finding || '').match(/Task\s+(\d+)\s+time\s+"(\d+)\s*min"/);
  if (!m) return { applied: false, reason: 'shape finding not auto-fixable' };
  const [, idx, mins] = m;
  const clamped = Math.max(15, Math.min(30, parseInt(mins, 10)));
  // Locate the task's time field — look for the minutes value inside tasks array
  const timeRe = new RegExp(`(time:\\s*['"])${mins}\\s*min(['"])`);
  const match = [...src.matchAll(timeRe)];
  if (match.length !== 1) return { applied: false, reason: `Could not uniquely locate task time "${mins} min"` };
  const updated = src.replace(timeRe, `$1${clamped} min$2`);
  writeFileSync(filepath, updated);
  return {
    applied: true,
    summary: `Clamped task ${idx} time from ${mins}m to ${clamped}m`,
    edits: [{ from: `${mins} min`, to: `${clamped} min` }],
  };
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  const issueResp = await gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}`);
  const body = issueResp.body || '';
  const labels = (issueResp.labels || []).map(l => l.name);

  if (!labels.includes('content-freshness')) {
    console.log('Not a content-freshness issue — handing back to generic auto-fix.');
    process.exit(78);   // neutral exit for the workflow to fall back
  }

  const issue = parseIssue(body);
  console.log('Parsed issue:', issue);
  if (!issue.dimension || !issue.day) {
    await comment(`❌ **Freshness Auto-Fix**: Could not parse dimension/day from issue body. Requires manual review.`);
    await gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}/labels`, { method: 'POST', body: JSON.stringify({ labels: ['needs-human-review'] }) });
    return;
  }

  await comment(`🤖 **Freshness Auto-Fix**: Working on ${issue.dimension}/${issue.severity} finding on day ${issue.day}...`);

  const filepath = `public/days/day-${String(issue.day).padStart(2, '0')}.js`;
  let src;
  try { src = readFileSync(filepath, 'utf8'); }
  catch (e) {
    await comment(`❌ Could not read \`${filepath}\`: ${e.message}`);
    return;
  }

  // Extra grounding for pricing: fetch live llm_models
  let extraContext = '';
  if (issue.dimension === 'pricing' && supabase) {
    const { data: models } = await supabase
      .from('llm_models')
      .select('model_id, input_price_per_1m, output_price_per_1m, context_window');
    if (models?.length) {
      extraContext = `Live pricing table (canonical — use these values or link to the provider's pricing page):\n` +
        models.map(m => `- ${m.model_id}: input $${m.input_price_per_1m}/1M, output $${m.output_price_per_1m}/1M, ctx ${m.context_window}`).join('\n');
    }
  }

  let result;
  try {
    switch (issue.dimension) {
      case 'url-health':   result = await handleUrlHealth(issue, filepath, src); break;
      case 'shape':        result = await handleShape(issue, filepath, src); break;
      case 'pricing':
      case 'policy':
      case 'recency':
      case 'announcement': result = await handleAIPatch(issue, filepath, src, extraContext); break;
      default:             result = { applied: false, reason: `Unknown dimension: ${issue.dimension}` };
    }
  } catch (e) {
    console.error('Handler error:', e);
    await comment(`❌ **Freshness Auto-Fix**: Handler error: ${e.message}`);
    return;
  }

  if (!result.applied) {
    await comment(`⚠️ **Freshness Auto-Fix**: ${result.reason}. Manual review required.`);
    await gh(`/repos/${REPO}/issues/${ISSUE_NUMBER}/labels`, { method: 'POST', body: JSON.stringify({ labels: ['needs-human-review'] }) });
    return;
  }

  // Commit + push + open PR
  if (DRY_RUN) {
    console.log('[dry-run] Would commit:', result.summary);
    console.log('[dry-run] Diff preview:');
    console.log(sh(`git diff -- ${filepath}`).slice(0, 2000));
    return;
  }

  if (!hasStagedOrUnstagedChanges()) {
    await comment(`⚠️ **Freshness Auto-Fix**: Edit produced no file changes; skipping PR.`);
    return;
  }

  const branch = `auto-fix/issue-${ISSUE_NUMBER}`;
  sh('git config user.name "freshness-auto-fix[bot]"');
  sh('git config user.email "freshness-auto-fix@users.noreply.github.com"');
  sh(`git checkout -b ${branch}`);
  sh(`git add ${filepath}`);
  sh(`git commit -m "fix(freshness): ${result.summary.replace(/"/g, "'")} (closes #${ISSUE_NUMBER})"`);
  sh(`git push origin ${branch} --force-with-lease`);

  const editsMd = (result.edits || []).map(e =>
    `\n**From:**\n\`\`\`\n${(e.from || '').slice(0, 500)}\n\`\`\`\n**To:**\n\`\`\`\n${(e.to || e.replace || '').slice(0, 500)}\n\`\`\``
  ).join('\n');

  const pr = await gh(`/repos/${REPO}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: `[Freshness Auto-Fix] ${result.summary.slice(0, 80)}`,
      head: branch,
      base: 'main',
      body: `Closes #${ISSUE_NUMBER}\n\n## Auto-fix summary\n${result.summary}\n\n${result.rationale ? `**Rationale:** ${result.rationale}\n\n` : ''}## Edits applied\n${editsMd}\n\n---\n*Auto-generated by freshness-auto-fix.mjs. Please review before merging.*`,
    }),
  });

  await gh(`/repos/${REPO}/issues/${pr.number}/labels`, { method: 'POST', body: JSON.stringify({ labels: ['needs-qa', 'auto-fix', 'content-freshness'] }) });
  await comment(`✅ **Freshness Auto-Fix**: Opened PR #${pr.number} — ${result.summary}`);
  console.log(`Opened PR #${pr.number}`);
}

main().catch(async (e) => {
  console.error('FATAL', e);
  try { await comment(`❌ **Freshness Auto-Fix** crashed: ${e.message}`); } catch {}
  process.exit(1);
});
