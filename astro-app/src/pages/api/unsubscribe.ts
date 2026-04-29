import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin } from '~/lib/handler';

export const prerender = false;

const VALID_KINDS = new Set(['job_alert', 'interview_prep', 'all']);

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );
}

function page({ title, heading, body }: { title: string; heading: string; body: string }) {
  return (
    '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow">' +
    '<title>' +
    escapeHtml(title) +
    ' — becomeaipm</title>' +
    '<style>body{margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#1a1512;}.wrap{max-width:560px;margin:0 auto;padding:48px 24px;}.brand{font-family:monospace;font-size:13px;letter-spacing:.15em;color:#c8590a;font-weight:700;text-align:center;margin-bottom:32px;}.card{background:#fff;border:1px solid #d4cdc4;border-radius:8px;padding:36px 32px;}h1{font-size:22px;margin:0 0 16px;}p{font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 14px;}a.btn{display:inline-block;padding:12px 24px;background:#1a1512;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;margin-top:8px;}a.lnk{color:#c8590a;}</style>' +
    '</head><body><div class="wrap"><div class="brand">becomeaipm</div>' +
    '<div class="card"><h1>' +
    escapeHtml(heading) +
    '</h1>' +
    body +
    '</div>' +
    '<p style="text-align:center;margin-top:24px;font-size:12px;color:#8c7f74;"><a class="lnk" href="/">becomeaipm.com</a></p>' +
    '</div></body></html>'
  );
}

const html = (s: string, status = 200) =>
  new Response(s, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });

export const GET: APIRoute = async ({ locals, url }) => {
  const env = envFrom(locals);
  const token = url.searchParams.get('token') ?? '';
  const kind = url.searchParams.get('kind') ?? 'all';
  if (!token || !VALID_KINDS.has(kind)) {
    return html(
      page({
        title: 'Invalid link',
        heading: 'Invalid unsubscribe link',
        body: '<p>This link is malformed.</p>',
      }),
      400
    );
  }
  const supabase = getSupabaseAdmin(env);
  const { data: row } = await supabase
    .from('notification_prefs')
    .select('clerk_user_id,email,job_alerts_opt_in,interview_prep_opt_in')
    .eq('unsubscribe_token', token)
    .maybeSingle();
  if (!row) {
    return html(
      page({
        title: 'Link not found',
        heading: 'Link not found',
        body: '<p>This unsubscribe link is no longer valid.</p>',
      }),
      404
    );
  }
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  let label: string;
  if (kind === 'job_alert') {
    update.job_alerts_opt_in = false;
    label = 'weekly job alerts';
  } else if (kind === 'interview_prep') {
    update.interview_prep_opt_in = false;
    label = 'weekly interview prep';
  } else {
    update.job_alerts_opt_in = false;
    update.interview_prep_opt_in = false;
    label = 'all weekly emails';
  }
  const { error } = await supabase
    .from('notification_prefs')
    .update(update)
    .eq('unsubscribe_token', token);
  if (error) {
    return html(
      page({
        title: 'Error',
        heading: 'Something went wrong',
        body: "<p>We couldn't update your preferences.</p>",
      }),
      500
    );
  }
  return html(
    page({
      title: 'Unsubscribed',
      heading: "You're unsubscribed",
      body:
        '<p>We&rsquo;ve turned off <strong>' +
        escapeHtml(label) +
        '</strong> for <strong>' +
        escapeHtml(row.email) +
        '</strong>.</p>' +
        '<p>Re-enable anytime from your <a class="lnk" href="/settings">settings page</a>.</p>' +
        '<a class="btn" href="/settings">Manage preferences</a>',
    })
  );
};
