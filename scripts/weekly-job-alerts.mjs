#!/usr/bin/env node
/**
 * scripts/weekly-job-alerts.mjs
 *
 * Weekly digest: query opted-in users, match against the past 7 days of
 * job_postings, send top-N email per user via Resend.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — required
 *   RESEND_API_KEY                            — required (skipped in dry run)
 *   RESEND_FROM_EMAIL                         — optional
 *   NEXT_PUBLIC_APP_URL                       — used for unsubscribe links
 *   DRY_RUN=true                              — prints, no send, no log writes
 *   TOP_N=10                                  — max jobs per user (default 10)
 */

import { createClient } from '@supabase/supabase-js';
import { matchJobs }    from './lib/match-jobs.mjs';
import { renderJobAlert } from './lib/email-templates.mjs';
import { sendTemplated } from '../lib/email.js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const TOP_N   = parseInt(process.env.TOP_N || '10', 10);
const TEST_EMAIL = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const LOOKBACK_DAYS = 7;

function weekLabel(now = new Date()) {
  const start = new Date(now.getTime() - LOOKBACK_DAYS * 86400_000);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(now)}`;
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const stamp = new Date().toISOString();
  console.log(`\n📬 Weekly job alerts — ${stamp}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

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

  // 2. Recent active job postings
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString();
  const { data: jobs, error: jErr } = await supabase
    .from('job_postings')
    .select('id,company_name,title,department,location,remote,job_url,last_seen_at,ats_source')
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

  // 3. Match + send
  const wk = weekLabel();
  let sent = 0, skipped = 0, failed = 0, empty = 0;

  for (const u of users) {
    const matched = matchJobs({ job_filters: u.job_filters }, jobs, TOP_N);
    if (!matched.length) {
      empty++;
      console.log(`  · ${u.email.substring(0,3)}***  no matches`);
      continue;
    }
    const tmpl = renderJobAlert({
      user: { unsubscribe_token: u.unsubscribe_token },
      jobs: matched,
      weekLabel: wk,
    });
    const payload = { week: wk, jobIds: matched.map(j => j.id).sort() };
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
    console.log(`  · ${u.email.substring(0,3)}***  ${matched.length} matches → ${result.status}${result.error ? ' ('+result.error+')' : ''}`);
  }

  console.log(`\n✅ done · sent=${sent} skipped=${skipped} failed=${failed} no-match=${empty}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
