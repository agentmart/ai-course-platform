// api/unsubscribe.js
// GET /api/unsubscribe?token=<unsubscribe_token>&kind=<job_alert|interview_prep|all>
//
// Token-based, no auth required. Renders a styled confirmation HTML page.

import { createClient } from '@supabase/supabase-js';

const VALID_KINDS = new Set(['job_alert', 'interview_prep', 'all']);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function page({ title, heading, body }) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${escapeHtml(title)} — becomeaipm</title>
<link rel="icon" type="image/svg+xml" href="/assets/becomeaipm-mark.svg">
<style>
body{margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1512;}
.wrap{max-width:560px;margin:0 auto;padding:48px 24px;}
.brand{font-family:'Courier New',monospace;font-size:13px;letter-spacing:.15em;color:#c8590a;font-weight:700;text-align:center;margin-bottom:32px;}
.card{background:#fff;border:1px solid #d4cdc4;border-radius:8px;padding:36px 32px;}
h1{font-size:22px;margin:0 0 16px;}
p{font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 14px;}
a.btn{display:inline-block;padding:12px 24px;background:#1a1512;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;margin-top:8px;}
a.lnk{color:#c8590a;}
</style></head><body><div class="wrap">
<div class="brand">becomeaipm</div>
<div class="card"><h1>${escapeHtml(heading)}</h1>${body}</div>
<p style="text-align:center;margin-top:24px;font-size:12px;color:#8c7f74;"><a class="lnk" href="/">becomeaipm.com</a></p>
</div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end(page({ title: 'Method not allowed', heading: 'Method not allowed',
      body: '<p>Use the unsubscribe link in your email.</p>' }));
  }

  const token = (req.query?.token || '').toString();
  const kind = (req.query?.kind || 'all').toString();

  if (!token || !VALID_KINDS.has(kind)) {
    res.statusCode = 400;
    return res.end(page({ title: 'Invalid link', heading: 'Invalid unsubscribe link',
      body: '<p>This link is malformed. If you keep seeing this, reply to any email from us and we\'ll handle it manually.</p>' }));
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: row } = await supabase
    .from('notification_prefs')
    .select('clerk_user_id,email,job_alerts_opt_in,interview_prep_opt_in')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (!row) {
    res.statusCode = 404;
    return res.end(page({ title: 'Link not found', heading: 'Link not found',
      body: '<p>This unsubscribe link is no longer valid. If you\'re still receiving emails, reply to any email from us and we\'ll handle it manually.</p>' }));
  }

  const update = { updated_at: new Date().toISOString() };
  let label;
  if (kind === 'job_alert')        { update.job_alerts_opt_in = false;      label = 'weekly job alerts'; }
  else if (kind === 'interview_prep') { update.interview_prep_opt_in = false; label = 'weekly interview prep'; }
  else /* all */                   { update.job_alerts_opt_in = false;      update.interview_prep_opt_in = false; label = 'all weekly emails'; }

  const { error } = await supabase
    .from('notification_prefs')
    .update(update)
    .eq('unsubscribe_token', token);

  if (error) {
    console.error('[unsubscribe] update error', error);
    res.statusCode = 500;
    return res.end(page({ title: 'Error', heading: 'Something went wrong',
      body: '<p>We couldn\'t update your preferences. Please reply to any email from us and we\'ll handle it manually.</p>' }));
  }

  res.statusCode = 200;
  return res.end(page({
    title: 'Unsubscribed',
    heading: 'You\'re unsubscribed',
    body: `<p>We\'ve turned off <strong>${escapeHtml(label)}</strong> for <strong>${escapeHtml(row.email)}</strong>.</p>
           <p>Changed your mind? You can re-enable anytime from your <a class="lnk" href="/settings.html">settings page</a>.</p>
           <a class="btn" href="/settings.html">Manage preferences</a>`,
  }));
}
