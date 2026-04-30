#!/usr/bin/env node
/**
 * scripts/daily-nudge-cron.mjs
 *
 * Sprint 5 — daily 09:00 UTC nudge to learners who opted in but haven't
 * completed a course day in the last 24h.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — required
 *   RESEND_API_KEY                            — required (skipped in DRY_RUN)
 *   RESEND_FROM_EMAIL                         — optional override
 *   NEXT_PUBLIC_APP_URL                       — default https://becomeaipm.com
 *   TEST_EMAIL                                — restrict pull to one address
 *   DRY_RUN=true                              — log only, no Resend, no log write
 *
 * Dedupe: sha256(`${clerk_user_id}|${today_iso}|daily_nudge`) inserted into
 *         notification_log with kind='daily_nudge'. A row in the last 24h
 *         with that payload_hash short-circuits the send (re-runs are no-ops).
 */

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { unsubscribeUrl } from '../lib/email.js';

const DRY_RUN = process.env.DRY_RUN === 'true';
const TEST_EMAIL = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://becomeaipm.com';
const FROM = process.env.RESEND_FROM_EMAIL || 'becomeaipm <hello@becomeaipm.com>';

const KIND = 'daily_nudge';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Mirrors astro-app/src/lib/gamification.ts:computeStreak
function computeStreak(completionDates) {
  if (!completionDates || !completionDates.length) return 0;
  const sorted = [...new Set(completionDates)].sort().reverse();
  const today = todayIso();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z').getTime();
    const cur = new Date(sorted[i] + 'T00:00:00Z').getTime();
    if (prev - cur === 86_400_000) streak++;
    else break;
  }
  return streak;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function buildEmail({ streak, unsubscribeToken }) {
  const subject = '10 minutes today moves your AI PM streak forward 🔥';
  const courseUrl = `${APP_URL}/course.html`;
  const settingsUrl = `${APP_URL}/settings.html`;
  const unsubLink = unsubscribeToken
    ? unsubscribeUrl(unsubscribeToken, KIND)
    : settingsUrl;

  const streakLine = streak > 0
    ? `You're on a <strong>${streak}-day streak</strong>. Keep it alive — one task is enough.`
    : `Today is a great day to start a new streak. One task is enough.`;
  const streakText = streak > 0
    ? `You're on a ${streak}-day streak. Keep it alive — one task is enough.`
    : `Today is a great day to start a new streak. One task is enough.`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1512;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <span style="font-family:'Courier New',monospace;font-size:13px;letter-spacing:.15em;color:#c8590a;font-weight:700;">becomeaipm</span>
  </div>
  <div style="background:#ffffff;border:1px solid #d4cdc4;border-radius:8px;padding:28px 26px;">
    <h1 style="font-size:20px;margin:0 0 14px;color:#1a1512;">10 minutes. One step closer.</h1>
    <p style="margin:0 0 14px;line-height:1.6;font-size:15px;">${streakLine}</p>
    <p style="margin:0 0 22px;line-height:1.6;font-size:15px;color:#3a322c;">Pick up where you left off — finishing one day's task takes about 10 minutes and keeps the habit compounding.</p>
    <p style="margin:0 0 8px;text-align:center;">
      <a href="${escapeHtml(courseUrl)}" style="display:inline-block;background:#c8590a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:6px;font-size:15px;">Open today's task →</a>
    </p>
  </div>
  <div style="border-top:1px solid #ede8df;padding-top:18px;margin-top:24px;font-size:12px;color:#8c7f74;line-height:1.6;">
    <p style="margin:0 0 6px;">You're getting this because you turned on the daily nudge on <a href="${escapeHtml(settingsUrl)}" style="color:#c8590a;">becomeaipm.com</a>.</p>
    <p style="margin:0;"><a href="${escapeHtml(unsubLink)}" style="color:#8c7f74;">Turn off daily nudges</a> · <a href="${escapeHtml(settingsUrl)}" style="color:#8c7f74;">Manage preferences</a></p>
  </div>
</div></body></html>`;

  const text = [
    '10 minutes. One step closer.',
    '',
    streakText,
    '',
    "Pick up where you left off — finishing one day's task takes about 10 minutes.",
    '',
    `Open today's task: ${courseUrl}`,
    '',
    `Turn off daily nudges: ${unsubLink}`,
  ].join('\n');

  return { subject, html, text };
}

async function main() {
  const summary = {
    eligible: 0,
    sent: 0,
    skipped_completed_today: 0,
    skipped_dedupe: 0,
    errors: 0,
  };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    console.log(JSON.stringify(summary));
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const stamp = new Date().toISOString();
  const today = todayIso();
  console.log(`\n🔔 Daily nudge — ${stamp}${DRY_RUN ? ' [DRY RUN]' : ''}`);
  if (TEST_EMAIL) console.log(`  TEST_EMAIL filter: ${TEST_EMAIL}`);

  // 1. Pull opted-in users
  let usersQuery = supabase
    .from('notification_prefs')
    .select('clerk_user_id,email,unsubscribe_token')
    .eq('daily_nudge_opt_in', true)
    .not('email', 'is', null);
  if (TEST_EMAIL) usersQuery = usersQuery.ilike('email', TEST_EMAIL);

  const { data: users, error: uErr } = await usersQuery;
  if (uErr) {
    console.error('users query failed:', uErr.message || uErr);
    console.log(JSON.stringify(summary));
    process.exit(1);
  }
  summary.eligible = users.length;
  console.log(`  ${users.length} opted-in user(s)`);

  if (!users.length) {
    console.log(`\n✅ done · ${JSON.stringify(summary)}\n`);
    return;
  }

  // 2. Fetch progress_data for those users in one shot
  const ids = users.map((u) => u.clerk_user_id);
  const { data: accessRows, error: aErr } = await supabase
    .from('user_access')
    .select('clerk_user_id,progress_data')
    .in('clerk_user_id', ids);
  if (aErr) {
    console.error('user_access query failed:', aErr.message || aErr);
    console.log(JSON.stringify(summary));
    process.exit(1);
  }
  const progressById = new Map(
    (accessRows || []).map((r) => [r.clerk_user_id, r.progress_data || {}])
  );

  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const resend = !DRY_RUN && process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  // 3. Per-user evaluate + send
  for (const u of users) {
    const masked = (u.email || '').substring(0, 3) + '***';
    const progress = progressById.get(u.clerk_user_id) || {};
    const completionDates = Array.isArray(progress.completion_dates)
      ? progress.completion_dates
      : [];

    if (completionDates.includes(today)) {
      summary.skipped_completed_today++;
      console.log(`  · ${masked}  already completed today — skip`);
      continue;
    }

    const payloadHash = sha256(`${u.clerk_user_id}|${today}|${KIND}`);

    // Dedupe within last 24h
    const { data: prior, error: pErr } = await supabase
      .from('notification_log')
      .select('id')
      .eq('clerk_user_id', u.clerk_user_id)
      .eq('kind', KIND)
      .eq('payload_hash', payloadHash)
      .gte('sent_at', since24h)
      .limit(1);
    if (pErr) {
      summary.errors++;
      console.error(`  · ${masked}  dedupe lookup failed: ${pErr.message}`);
      continue;
    }
    if (prior && prior.length) {
      summary.skipped_dedupe++;
      console.log(`  · ${masked}  dedupe hit — skip`);
      continue;
    }

    const streak = computeStreak(completionDates);
    const { subject, html, text } = buildEmail({
      streak,
      unsubscribeToken: u.unsubscribe_token,
    });

    if (DRY_RUN) {
      console.log(`  · ${masked}  [dry] streak=${streak} subject="${subject}"`);
      summary.sent++;
      continue;
    }

    if (!resend) {
      summary.errors++;
      console.error(`  · ${masked}  RESEND_API_KEY missing — cannot send`);
      continue;
    }

    let resendId = null;
    let errStr = null;
    try {
      const result = await resend.emails.send({
        from: FROM,
        to: u.email,
        subject,
        html,
        text,
      });
      if (result?.error) {
        errStr = result.error.message || JSON.stringify(result.error);
      } else {
        resendId = result?.data?.id || null;
      }
    } catch (e) {
      errStr = e?.message || String(e);
    }

    const status = errStr ? 'failed' : 'sent';
    const { error: logErr } = await supabase.from('notification_log').insert({
      clerk_user_id: u.clerk_user_id,
      kind: KIND,
      payload_hash: payloadHash,
      payload: { date: today, streak },
      resend_id: resendId,
      status,
      error: errStr,
    });
    if (logErr) {
      console.error(`  · ${masked}  log insert failed: ${logErr.message}`);
    }

    if (errStr) {
      summary.errors++;
      console.error(`  · ${masked}  send failed: ${errStr}`);
    } else {
      summary.sent++;
      console.log(`  · ${masked}  sent (streak=${streak})`);
    }
  }

  console.log(`\n✅ done · ${JSON.stringify(summary)}\n`);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
