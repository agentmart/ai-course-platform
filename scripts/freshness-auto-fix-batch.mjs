#!/usr/bin/env node
/**
 * scripts/freshness-auto-fix-batch.mjs
 *
 * Coherent multi-issue coding agent. Given a comma-separated list of issue
 * numbers, loads each referenced day file ONCE and asks gpt-4.1 to address
 * all of that day's findings in a single coherent patch. Opens one PR that
 * closes every issue in the batch.
 *
 * Env:
 *   ISSUE_NUMBERS   = "38,39,47"
 *   GH_TOKEN        — PAT with repo + issues + pulls
 *   GH_MODELS_TOKEN — models:read token (usually GITHUB_TOKEN from the workflow)
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — pricing grounding
 *   CLUSTER_LABEL   — optional label for PR body (e.g. "day-02-pricing")
 *   DRY_RUN         — skip branch/push/PR, print diff
 */

import { readFileSync, writeFileSync } from 'fs';
import {
  gh, commentOnIssue, addLabels, chat, safeParseJson,
  resolveRedirect, parseIssueBody,
  handleUrlHealth, handleShape, handleAIPatch,
  fetchPricingGrounding,
  sh, hasChanges, configureGitUser,
  REPO, GH_TOKEN, DRY_RUN, supabase, MODELS,
} from './lib/freshness-handlers.mjs';

const ISSUE_NUMBERS = (process.env.ISSUE_NUMBERS || '')
  .split(',').map(s => parseInt(s.trim(), 10)).filter(n => n > 0);
const CLUSTER_LABEL = process.env.CLUSTER_LABEL || '';

if (!ISSUE_NUMBERS.length || !GH_TOKEN) {
  console.error('Missing ISSUE_NUMBERS or GH_TOKEN');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(`Batch fix for issues: ${ISSUE_NUMBERS.join(', ')}`);

  // 1) Fetch & parse all issues
  const issues = [];
  for (const n of ISSUE_NUMBERS) {
    const data = await gh(`/repos/${REPO}/issues/${n}`);
    const labels = (data.labels || []).map(l => l.name);
    if (!labels.includes('content-freshness')) {
      console.warn(`  #${n} not content-freshness, skipping`);
      continue;
    }
    const parsed = parseIssueBody(data.body || '');
    if (!parsed.dimension || !parsed.day) {
      await commentOnIssue(n, `❌ **Batch Auto-Fix**: Could not parse dimension/day from issue body.`);
      await addLabels(n, ['needs-human-review']);
      continue;
    }
    issues.push({ number: n, labels, ...parsed });
  }
  if (!issues.length) { console.error('No parseable freshness issues'); process.exit(1); }

  // 2) Group by day
  const byDay = new Map();
  for (const it of issues) {
    if (!byDay.has(it.day)) byDay.set(it.day, []);
    byDay.get(it.day).push(it);
  }
  console.log(`Grouped into ${byDay.size} day(s): ${[...byDay.keys()].join(', ')}`);

  for (const n of ISSUE_NUMBERS) {
    await commentOnIssue(n, `🤖 **Batch Auto-Fix**: Processing ${issues.length} findings across ${byDay.size} day file(s). This issue is part of cluster${CLUSTER_LABEL ? ` \`${CLUSTER_LABEL}\`` : ''}.`).catch(() => {});
  }

  // 3) Process each day: deterministic handlers first, then AI batch
  const dayResults = [];      // { day, filepath, applied, summary, edits, closedIssues }
  const failedIssues = [];    // issues we couldn't fix; keep open with needs-human-review

  for (const [day, dayIssues] of byDay.entries()) {
    const filepath = `public/days/day-${String(day).padStart(2, '0')}.js`;
    let src;
    try { src = readFileSync(filepath, 'utf8'); }
    catch (e) {
      console.error(`  Day ${day}: cannot read ${filepath}: ${e.message}`);
      for (const it of dayIssues) failedIssues.push({ ...it, reason: `Cannot read ${filepath}` });
      continue;
    }

    const summaries = [];
    const editsAll  = [];
    const closed    = new Set();

    // 3a) Deterministic: url-health
    for (const it of dayIssues.filter(i => i.dimension === 'url-health')) {
      const r = await handleUrlHealth(it, src);
      if (r.applied) {
        src = r.updated;
        summaries.push(r.summary);
        editsAll.push(...r.edits.map(e => ({ ...e, issue: it.number })));
        closed.add(it.number);
      } else {
        failedIssues.push({ ...it, reason: r.reason });
      }
    }

    // 3b) Deterministic: shape
    for (const it of dayIssues.filter(i => i.dimension === 'shape')) {
      const r = handleShape(it, src);
      if (r.applied) {
        src = r.updated;
        summaries.push(r.summary);
        editsAll.push(...r.edits.map(e => ({ ...e, issue: it.number })));
        closed.add(it.number);
      } else {
        failedIssues.push({ ...it, reason: r.reason });
      }
    }

    // 3c) AI-patch: pricing, policy, recency, announcement (one call per day)
    const aiIssues = dayIssues.filter(i => ['pricing', 'policy', 'recency', 'announcement'].includes(i.dimension));
    if (aiIssues.length) {
      const needsPricing = aiIssues.some(i => i.dimension === 'pricing');
      const grounding = needsPricing ? await fetchPricingGrounding() : '';
      const findings = aiIssues.map(i => ({
        dimension: i.dimension,
        severity:  i.severity,
        finding:   i.finding,
        url:       i.url,
        day:       i.day,
        issueNumber: i.number,
      }));
      const result = await handleAIPatch({ findings, src, filepath, extraContext: grounding });
      if (result.applied) {
        src = result.updated;
        summaries.push(result.summary);
        editsAll.push(...result.edits.map(e => ({ ...e, addresses: e.addresses })));
        // Close issues that were "addressed" by any edit
        const addressedIdx = new Set();
        for (const e of result.edits) for (const a of (e.addresses || [])) addressedIdx.add(a);
        aiIssues.forEach((it, i) => {
          if (addressedIdx.has(i + 1)) closed.add(it.number);
          else failedIssues.push({ ...it, reason: `Not addressed by AI edits (${result.rationale || 'unfixable'})` });
        });
      } else {
        for (const it of aiIssues) failedIssues.push({ ...it, reason: result.reason });
      }
    }

    if (summaries.length) {
      if (!DRY_RUN) writeFileSync(filepath, src);
      dayResults.push({
        day, filepath,
        summary: summaries.join(' | '),
        edits: editsAll,
        closedIssues: [...closed],
      });
    }
  }

  // 4) Mark failed issues
  for (const f of failedIssues) {
    await commentOnIssue(f.number, `⚠️ **Batch Auto-Fix**: ${f.reason}. Manual review required.`).catch(() => {});
    await addLabels(f.number, ['needs-human-review']).catch(() => {});
  }

  if (!dayResults.length) {
    console.log('No day file successfully patched — no PR to open.');
    return;
  }

  // 5) Commit + PR
  if (DRY_RUN) {
    console.log(`[dry-run] Would open PR for ${dayResults.length} day file(s):`);
    for (const d of dayResults) {
      console.log(`  ${d.filepath}: ${d.summary}`);
      console.log(`  closes: ${d.closedIssues.map(n => '#' + n).join(', ')}`);
    }
    try { console.log('\n[dry-run] Diff preview (first 3000 chars):\n' + sh('git diff').slice(0, 3000)); } catch {}
    return;
  }

  if (!hasChanges()) {
    console.log('No file changes after patching; skipping PR.');
    return;
  }

  const allClosedIssues = dayResults.flatMap(d => d.closedIssues);
  const branchTag = CLUSTER_LABEL || `batch-${allClosedIssues.slice(0, 4).join('-')}`;
  const branch = `auto-fix/${branchTag}`.replace(/[^a-zA-Z0-9._/-]/g, '-').slice(0, 80);

  configureGitUser();
  try { sh(`git checkout -b ${branch}`); }
  catch { sh(`git checkout ${branch}`); sh('git reset --hard origin/main'); }

  for (const d of dayResults) sh(`git add ${d.filepath}`);
  const commitTitle = dayResults.length === 1
    ? `fix(freshness): ${dayResults[0].summary.slice(0, 70).replace(/"/g, "'")}`
    : `fix(freshness): batch patch ${dayResults.length} day files`;
  sh(`git commit -m "${commitTitle}" -m "Closes ${allClosedIssues.map(n => '#' + n).join(' ')}"`);
  sh(`git push origin ${branch} --force-with-lease`);

  // PR body
  const daySections = dayResults.map(d => {
    const editsMd = d.edits.slice(0, 6).map(e =>
      `  - \`${(e.from || e.find || '').slice(0, 80).replace(/\n/g, ' ')}\` → \`${(e.to || e.replace || '').slice(0, 80).replace(/\n/g, ' ')}\``
    ).join('\n');
    return `### Day ${d.day} — \`${d.filepath}\`\n${d.summary}\n\n${editsMd}\n\nCloses: ${d.closedIssues.map(n => '#' + n).join(', ')}`;
  }).join('\n\n');

  const pr = await gh(`/repos/${REPO}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title: `[Freshness Batch] ${commitTitle.replace('fix(freshness): ', '')}`,
      head: branch,
      base: 'main',
      body: [
        `Automated batch fix coordinated by the planning agent.`,
        ``,
        `**Cluster:** ${CLUSTER_LABEL || '(ad-hoc)'}`,
        `**Issues closed:** ${allClosedIssues.map(n => '#' + n).join(', ')}`,
        `**Model:** ${MODELS.coding}`,
        ``,
        daySections,
        ``,
        `---`,
        `*Auto-generated by \`freshness-auto-fix-batch.mjs\`. QA agent will validate before merge.*`,
      ].join('\n'),
    }),
  });

  await gh(`/repos/${REPO}/issues/${pr.number}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels: ['needs-qa', 'auto-fix', 'content-freshness', 'batch'] }),
  });

  for (const n of allClosedIssues) {
    await commentOnIssue(n, `✅ **Batch Auto-Fix**: Opened PR #${pr.number} covering this finding + ${allClosedIssues.length - 1} related.`).catch(() => {});
  }

  console.log(`Opened PR #${pr.number} closing ${allClosedIssues.length} issues`);
}

main().catch(async (e) => {
  console.error('FATAL', e);
  for (const n of ISSUE_NUMBERS) {
    try { await commentOnIssue(n, `❌ **Batch Auto-Fix** crashed: ${e.message}`); } catch {}
  }
  process.exit(1);
});
