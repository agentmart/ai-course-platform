// api/notifications.js
// Consolidated dispatcher for 5 email/notification endpoints.
// Heavy deps (supabase, resend, jose) are loaded lazily inside the handler
// that needs them so cold-start stays small (Vercel Hobby plan).

import crypto from 'crypto';

function setJsonCors(res, methods = 'GET, POST, PUT, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ─── /api/welcome-email ──────────────────────────────────────────────────────
async function handleWelcomeEmail(req, res) {
  setJsonCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.RESEND_API_KEY) {
    return res.status(200).json({ sent: false, reason: 'email_not_configured' });
  }

  const [{ verifyClerkToken }, { createClient }, { Resend }] = await Promise.all([
    import('../lib/clerk.js'),
    import('@supabase/supabase-js'),
    import('resend'),
  ]);

  let userId, userEmail, firstName;
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
    userEmail = req.body?.email;
    firstName = req.body?.firstName || '';
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!userEmail) return res.status(400).json({ error: 'Email required' });

  let supabase;
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  } catch (e) {
    return res.status(200).json({ sent: false, reason: 'supabase_init_error' });
  }

  try {
    const { data: existing, error: dbErr } = await supabase
      .from('user_access').select('id, progress_data').eq('clerk_user_id', userId).single();
    if (dbErr && dbErr.code !== 'PGRST116') console.error('[welcome-email] db error:', dbErr);
    const completedDays = existing?.progress_data?.completed;
    if (Array.isArray(completedDays) && completedDays.length > 0) {
      return res.status(200).json({ sent: false, reason: 'existing_user' });
    }
    if (!existing) {
      await supabase.from('user_access').upsert({
        clerk_user_id: userId, email: userEmail, tier: 'free', access_level: 2,
        granted_at: new Date().toISOString(),
      }, { onConflict: 'clerk_user_id' });
    }
  } catch (e) { /* don't block */ }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const greeting = firstName ? 'Hi ' + firstName : 'Welcome';
    const html = renderWelcomeHtml(greeting);
    const result = await resend.emails.send({
      from: 'Stavan from becomeaipm <hello@becomeaipm.com>',
      to: userEmail,
      subject: 'Welcome to Become AI PM — Your 60-Day Journey Starts Now',
      html,
    });
    if (result?.error) {
      return res.status(200).json({ sent: false, reason: 'resend_error', detail: result.error.message || 'unknown' });
    }
    return res.status(200).json({ sent: true, id: result?.data?.id });
  } catch (err) {
    return res.status(200).json({ sent: false, reason: 'send_error', detail: err?.message || 'unknown' });
  }
}

function renderWelcomeHtml(greeting) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;"><div style="max-width:560px;margin:0 auto;padding:40px 24px;"><div style="text-align:center;margin-bottom:32px;"><span style="font-family:\'Courier New\',monospace;font-size:14px;letter-spacing:0.15em;color:#c8590a;font-weight:700;">becomeaipm</span></div><div style="background:#ffffff;border:1px solid #d4cdc4;border-radius:8px;padding:36px 32px;"><p style="font-size:18px;font-weight:700;color:#1a1512;margin:0 0 16px;">' + greeting + ',</p><p style="font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 16px;">Thank you for joining <strong>Become AI PM</strong>! You\'ve just taken the first step toward mastering AI Product Management. I\'m excited to have you here.</p><p style="font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 20px;">Here\'s what you get &mdash; <strong>completely free</strong>:</p><table style="width:100%;border-collapse:collapse;margin:0 0 24px;"><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#128218; 60-Day Curriculum</strong><br><span style="color:#8c7f74;font-size:13px;">Hands-on lessons covering AI/ML fundamentals, Claude, GPT-4, evals, red-teaming, and PM frameworks</span></td></tr><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#128187; 60 Code Labs</strong><br><span style="color:#8c7f74;font-size:13px;">Python &amp; JavaScript run in your browser &mdash; zero setup, no API keys needed</span></td></tr><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#127919; 240 Hands-on Tasks</strong><br><span style="color:#8c7f74;font-size:13px;">4 tasks per day to build real skills, not just theory</span></td></tr><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#128188; AI Companies &amp; Jobs</strong><br><span style="color:#8c7f74;font-size:13px;">Live directory of 240+ companies with open PM roles, updated daily</span></td></tr><tr><td style="padding:10px 14px;font-size:14px;color:#1a1512;"><strong>&#127942; Community Leaderboard</strong><br><span style="color:#8c7f74;font-size:13px;">Track your progress and see how you stack up against the community</span></td></tr></table><div style="text-align:center;margin:28px 0;"><a href="https://becomeaipm.com/course.html" style="display:inline-block;padding:14px 32px;background:#1a1512;color:#ffffff;text-decoration:none;border-radius:4px;font-size:15px;font-weight:700;">Start Day 1 &rarr;</a></div><div style="border-top:1px solid #ede8df;padding-top:20px;margin-top:24px;"><p style="font-size:14px;color:#3d3530;line-height:1.7;margin:0 0 12px;"><strong>Your feedback shapes this platform.</strong> If you find a bug or have an idea for a feature, I\'d love to hear about it:</p><ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#3d3530;line-height:2;"><li><a href="https://becomeaipm.com/contact.html" style="color:#c8590a;">Submit feedback</a> via the contact form</li><li><a href="https://github.com/orgs/agentmart/projects/1/views/1" style="color:#c8590a;">View the bug tracker</a> on GitHub</li></ul></div><div style="border-top:1px solid #ede8df;padding-top:24px;margin-top:24px;"><p style="font-size:14px;color:#1a1512;margin:0 0 4px;font-weight:600;">Stavan Mehta</p><p style="font-size:13px;color:#8c7f74;margin:0 0 4px;">Founder, becomeaipm.com</p></div></div></div></body></html>';
}

// ─── /api/send-reminders (cron) ──────────────────────────────────────────────
async function handleSendReminders(req, res) {
  setJsonCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const [{ createClient }, { Resend }] = await Promise.all([
    import('@supabase/supabase-js'),
    import('resend'),
  ]);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data: users, error } = await supabase
      .from('user_access')
      .select('id, email, progress_data, last_reminder_sent, updated_at')
      .not('progress_data', 'is', null)
      .lt('updated_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());
    if (error) throw error;

    let sent = 0, skipped = 0;
    for (const user of users || []) {
      if (!user.email) { skipped++; continue; }
      const completed = user.progress_data?.completed || [];
      if (completed.length === 0 || completed.length >= 60) { skipped++; continue; }
      if (user.last_reminder_sent &&
          Date.now() - new Date(user.last_reminder_sent).getTime() < 7*24*60*60*1000) {
        skipped++; continue;
      }
      const nextDay = completed.length + 1;
      try {
        await resend.emails.send({
          from: 'becomeaipm <reminders@becomeaipm.com>',
          to: user.email,
          subject: 'Day ' + nextDay + ' is waiting for you — Become AI PM',
          html: '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;"><p style="color:#c8590a;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Become AI PM</p><h2 style="font-size:22px;margin:12px 0;">You\'re ' + completed.length + '/60 days in — keep going!</h2><p style="font-size:15px;color:#3d3530;line-height:1.7;">It\'s been a while since your last session. Day ' + nextDay + ' is ready and waiting.</p><a href="https://becomeaipm.com/course.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1a1512;color:white;text-decoration:none;border-radius:4px;font-weight:600;">Continue Day ' + nextDay + ' &rarr;</a></div>'
        });
        await supabase.from('user_access').update({ last_reminder_sent: new Date().toISOString() }).eq('id', user.id);
        sent++;
      } catch (emailErr) {
        console.error('reminder send err for user', user.id, emailErr.message);
        skipped++;
      }
    }
    return res.status(200).json({ sent, skipped, total: (users || []).length });
  } catch (err) {
    console.error('Reminder job failed:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ─── /api/unsubscribe (HTML) ────────────────────────────────────────────────
const VALID_UNSUB_KINDS = new Set(['job_alert', 'interview_prep', 'all']);
function unsubPage({ title, heading, body }) {
  return '<!DOCTYPE html><html lang="en"><head>'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow">'
    + '<title>' + escapeHtml(title) + ' — becomeaipm</title>'
    + '<style>body{margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1512;}.wrap{max-width:560px;margin:0 auto;padding:48px 24px;}.brand{font-family:monospace;font-size:13px;letter-spacing:.15em;color:#c8590a;font-weight:700;text-align:center;margin-bottom:32px;}.card{background:#fff;border:1px solid #d4cdc4;border-radius:8px;padding:36px 32px;}h1{font-size:22px;margin:0 0 16px;}p{font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 14px;}a.btn{display:inline-block;padding:12px 24px;background:#1a1512;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;margin-top:8px;}a.lnk{color:#c8590a;}</style>'
    + '</head><body><div class="wrap"><div class="brand">becomeaipm</div>'
    + '<div class="card"><h1>' + escapeHtml(heading) + '</h1>' + body + '</div>'
    + '<p style="text-align:center;margin-top:24px;font-size:12px;color:#8c7f74;"><a class="lnk" href="/">becomeaipm.com</a></p>'
    + '</div></body></html>';
}

async function handleUnsubscribe(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(unsubPage({ title: 'Method not allowed', heading: 'Method not allowed',
      body: '<p>Use the unsubscribe link in your email.</p>' }));
  }

  const token = (req.query?.token || '').toString();
  const kind = (req.query?.kind || 'all').toString();
  if (!token || !VALID_UNSUB_KINDS.has(kind)) {
    res.statusCode = 400;
    return res.end(unsubPage({ title: 'Invalid link', heading: 'Invalid unsubscribe link',
      body: '<p>This link is malformed.</p>' }));
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: row } = await supabase
    .from('notification_prefs')
    .select('clerk_user_id,email,job_alerts_opt_in,interview_prep_opt_in')
    .eq('unsubscribe_token', token).maybeSingle();

  if (!row) {
    res.statusCode = 404;
    return res.end(unsubPage({ title: 'Link not found', heading: 'Link not found',
      body: '<p>This unsubscribe link is no longer valid.</p>' }));
  }

  const update = { updated_at: new Date().toISOString() };
  let label;
  if (kind === 'job_alert')           { update.job_alerts_opt_in = false; label = 'weekly job alerts'; }
  else if (kind === 'interview_prep') { update.interview_prep_opt_in = false; label = 'weekly interview prep'; }
  else { update.job_alerts_opt_in = false; update.interview_prep_opt_in = false; label = 'all weekly emails'; }

  const { error } = await supabase.from('notification_prefs').update(update).eq('unsubscribe_token', token);
  if (error) {
    res.statusCode = 500;
    return res.end(unsubPage({ title: 'Error', heading: 'Something went wrong',
      body: '<p>We couldn\'t update your preferences.</p>' }));
  }
  res.statusCode = 200;
  return res.end(unsubPage({
    title: 'Unsubscribed', heading: 'You\'re unsubscribed',
    body: '<p>We\'ve turned off <strong>' + escapeHtml(label) + '</strong> for <strong>' + escapeHtml(row.email) + '</strong>.</p>'
        + '<p>Re-enable anytime from your <a class="lnk" href="/settings.html">settings page</a>.</p>'
        + '<a class="btn" href="/settings.html">Manage preferences</a>',
  }));
}

// ─── /api/track-click ────────────────────────────────────────────────────────
async function handleTrackClick(req, res) {
  setJsonCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { job_posting_id, company_id, company_name, job_title, job_url, referrer_page } = req.body || {};
  if (!job_url || !company_name) return res.status(400).json({ error: 'job_url and company_name required' });

  const [{ createClient }, { verifyClerkToken }] = await Promise.all([
    import('@supabase/supabase-js'),
    import('../lib/clerk.js'),
  ]);

  let clerk_user_id = null;
  try {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const t = auth.replace('Bearer ', '');
      const payload = await verifyClerkToken(t);
      clerk_user_id = payload?.sub || null;
    }
  } catch { /* anonymous */ }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('click_events').insert({
      clerk_user_id,
      company_id: company_id || null, company_name,
      job_posting_id: job_posting_id || null,
      job_title: job_title || null, job_url,
      referrer_page: referrer_page || null,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('track-click error:', err.message);
    return res.status(200).json({ ok: true });
  }
}

// ─── /api/notification-prefs ────────────────────────────────────────────────
const ALLOWED_FILTER_KEYS = ['roles', 'locations', 'remote_only', 'seniority', 'companies'];
function sanitizeFilters(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  for (const k of ALLOWED_FILTER_KEYS) {
    if (input[k] === undefined) continue;
    if (k === 'remote_only') out[k] = !!input[k];
    else if (Array.isArray(input[k])) {
      out[k] = input[k].filter(v => typeof v === 'string').map(v => v.trim().toLowerCase()).filter(Boolean).slice(0, 50);
    }
  }
  return out;
}

async function handlePrefs(req, res) {
  setJsonCors(res, 'GET, PUT, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const [{ createClient }, { verifyClerkToken }] = await Promise.all([
    import('@supabase/supabase-js'),
    import('../lib/clerk.js'),
  ]);

  let userId, claimsEmail;
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
    claimsEmail = claims.email || null;
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let { data: row } = await supabase
    .from('notification_prefs').select('*').eq('clerk_user_id', userId).maybeSingle();

  if (!row) {
    const fallbackEmail = claimsEmail || (req.body && req.body.email) || null;
    if (!fallbackEmail) return res.status(400).json({ error: 'Email required to create prefs' });
    const insert = {
      clerk_user_id: userId, email: fallbackEmail,
      job_alerts_opt_in: false, interview_prep_opt_in: false,
      job_filters: {}, unsubscribe_token: crypto.randomBytes(24).toString('hex'),
    };
    const { data: created, error } = await supabase
      .from('notification_prefs').insert(insert).select('*').single();
    if (error) {
      console.error('[notification-prefs] insert error', error);
      return res.status(500).json({ error: 'Failed to create prefs' });
    }
    row = created;
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      email: row.email,
      job_alerts_opt_in: row.job_alerts_opt_in,
      interview_prep_opt_in: row.interview_prep_opt_in,
      job_filters: row.job_filters || {},
    });
  }

  const body = req.body || {};
  const update = { updated_at: new Date().toISOString() };
  if (typeof body.job_alerts_opt_in === 'boolean')     update.job_alerts_opt_in = body.job_alerts_opt_in;
  if (typeof body.interview_prep_opt_in === 'boolean') update.interview_prep_opt_in = body.interview_prep_opt_in;
  if (body.job_filters !== undefined)                  update.job_filters = sanitizeFilters(body.job_filters);
  if (typeof body.email === 'string' && body.email.includes('@')) update.email = body.email.trim();

  const { data: updated, error: updErr } = await supabase
    .from('notification_prefs').update(update).eq('clerk_user_id', userId).select('*').single();
  if (updErr) {
    console.error('[notification-prefs] update error', updErr);
    return res.status(500).json({ error: 'Failed to update prefs' });
  }
  return res.status(200).json({
    email: updated.email,
    job_alerts_opt_in: updated.job_alerts_opt_in,
    interview_prep_opt_in: updated.interview_prep_opt_in,
    job_filters: updated.job_filters || {},
  });
}

// ─── dispatcher ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const action = (req.query?.action || '').toString();
    switch (action) {
      case 'welcome-email':   return await handleWelcomeEmail(req, res);
      case 'send-reminders':  return await handleSendReminders(req, res);
      case 'unsubscribe':     return await handleUnsubscribe(req, res);
      case 'track-click':     return await handleTrackClick(req, res);
      case 'prefs':           return await handlePrefs(req, res);
      default:
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ error: 'Unknown action', action });
    }
  } catch (err) {
    console.error('[notifications] dispatcher error:', err?.stack || err?.message || String(err));
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ error: 'Internal error', detail: err?.message || 'unknown' });
    }
  }
}
