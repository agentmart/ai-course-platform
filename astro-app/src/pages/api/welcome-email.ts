import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';

export const prerender = false;

function welcomeHtml(greeting: string) {
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;"><div style="max-width:560px;margin:0 auto;padding:40px 24px;"><div style="text-align:center;margin-bottom:32px;"><span style="font-family:\'Courier New\',monospace;font-size:14px;letter-spacing:0.15em;color:#c8590a;font-weight:700;">becomeaipm</span></div><div style="background:#ffffff;border:1px solid #d4cdc4;border-radius:8px;padding:36px 32px;"><p style="font-size:18px;font-weight:700;color:#1a1512;margin:0 0 16px;">' + greeting + ',</p><p style="font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 16px;">Thank you for joining <strong>Become AI PM</strong>! You\'ve just taken the first step toward mastering AI Product Management. I\'m excited to have you here.</p><p style="font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 20px;">Here\'s what you get &mdash; <strong>completely free</strong>:</p><div style="text-align:center;margin:28px 0;"><a href="https://becomeaipm.com/course" style="display:inline-block;padding:14px 32px;background:#1a1512;color:#ffffff;text-decoration:none;border-radius:4px;font-size:15px;font-weight:700;">Start Day 1 &rarr;</a></div><div style="border-top:1px solid #ede8df;padding-top:24px;margin-top:24px;"><p style="font-size:14px;color:#1a1512;margin:0 0 4px;font-weight:600;">Stavan Mehta</p><p style="font-size:13px;color:#8c7f74;margin:0 0 4px;">Founder, becomeaipm.com</p></div></div></div></body></html>';
}

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: appCors(envFrom(locals)) });

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = appCors(env);
  // @ts-expect-error
  if (!env.RESEND_API_KEY) {
    return jsonResponse({ sent: false, reason: 'email_not_configured' }, { headers: cors });
  }

  let user;
  let body: any = {};
  try {
    body = (await request.json().catch(() => ({}))) ?? {};
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }
  const userEmail = body.email;
  const firstName = body.firstName ?? '';
  if (!userEmail) {
    return jsonResponse({ error: 'Email required' }, { status: 400, headers: cors });
  }

  const supabase = getSupabaseAdmin(env);
  try {
    const { data: existing } = await supabase
      .from('user_access')
      .select('id, progress_data')
      .eq('clerk_user_id', user.sub)
      .single();
    const completed = existing?.progress_data?.completed;
    if (Array.isArray(completed) && completed.length > 0) {
      return jsonResponse({ sent: false, reason: 'existing_user' }, { headers: cors });
    }
    if (!existing) {
      await supabase
        .from('user_access')
        .upsert(
          {
            clerk_user_id: user.sub,
            email: userEmail,
            tier: 'free',
            access_level: 2,
            granted_at: new Date().toISOString(),
          },
          { onConflict: 'clerk_user_id' }
        );
    }
  } catch {
    /* don't block */
  }

  const { Resend } = await import('resend');
  // @ts-expect-error
  const resend = new Resend(env.RESEND_API_KEY);
  const greeting = firstName ? 'Hi ' + firstName : 'Welcome';
  try {
    const result = await resend.emails.send({
      from: 'Stavan from becomeaipm <hello@becomeaipm.com>',
      to: userEmail,
      subject: 'Welcome to Become AI PM — Your 60-Day Journey Starts Now',
      html: welcomeHtml(greeting),
    });
    if (result?.error) {
      return jsonResponse(
        { sent: false, reason: 'resend_error', detail: result.error.message ?? 'unknown' },
        { headers: cors }
      );
    }
    return jsonResponse({ sent: true, id: result?.data?.id }, { headers: cors });
  } catch (err: any) {
    return jsonResponse(
      { sent: false, reason: 'send_error', detail: err?.message ?? 'unknown' },
      { headers: cors }
    );
  }
};
