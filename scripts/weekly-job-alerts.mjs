#!/usr/bin/env node
/**
 * scripts/weekly-job-alerts.mjs
 *
 * Weekly digest: query opted-in users, match against the past 7 days of
 * job_postings, run an LLM screener (LangGraph) over each unique matched job
 * to confirm it's a real AI/ML PM role, then send top-N email per user.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — required
 *   RESEND_API_KEY                            — required (skipped in dry run)
 *   RESEND_FROM_EMAIL                         — optional
 *   NEXT_PUBLIC_APP_URL                       — used for unsubscribe links
 *   AZURE_FOUNDRY_API_KEY/_ENDPOINT           — preferred LLM provider
 *   ANTHROPIC_API_KEY / OPENAI_API_KEY        — fallback providers
 *   LLM_PROVIDER                              — pin a provider (foundry|anthropic|openai)
 *   DRY_RUN=true                              — prints, no send, no log writes
 *   TOP_N=10                                  — max jobs per user (default 10)
 *   SCREENER_DISABLE=1                        — bypass LLM (forwards all matches)
 *
 * CLI flags:
 *   --rescreen   ignore screener_verdict cache, re-classify every matched job
 */

import { createClient } from '@supabase/supabase-js';
import { matchJobs }    from './lib/match-jobs.mjs';
import { renderJobAlert } from './lib/email-templates.mjs';
import { sendTemplated } from '../lib/email.js';
import { buildScreener } from './lib/job-screener.mjs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const TOP_N   = parseInt(process.env.TOP_N || '10', 10);
const TEST_EMAIL = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const LOOKBACK_DAYS = 7;
const RESCREEN = process.argv.includes('--rescreen');
const SCREENER_DISABLED = process.env.SCREENER_DISABLE === '1';

function weekLabel(now = new Date()) {
  const start = new Date(now.getTime() - LOOKBACK_DAYS * 86400_000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(now)}`;
}

/**
 * Run the LangGraph screener over every unique job referenced by any user's
 * matches. Caches verdicts on job_postings.screener_verdict (unless
 * --rescreen). Mutates each job row in `jobsById` to attach `_verdict` and
 * `_forward`.
 *
 * Constraint: ≤ 1 LLM call per unique job per run.
 */
async function screenJobs({ jobsById, supabase }) {
  if (SCREENER_DISABLED) {
    for (const j of jobsById.values()) {
      j._forward = true;
      j._verdict = { is_ai_pm: true, confidence: 'high', evidence: '', role_type: 'ai_pm', model: 'screener-disabled' };
    }
    console.log(`  ⓘ screener disabled — forwarding all ${jobsById.size} jobs`);
    return { llmCalls: 0, cacheHits: 0, errors: 0 };
  }

  // Partition: cached vs needs-screening
  const toScreen = [];
  let cacheHits = 0;
  for (const j of jobsById.values()) {
    const cached = !RESCREEN && j.screener_verdict;
    if (cached && typeof cached === 'object' && cached.model && !String(cached.evidence || '').startsWith('screener-error:')) {
      j._verdict = cached;
      j._forward = !!(cached.is_ai_pm && (cached.confidence === 'high' || cached.confidence === 'medium'));
      cacheHits++;
    } else {
      toScreen.push(j);
    }
  }
  console.log(`  🔎 screener: ${cacheHits} cached, ${toScreen.length} to classify${RESCREEN ? ' (--rescreen)' : ''}`);

  if (!toScreen.length) return { llmCalls: 0, cacheHits, errors: 0 };

  let screen;
  try {
    screen = await buildScreener({ maxTokens: 500 });
  } catch (e) {
    console.error(`  ⚠  screener init failed (${e.message}). Forwarding all matches without classification.`);
    for (const j of toScreen) {
      j._forward = true;
      j._verdict = null;
    }
    return { llmCalls: 0, cacheHits, errors: toScreen.length };
  }

  let errors = 0;
  for (const j of toScreen) {
    try {
      const { verdict, forward, llmError } = await screen({
        title: j.title,
        company: j.company_name,
        description: j.description,
      });
      j._verdict = verdict;
      j._forward = forward;
      if (llmError) errors++;
      // Persist verdict (skip in dry run to avoid mutating prod state on test runs)
      if (!DRY_RUN && verdict && !llmError) {
        const { error } = await supabase
          .from('job_postings')
          .update({ screener_verdict: verdict })
          .eq('id', j.id);
        if (error) console.error(`    ⚠  cache write failed for ${j.id}: ${error.message}`);
      }
    } catch (e) {
      errors++;
      j._forward = true; // fail-open: don't drop matches on transient LLM errors
      j._verdict = null;
      console.error(`    ⚠  screen failed for ${j.id} (${j.title?.slice(0,40)}): ${e.message}`);
    }
  }
  return { llmCalls: toScreen.length, cacheHits, errors };
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const stamp = new Date().toISOString();
  console.log(`\n📬 Weekly job alerts — ${stamp}${DRY_RUN ? ' [DRY RUN]' : ''}${RESCREEN ? ' [RESCREEN]' : ''}\n`);

  // 1. Opted-in users
  let usersQuery = supabase
    .from('notification_prefs')
    .select('clerk_user_id,email,job_filters,unsubscribe_token')
    .eq('job_alerts_opt_in', true);
  if (TEST_EMAIL) {
    usersQuery = usersQuery.ilike('email', TEST_EMAIL);
    console.log(`  TEST_EMAIL filter: ${TEST_EMAIL}`);
  }
  const { data: users, error: uErr } = await usersQuery;
  if (uErr) { console.error('users query', uErr); process.exit(1); }
  console.log(`  ${users.length} opted-in users`);

  if (!users.length) {
    console.log('No recipients. Done.');
    return;
  }

  // 2. Recent active job postings (incl. JD body + cached screener verdict)
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString();
  const { data: jobs, error: jErr } = await supabase
    .from('job_postings')
    .select('id,company_name,title,department,location,remote,job_url,last_seen_at,ats_source,description,screener_verdict')
    .eq('is_active', true)
    .gte('last_seen_at', since)
    .order('last_seen_at', { ascending: false })
    .limit(2000);
  if (jErr) { console.error('jobs query', jErr); process.exit(1); }
  console.log(`  ${jobs.length} active postings in past ${LOOKBACK_DAYS} days`);

  if (!jobs.length) {
    console.log('No fresh postings this week. Skipping all sends.');
    return;
  }

  // 3. Pre-compute matches per user; collect unique job set for screening
  const perUser = users.map(u => ({
    user: u,
    matched: matchJobs({ job_filters: u.job_filters }, jobs, TOP_N * 3), // overshoot; LLM will trim
  }));
  const uniqueIds = new Set();
  const jobsById = new Map();
  for (const { matched } of perUser) {
    for (const j of matched) {
      if (!uniqueIds.has(j.id)) {
        uniqueIds.add(j.id);
        jobsById.set(j.id, j);
      }
    }
  }
  console.log(`  ${uniqueIds.size} unique matched jobs (from ${perUser.reduce((a,p)=>a+p.matched.length,0)} total user-matches)`);

  // 4. LLM screener (LangGraph: classify_role → decide)
  if (uniqueIds.size) {
    const stats = await screenJobs({ jobsById, supabase });
    const forwarded = [...jobsById.values()].filter(j => j._forward).length;
    console.log(`  ✓ screened: forward=${forwarded}/${uniqueIds.size} · llm=${stats.llmCalls} · cached=${stats.cacheHits} · errors=${stats.errors}`);
  }

  // 5. Filter user matches to forward-only, then send
  const wk = weekLabel();
  let sent = 0, skipped = 0, failed = 0, empty = 0;

  for (const { user: u, matched } of perUser) {
    const forwardable = matched
      .filter(j => {
        const jb = jobsById.get(j.id);
        return jb && jb._forward !== false; // true OR null (fail-open) passes
      })
      .slice(0, TOP_N)
      .map(j => {
        const jb = jobsById.get(j.id) || {};
        return {
          ...j,
          screener_evidence: jb._verdict?.evidence || null,
        };
      });

    if (!forwardable.length) {
      empty++;
      console.log(`  · ${u.email.substring(0,3)}***  no matches (post-screen)`);
      continue;
    }
    const tmpl = renderJobAlert({
      user: { unsubscribe_token: u.unsubscribe_token },
      jobs: forwardable,
      weekLabel: wk,
    });
    const payload = { week: wk, jobIds: forwardable.map(j => j.id).sort() };
    const result = await sendTemplated({
      clerkUserId: u.clerk_user_id,
      to: u.email,
      kind: 'job_alert',
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
    console.log(`  · ${u.email.substring(0,3)}***  ${forwardable.length} matches → ${result.status}${result.error ? ' ('+result.error+')' : ''}`);
  }

  console.log(`\n✅ done · sent=${sent} skipped=${skipped} failed=${failed} no-match=${empty}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
