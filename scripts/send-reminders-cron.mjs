#!/usr/bin/env node
/**
 * scripts/send-reminders-cron.mjs
 *
 * Weekly inactivity reminder — runs directly against Supabase + Resend so it
 * does not depend on hitting the public /api/send-reminders endpoint (which is
 * challenged by Cloudflare bot protection for datacenter/CI IPs).
 *
 * Ported from astro-app/src/pages/api/send-reminders.ts (behaviour parity).
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — required
 *   RESEND_API_KEY                            — required (skipped in DRY_RUN)
 *   RESEND_FROM_EMAIL                         — optional override of the From
 *   TEST_EMAIL                                — restrict pull to one address
 *   DRY_RUN=true                              — log only, no Resend, no DB write
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const DRY_RUN = process.env.DRY_RUN === 'true';
const TEST_EMAIL = (process.env.TEST_EMAIL || '').trim().toLowerCase();
const FROM = process.env.RESEND_FROM_EMAIL || 'becomeaipm <reminders@becomeaipm.com>';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function reminderEmail({ completed, nextDay }) {
  return (
    '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">' +
    '<p style="color:#c8590a;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Become AI PM</p>' +
    `<h2 style="font-size:22px;margin:12px 0;">You're ${completed}/60 days in — keep going!</h2>` +
    `<p style="font-size:15px;color:#3d3530;line-height:1.7;">It's been a while since your last session. Day ${nextDay} is ready and waiting.</p>` +
    `<a href="https://becomeaipm.com/course" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1a1512;color:white;text-decoration:none;border-radius:4px;font-weight:600;">Continue Day ${nextDay} &rarr;</a></div>`
  );
}

async function main() {
  const summary = { eligible: 0, sent: 0, skipped: 0, errors: 0 };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    console.log(JSON.stringify(summary));
    process.exit(1);
  }
  if (!DRY_RUN && !process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY (set DRY_RUN=true to test without it)');
    console.log(JSON.stringify(summary));
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const stamp = new Date().toISOString();
  console.log(`\n📨 Inactivity reminders — ${stamp}${DRY_RUN ? ' [DRY RUN]' : ''}`);
  if (TEST_EMAIL) console.log(`  TEST_EMAIL filter: ${TEST_EMAIL}`);

  const cutoff = new Date(Date.now() - WEEK_MS).toISOString();
  let query = supabase
    .from('user_access')
    .select('id, email, progress_data, last_reminder_sent, updated_at')
    .not('progress_data', 'is', null)
    .lt('updated_at', cutoff);
  if (TEST_EMAIL) query = query.ilike('email', TEST_EMAIL);

  const { data: users, error } = await query;
  if (error) {
    console.error('user_access query failed:', error.message || error);
    console.log(JSON.stringify(summary));
    process.exit(1);
  }
  summary.eligible = (users ?? []).length;
  console.log(`  ${summary.eligible} candidate row(s) older than 7 days`);

  const resend = !DRY_RUN ? new Resend(process.env.RESEND_API_KEY) : null;

  for (const user of users ?? []) {
    const masked = (user.email || '').substring(0, 3) + '***';
    if (!user.email) {
      summary.skipped++;
      continue;
    }
    const completed = Array.isArray(user.progress_data?.completed)
      ? user.progress_data.completed
      : [];
    if (completed.length === 0 || completed.length >= 60) {
      summary.skipped++;
      continue;
    }
    if (
      user.last_reminder_sent &&
      Date.now() - new Date(user.last_reminder_sent).getTime() < WEEK_MS
    ) {
      summary.skipped++;
      continue;
    }

    const nextDay = completed.length + 1;

    if (DRY_RUN) {
      console.log(`  · ${masked}  [dry] ${completed.length}/60 → Day ${nextDay}`);
      summary.sent++;
      continue;
    }

    try {
      const result = await resend.emails.send({
        from: FROM,
        to: user.email,
        subject: `Day ${nextDay} is waiting for you — Become AI PM`,
        html: reminderEmail({ completed: completed.length, nextDay }),
      });
      if (result?.error) throw new Error(result.error.message || JSON.stringify(result.error));

      const { error: upErr } = await supabase
        .from('user_access')
        .update({ last_reminder_sent: new Date().toISOString() })
        .eq('id', user.id);
      if (upErr) console.error(`  · ${masked}  last_reminder_sent update failed: ${upErr.message}`);

      summary.sent++;
      console.log(`  · ${masked}  sent (Day ${nextDay})`);
    } catch (e) {
      summary.errors++;
      summary.skipped++;
      console.error(`  · ${masked}  send failed: ${e?.message || e}`);
    }
  }

  console.log(`\n✅ done · ${JSON.stringify(summary)}\n`);
}

main().catch((e) => {
  console.error('fatal:', e);
  process.exit(1);
});
