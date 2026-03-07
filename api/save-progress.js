// api/save-progress.js
import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  let userId;
  try {
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
  } catch(e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { completed, taskStates, notes } = req.body || {};

  try {
    await supabase
      .from('user_access')
      .update({ progress_data: { completed, taskStates, notes }, updated_at: new Date().toISOString() })
      .eq('clerk_user_id', userId);

    return res.status(200).json({ ok: true });
  } catch(e) {
    return res.status(500).json({ error: 'Failed to save progress' });
  }
}
