// api/get-progress.js
import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  let userId;
  try {
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
  } catch(e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get completed days
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
