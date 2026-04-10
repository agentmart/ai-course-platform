import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    // Find users inactive for 7+ days who have started but not finished the course
    // and haven't been reminded in the last 7 days
    const { data: users, error } = await supabase
      .from('user_access')
      .select('id, email, progress_data, last_reminder_sent, updated_at')
      .not('progress_data', 'is', null)
      .lt('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    let sent = 0;
    let skipped = 0;

    for (const user of users || []) {
      // Skip if no email
      if (!user.email) { skipped++; continue; }

      // Check they have progress (started but not finished)
      const completed = user.progress_data?.completed || [];
      if (completed.length === 0 || completed.length >= 60) { skipped++; continue; }

      // Check they haven't been reminded in the last 7 days
      if (user.last_reminder_sent) {
        const lastReminder = new Date(user.last_reminder_sent);
        if (Date.now() - lastReminder.getTime() < 7 * 24 * 60 * 60 * 1000) {
          skipped++;
          continue;
        }
      }

      const nextDay = completed.length + 1;

      try {
        await resend.emails.send({
          from: 'becomeaipm <reminders@becomeaipm.com>',
          to: user.email,
          subject: `Day ${nextDay} is waiting for you — Become AI PM`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
              <p style="color:#c8590a;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Become AI PM</p>
              <h2 style="font-size:22px;margin:12px 0;">You're ${completed.length}/60 days in — keep going!</h2>
              <p style="font-size:15px;color:#3d3530;line-height:1.7;">
                It's been a while since your last session. Day ${nextDay} is ready and waiting.
                Each day brings you closer to mastering AI product management.
              </p>
              <a href="https://becomeaipm.com/course.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#1a1512;color:white;text-decoration:none;border-radius:4px;font-weight:600;">
                Continue Day ${nextDay} →
              </a>
              <p style="font-size:12px;color:#8c7f74;margin-top:24px;">
                You've completed ${completed.length} of 60 days. Don't lose your momentum!
              </p>
            </div>
          `
        });

        // Update last_reminder_sent
        await supabase
          .from('user_access')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', user.id);

        sent++;
      } catch (emailErr) {
        console.error(`Failed to send reminder to user ${user.id}:`, emailErr.message);
        skipped++;
      }
    }

    return res.status(200).json({ sent, skipped, total: (users || []).length });
  } catch (err) {
    console.error('Reminder job failed:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
