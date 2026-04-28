// lib/email.js
// Shared Resend wrapper used by all notification agents.
//
// sendTemplated() handles:
//   1. payload_hash-based dedupe (skip if same content sent to same user in the dedupe window)
//   2. calling Resend
//   3. writing notification_log row (status: sent | skipped | failed)

import crypto from 'crypto';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const FROM_DEFAULT = process.env.RESEND_FROM_EMAIL || 'becomeaipm <hello@becomeaipm.com>';
const DEDUPE_WINDOW_DAYS = 6; // weekly cadence with safety margin

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

export function hashPayload(obj) {
  // canonical JSON: sorted keys, stable for arrays
  const canonical = JSON.stringify(obj, Object.keys(obj).sort());
  return sha1(canonical);
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Send a templated email and log it. Deduplicates by (clerk_user_id, kind, payload_hash)
 * within DEDUPE_WINDOW_DAYS.
 *
 * @param {Object} args
 * @param {string} args.clerkUserId
 * @param {string} args.to              recipient email
 * @param {string} args.kind            'job_alert' | 'interview_prep' | etc
 * @param {string} args.subject
 * @param {string} args.html
 * @param {string} args.text
 * @param {Object} args.payload         logged + hashed for dedupe
 * @param {string} [args.from]          override from address
 * @param {boolean} [args.dryRun=false] if true, log nothing and skip Resend
 * @param {Object} [args.supabase]      optional injected client (otherwise built from env)
 * @returns {Promise<{status:'sent'|'skipped'|'failed', resendId?:string, reason?:string, error?:string}>}
 */
export async function sendTemplated({
  clerkUserId, to, kind, subject, html, text, payload,
  from = FROM_DEFAULT, dryRun = false, supabase: injected,
}) {
  if (!clerkUserId || !to || !kind || !subject) {
    throw new Error('sendTemplated: missing required field');
  }
  const supabase = injected || getSupabase();
  const payloadHash = hashPayload(payload || {});

  // 1. Dedupe check
  const since = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
  const { data: prior } = await supabase
    .from('notification_log')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .eq('kind', kind)
    .eq('payload_hash', payloadHash)
    .eq('status', 'sent')
    .gte('sent_at', since)
    .limit(1);

  if (prior && prior.length) {
    if (!dryRun) {
      await supabase.from('notification_log').insert({
        clerk_user_id: clerkUserId, kind, payload_hash: payloadHash,
        payload, status: 'skipped', error: 'dedupe',
      });
    }
    return { status: 'skipped', reason: 'dedupe' };
  }

  if (dryRun) {
    console.log(`[email:dry] kind=${kind} to=${to.substring(0,3)}*** subject="${subject}"`);
    return { status: 'sent', reason: 'dry_run' };
  }

  // 2. Send via Resend
  if (!process.env.RESEND_API_KEY) {
    return { status: 'failed', error: 'RESEND_API_KEY not configured' };
  }

  let resendId, errStr;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({ from, to, subject, html, text });
    if (result?.error) {
      errStr = result.error.message || JSON.stringify(result.error);
    } else {
      resendId = result?.data?.id;
    }
  } catch (e) {
    errStr = e?.message || String(e);
  }

  // 3. Log result
  const status = errStr ? 'failed' : 'sent';
  await supabase.from('notification_log').insert({
    clerk_user_id: clerkUserId, kind, payload_hash: payloadHash, payload,
    resend_id: resendId || null, status, error: errStr || null,
  });

  return errStr ? { status, error: errStr } : { status, resendId };
}

/**
 * Build an unsubscribe URL for a given pref + kind.
 * Token is the user's notification_prefs.unsubscribe_token.
 */
export function unsubscribeUrl(token, kind) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://becomeaipm.com';
  return `${base}/api/unsubscribe?token=${encodeURIComponent(token)}&kind=${encodeURIComponent(kind)}`;
}
