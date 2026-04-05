// api/check-access.js
// Checks if user is authenticated. All logged-in users get full 60-day access.
// No payment gating — just verify Clerk JWT.

import { verifyClerkToken } from '../lib/clerk.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ hasAccess: false, reason: 'not_authenticated' });
    }

    const token = authHeader.replace('Bearer ', '');
    const clerkUser = await verifyClerkToken(token);
    if (!clerkUser) {
      return res.status(401).json({ hasAccess: false, reason: 'invalid_token' });
    }

    // All authenticated users get full access
    return res.status(200).json({
      hasAccess: true,
      tier: 'authenticated',
      accessLevel: 2,
      maxDayUnlocked: 60,
      features: {
        progressTracking: true,
        saveJobs: true,
      },
    });

  } catch (err) {
    console.error('Access check error:', err);
    return res.status(500).json({ hasAccess: false, reason: 'server_error' });
  }
}
