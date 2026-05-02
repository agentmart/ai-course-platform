import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse } from '~/lib/handler';

export const prerender = false;

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const provided = (request.headers.get('authorization') ?? '').replace('Bearer ', '');
  // @ts-expect-error
  const cronSecret = env.CRON_SECRET;
  if (!cronSecret || provided !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }
  // @ts-expect-error
  if (!env.RESEND_API_KEY) {
    return jsonResponse({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const supabase = getSupabaseAdmin(env);
  const { Resend } = await import('resend');
  // @ts-expect-error
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: users, error } = await supabase
      .from('user_access')
      .select('id, email, progress_data, last_reminder_sent, updated_at')
      .not('progress_data', 'is', null)
      .lt('updated_at', cutoff);
    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    for (const user of users ?? []) {
      if (!user.email) {
        skipped++;
        continue;
      }
      const completed = (user.progress_data?.completed ?? []) as number[];
      if (completed.length === 0 || completed.length >= 60) {
        skipped++;
        continue;
      }
      if (
        user.last_reminder_sent &&
        Date.now() - new Date(user.last_reminder_sent).getTime() < 7 * 24 * 60 * 60 * 1000
      ) {
        skipped++;
        continue;
      }
      const nextDay = completed.length + 1;
      try {
        await resend.emails.send({
          from: 'becomeaipm <reminders@becomeaipm.com>',
          to: user.email,
          subject: `Day ${nextDay} is waiting for you — Become AI PM`,
          html:
            '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">' +
            '<p style="color:#c8590a;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Become AI PM</p>' +
            `<h2 style="font-size:22px;margin:12px 0;">You're ${completed.length}/60 days in — keep going!</h2>` +
            `<p style="font-size:15px;color:#3d3530;line-height:1.7;">It's been a while since your last session. Day ${nextDay} is ready and waiting.</p>` +
            `<a href="https://becomeaipm.com/course" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1a1512;color:white;text-decoration:none;border-radius:4px;font-weight:600;">Continue Day ${nextDay} &rarr;</a></div>`,
        });
        await supabase
          .from('user_access')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', user.id);
        sent++;
      } catch (emailErr: any) {
        console.error('reminder send err for user', user.id, emailErr?.message);
        skipped++;
      }
    }
    return jsonResponse({ sent, skipped, total: (users ?? []).length });
  } catch (err: any) {
    console.error('Reminder job failed:', err);
    return jsonResponse({ error: 'Internal error' }, { status: 500 });
  }
};
