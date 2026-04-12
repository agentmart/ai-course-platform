import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { verifyClerkToken } from '../lib/clerk.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set');
    return res.status(200).json({ sent: false, reason: 'email_not_configured' });
  }

  let userId, userEmail, firstName;
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
    userEmail = req.body?.email;
    firstName = req.body?.firstName || '';
    console.log('Welcome email request:', JSON.stringify({ userId, hasEmail: !!userEmail, firstName: firstName || '(none)' }));
  } catch (e) {
    console.error('Welcome email auth failed:', e?.message || e);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!userEmail) {
    return res.status(400).json({ error: 'Email required' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: existing } = await supabase
      .from('user_access')
      .select('id, progress_data')
      .eq('clerk_user_id', userId)
      .single();

    // Only skip if the user has actually completed at least one day.
    // A brand-new row (progress_data null or empty completed array) should
    // still receive the welcome email.
    const completedDays = existing?.progress_data?.completed;
    if (Array.isArray(completedDays) && completedDays.length > 0) {
      console.log('Welcome email skipped: existing user with progress', { userId, completedDays: completedDays.length });
      return res.status(200).json({ sent: false, reason: 'existing_user' });
    }

    // Ensure user_access row exists for brand-new users
    if (!existing) {
      await supabase
        .from('user_access')
        .upsert({
          clerk_user_id: userId,
          email: userEmail,
          tier: 'free',
          access_level: 2,
          granted_at: new Date().toISOString(),
        }, { onConflict: 'clerk_user_id' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const greeting = firstName ? 'Hi ' + firstName : 'Welcome';

    const result = await resend.emails.send({
      from: 'Stavan from becomeaipm <hello@becomeaipm.com>',
      to: userEmail,
      subject: 'Welcome to Become AI PM — Your 60-Day Journey Starts Now',
      html: '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;"><div style="max-width:560px;margin:0 auto;padding:40px 24px;"><div style="text-align:center;margin-bottom:32px;"><span style="font-family:\'Courier New\',monospace;font-size:14px;letter-spacing:0.15em;color:#c8590a;font-weight:700;">becomeaipm</span></div><div style="background:#ffffff;border:1px solid #d4cdc4;border-radius:8px;padding:36px 32px;"><p style="font-size:18px;font-weight:700;color:#1a1512;margin:0 0 16px;">' + greeting + ',</p><p style="font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 16px;">Thank you for joining <strong>Become AI PM</strong>! You\'ve just taken the first step toward mastering AI Product Management. I\'m excited to have you here.</p><p style="font-size:15px;color:#3d3530;line-height:1.7;margin:0 0 20px;">Here\'s what you get &mdash; <strong>completely free</strong>:</p><table style="width:100%;border-collapse:collapse;margin:0 0 24px;"><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#128218; 60-Day Curriculum</strong><br><span style="color:#8c7f74;font-size:13px;">Hands-on lessons covering AI/ML fundamentals, Claude, GPT-4, evals, red-teaming, and PM frameworks</span></td></tr><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#128187; 60 Code Labs</strong><br><span style="color:#8c7f74;font-size:13px;">Python &amp; JavaScript run in your browser &mdash; zero setup, no API keys needed</span></td></tr><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#127919; 240 Hands-on Tasks</strong><br><span style="color:#8c7f74;font-size:13px;">4 tasks per day to build real skills, not just theory</span></td></tr><tr><td style="padding:10px 14px;border-bottom:1px solid #ede8df;font-size:14px;color:#1a1512;"><strong>&#128188; AI Companies &amp; Jobs</strong><br><span style="color:#8c7f74;font-size:13px;">Live directory of 240+ companies with open PM roles, updated daily</span></td></tr><tr><td style="padding:10px 14px;font-size:14px;color:#1a1512;"><strong>&#127942; Community Leaderboard</strong><br><span style="color:#8c7f74;font-size:13px;">Track your progress and see how you stack up against the community</span></td></tr></table><div style="text-align:center;margin:28px 0;"><a href="https://becomeaipm.com/course.html" style="display:inline-block;padding:14px 32px;background:#1a1512;color:#ffffff;text-decoration:none;border-radius:4px;font-size:15px;font-weight:700;">Start Day 1 &rarr;</a></div><div style="border-top:1px solid #ede8df;padding-top:20px;margin-top:24px;"><p style="font-size:14px;color:#3d3530;line-height:1.7;margin:0 0 12px;"><strong>Your feedback shapes this platform.</strong> If you find a bug or have an idea for a feature, I\'d love to hear about it:</p><ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#3d3530;line-height:2;"><li><a href="https://becomeaipm.com/contact.html" style="color:#c8590a;">Submit feedback</a> via the contact form</li><li><a href="https://github.com/orgs/agentmart/projects/1/views/1" style="color:#c8590a;">View the bug tracker</a> on GitHub</li></ul></div><div style="border-top:1px solid #ede8df;padding-top:20px;margin-top:16px;"><p style="font-size:14px;color:#3d3530;line-height:1.7;margin:0 0 8px;">Enjoying the course? Help others discover it:</p><p style="font-size:14px;margin:0 0 4px;"><a href="https://www.linkedin.com/company/becomeaipm" style="color:#c8590a;text-decoration:none;font-weight:600;">Follow us on LinkedIn</a> &nbsp;&middot;&nbsp; Share with <strong>#BecomeAIPM</strong> on social media</p></div><div style="border-top:1px solid #ede8df;padding-top:24px;margin-top:24px;"><p style="font-size:14px;color:#1a1512;margin:0 0 4px;font-weight:600;">Stavan Mehta</p><p style="font-size:13px;color:#8c7f74;margin:0 0 4px;">Founder, becomeaipm.com</p><p style="font-size:12px;color:#8c7f74;margin:0;line-height:1.6;"><em>P.S. &mdash; I personally read and respond to every email. If you have questions, hit reply. I\'m here to help.</em></p></div></div><div style="text-align:center;margin-top:24px;"><p style="font-size:11px;color:#8c7f74;"><a href="https://becomeaipm.com" style="color:#8c7f74;">becomeaipm.com</a> &middot; <a href="https://www.linkedin.com/company/becomeaipm" style="color:#8c7f74;">LinkedIn</a></p></div></div></body></html>'
    });

    console.log('Welcome email result:', JSON.stringify({ to: userEmail, id: result?.data?.id, error: result?.error }));

    if (result?.error) {
      console.error('Resend API error:', JSON.stringify(result.error));
      return res.status(200).json({ sent: false, reason: 'resend_error', detail: result.error.message || 'unknown' });
    }

    return res.status(200).json({ sent: true });

  } catch (err) {
    console.error('Welcome email error:', err?.message || err);
    return res.status(200).json({ sent: false, reason: 'send_error' });
  }
}
