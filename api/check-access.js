// api/check-access.js
// Checks if authenticated user has paid course access
// Called by the frontend before showing course content

import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Verify Clerk token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(200).json({ hasAccess: false, reason: 'not_authenticated' });
    }
    const token = authHeader.replace('Bearer ', '');
    const clerkUser = await verifyClerkToken(token);
    if (!clerkUser) {
      return res.status(200).json({ hasAccess: false, reason: 'invalid_token' });
    }

    // Check Supabase for access record
    const { data, error } = await supabase
      .from('user_access')
      .select('tier, access_level, granted_at, stripe_session_id')
      .eq('clerk_user_id', clerkUser.sub)
      .single();

    if (error || !data) {
      return res.status(200).json({ hasAccess: false, reason: 'no_purchase' });
    }

    if (data.access_level === 'revoked') {
      return res.status(200).json({ hasAccess: false, reason: 'revoked' });
    }

    return res.status(200).json({
      hasAccess: true,
      tier: data.tier,
      accessLevel: data.access_level,
      grantedAt: data.granted_at,
    });

  } catch (err) {
    console.error('Access check error:', err);
    return res.status(500).json({ hasAccess: false, reason: 'server_error' });
  }
}
