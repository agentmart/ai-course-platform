// api/progress.js
// GET  /api/progress — fetch user's completed days/progress
// POST /api/progress — save user's progress data
import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  let userId, userEmail;
  try {
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
    userEmail = claims.email || null;
  } catch(e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Ensure user_access row exists — creates one if missing (e.g. first visit)
  await supabase
    .from('user_access')
    .upsert(
      { clerk_user_id: userId, email: userEmail, tier: 'free', access_level: 2, granted_at: new Date().toISOString() },
      { onConflict: 'clerk_user_id', ignoreDuplicates: true }
    );

  // GET — fetch progress
  if (req.method === 'GET') {
    try {
      const { data: access } = await supabase
        .from('user_access')
        .select('progress_data')
        .eq('clerk_user_id', userId)
        .single();

      if (!access?.progress_data) {
        return res.status(200).json({ completed: [], taskStates: {}, notes: {} });
      }

      return res.status(200).json(access.progress_data);
    } catch(e) {
      return res.status(200).json({ completed: [], taskStates: {}, notes: {} });
    }
  }

  // POST — save progress
  // Merge into existing progress_data so we don't clobber other top-level keys
  // (e.g. `course_advisor` written by /api/course-advisor).
  const { completed, taskStates, notes } = req.body || {};

  try {
    const { data: existing } = await supabase
      .from('user_access')
      .select('progress_data')
      .eq('clerk_user_id', userId)
      .single();

    const merged = {
      ...(existing?.progress_data || {}),
      completed,
      taskStates,
      notes,
    };

    await supabase
      .from('user_access')
      .update({ progress_data: merged, updated_at: new Date().toISOString() })
      .eq('clerk_user_id', userId);

    return res.status(200).json({ ok: true });
  } catch(e) {
    return res.status(500).json({ error: 'Failed to save progress' });
  }
}
