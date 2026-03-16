// api/track-click.js
// Records a job link click for analytics. Auth optional — logs user if signed in.
// POST /api/track-click
// Body: { job_posting_id, company_id, company_name, job_title, job_url, referrer_page }

import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { job_posting_id, company_id, company_name, job_title, job_url, referrer_page } = req.body || {};
  if (!job_url || !company_name) return res.status(400).json({ error: 'job_url and company_name required' });

  // Try to identify user — optional, never blocks the click
  let clerk_user_id = null;
  try {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.replace('Bearer ', '');
      const payload = await verifyClerkToken(token);
      clerk_user_id = payload?.sub || null;
    }
  } catch { /* anonymous — that's fine */ }

  try {
    await supabase.from('click_events').insert({
      clerk_user_id:  clerk_user_id,
      company_id:     company_id     || null,
      company_name:   company_name,
      job_posting_id: job_posting_id || null,
      job_title:      job_title      || null,
      job_url:        job_url,
      referrer_page:  referrer_page  || null,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Never let tracking failure break the user experience
    console.error('track-click error:', err.message);
    return res.status(200).json({ ok: true }); // still return 200
  }
}
