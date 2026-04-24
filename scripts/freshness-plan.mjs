#!/usr/bin/env node
/**
 * scripts/freshness-plan.mjs
 *
 * Daily planning agent. Reviews all open content-freshness issues that are
 * approved, clusters them (by day), and dispatches auto-fix.yml with a
 * comma-separated issue_numbers input per cluster so the coding agent can
 * patch related findings coherently in one PR.
 *
 * Idempotency: issues already referenced in an OPEN auto-fix PR are skipped.
 *
 * Env:
 *   GH_TOKEN         — PAT with repo + actions:write + issues:write
 *   GITHUB_REPOSITORY
 *   CLUSTER_CAP      — max issues per cluster (default 6)
 *   TRACKING_LABEL   — label to find/create tracking issue (default 'freshness-plan')
 *   DRY_RUN          — print plan, don't dispatch
 */

import {
  gh, chat, safeParseJson,
  REPO, GH_TOKEN, DRY_RUN, MODELS,
} from './lib/freshness-handlers.mjs';

const CLUSTER_CAP    = parseInt(process.env.CLUSTER_CAP || '6', 10);
const TRACKING_LABEL = process.env.TRACKING_LABEL || 'freshness-plan';

if (!GH_TOKEN) { console.error('Missing GH_TOKEN'); process.exit(1); }

// ─────────────────────────────────────────────────────────
// Step 1: gather candidate issues
// ─────────────────────────────────────────────────────────
async function fetchCandidateIssues() {
  // Open issues with BOTH 'content-freshness' and 'approved' labels.
  const q = `repo:${REPO} is:issue is:open label:content-freshness label:approved -label:needs-human-review`;
  const data = await gh(`/search/issues?q=${encodeURIComponent(q)}&per_page=100`);
  return (data.items || []).map(i => {
    const labels = (i.labels || []).map(l => l.name);
    const dayLabel = labels.find(l => /^day-\d{2}$/.test(l));
    const day = dayLabel ? parseInt(dayLabel.slice(4), 10) : null;
    return {
      number: i.number,
      title: i.title,
      day,
      labels,
      dimension: (i.title.match(/\]\s*(\w[\w-]*):/) || [])[1] || null,
    };
  });
}

// ─────────────────────────────────────────────────────────
// Step 2: find issues already referenced by open auto-fix PRs
// ─────────────────────────────────────────────────────────
async function fetchInFlightIssueNumbers() {
  const q = `repo:${REPO} is:pr is:open label:auto-fix`;
  const data = await gh(`/search/issues?q=${encodeURIComponent(q)}&per_page=100`);
  const inflight = new Set();
  for (const pr of (data.items || [])) {
    // Parse "Closes #N" from PR body
    const matches = (pr.body || '').matchAll(/(?:closes?|fixes?|resolves?)\s*#(\d+)/gi);
    for (const m of matches) inflight.add(parseInt(m[1], 10));
  }
  return inflight;
}

// ─────────────────────────────────────────────────────────
// Step 3: cluster (day-only for now)
// ─────────────────────────────────────────────────────────
function clusterByDay(issues, cap) {
  const byDay = new Map();
  for (const it of issues) {
    if (!it.day) continue;
    if (!byDay.has(it.day)) byDay.set(it.day, []);
    byDay.get(it.day).push(it);
  }
  // Split oversized day groups into chunks of `cap`
  const clusters = [];
  for (const [day, list] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    for (let i = 0; i < list.length; i += cap) {
      const chunk = list.slice(i, i + cap);
      clusters.push({
        label: `day-${String(day).padStart(2, '0')}${list.length > cap ? `-part${Math.floor(i / cap) + 1}` : ''}`,
        day,
        issues: chunk,
      });
    }
  }
  return clusters;
}

// ─────────────────────────────────────────────────────────
// Step 4: dispatch auto-fix.yml per cluster
// ─────────────────────────────────────────────────────────
async function dispatchCluster(cluster) {
  const issueNumbers = cluster.issues.map(i => i.number).join(',');
  const body = {
    ref: 'main',
    inputs: { issue_numbers: issueNumbers, cluster_label: cluster.label },
  };
  if (DRY_RUN) {
    console.log(`[dry-run dispatch] cluster=${cluster.label} issues=${issueNumbers}`);
    return { ok: true, dryRun: true };
  }
  await gh(`/repos/${REPO}/actions/workflows/auto-fix.yml/dispatches`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────
// Step 5: write tracking issue comment
// ─────────────────────────────────────────────────────────
async function findOrCreateTrackingIssue() {
  const q = `repo:${REPO} is:issue is:open label:${TRACKING_LABEL} in:title "Content Freshness — Daily Plan"`;
  const data = await gh(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`);
  if (data.items?.[0]) return data.items[0].number;
  if (DRY_RUN) return null;
  const created = await gh(`/repos/${REPO}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Content Freshness — Daily Plan',
      body: 'Pinned tracking issue. The daily freshness planning agent posts its cluster plan here each run.',
      labels: [TRACKING_LABEL],
    }),
  });
  return created.number;
}

async function postPlan(trackingIssue, clusters, skipped) {
  const when = new Date().toISOString();
  const body = [
    `### Plan — ${when}`,
    ``,
    `- **Candidates considered:** ${clusters.reduce((a, c) => a + c.issues.length, 0) + skipped.length}`,
    `- **In-flight (skipped):** ${skipped.length}${skipped.length ? ` — ${skipped.map(n => '#' + n).join(', ')}` : ''}`,
    `- **Clusters dispatched:** ${clusters.length}`,
    ``,
    clusters.length ? clusters.map(c =>
      `#### \`${c.label}\` — day ${c.day} (${c.issues.length} issue${c.issues.length === 1 ? '' : 's'})\n` +
      c.issues.map(i => `- #${i.number} ${i.dimension ? `[${i.dimension}]` : ''} ${i.title.slice(0, 80)}`).join('\n')
    ).join('\n\n') : '_No clusters to run — queue empty._',
  ].join('\n');

  if (DRY_RUN || !trackingIssue) { console.log('[dry-run tracking]\n' + body); return; }
  await gh(`/repos/${REPO}/issues/${trackingIssue}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  const [candidates, inflight] = await Promise.all([
    fetchCandidateIssues(),
    fetchInFlightIssueNumbers(),
  ]);
  console.log(`Candidates: ${candidates.length}, in-flight: ${inflight.size}`);

  const skipped = [];
  const actionable = candidates.filter(i => {
    if (inflight.has(i.number)) { skipped.push(i.number); return false; }
    return true;
  });

  const clusters = clusterByDay(actionable, CLUSTER_CAP);
  console.log(`Clusters: ${clusters.length}`);

  const trackingIssue = await findOrCreateTrackingIssue();

  // Dispatch with 20s spacing to avoid Models RPM + Actions queue races.
  for (const c of clusters) {
    await dispatchCluster(c);
    if (!DRY_RUN && clusters.length > 1) await new Promise(r => setTimeout(r, 20000));
  }

  await postPlan(trackingIssue, clusters, skipped);
  console.log('Plan complete.');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
