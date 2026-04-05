// api/check-access.js
// Checks user access level and returns tier info for content gating
// Free users: days 1-15 unlocked, no progress tracking
// Paid users (monthly/annual/one_time): all 60 days + full features

import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FREE_DAY_LIMIT = 15; // Free tier gets days 1-15

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      // Not authenticated — treat as free user (can still view days 1-15)
      return res.status(200).json({
        hasAccess: true,
        tier: 'free',
        accessLevel: 0,
        subscriptionType: 'free',
        subscriptionStatus: 'free',
        maxDayUnlocked: FREE_DAY_LIMIT,
        features: { progressTracking: false, saveJobs: false, slackCommunity: false, certification: false },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const clerkUser = await verifyClerkToken(token);
    if (!clerkUser) {
      return res.status(200).json({
        hasAccess: true,
        tier: 'free',
        accessLevel: 0,
        subscriptionType: 'free',
        subscriptionStatus: 'free',
        maxDayUnlocked: FREE_DAY_LIMIT,
        features: { progressTracking: false, saveJobs: false, slackCommunity: false, certification: false },
      });
    }

    // Check Supabase for access record
    const { data, error } = await supabase
      .from('user_access')
      .select('tier, access_level, granted_at, subscription_type, subscription_status, subscription_renews_at, stripe_session_id')
      .eq('clerk_user_id', clerkUser.sub)
      .single();

    // No record = free user (authenticated but no purchase)
    if (error || !data) {
      return res.status(200).json({
        hasAccess: true,
        tier: 'free',
        accessLevel: 0,
        subscriptionType: 'free',
        subscriptionStatus: 'free',
        maxDayUnlocked: FREE_DAY_LIMIT,
        features: { progressTracking: false, saveJobs: false, slackCommunity: false, certification: false },
      });
    }

    // Revoked access
    if (data.access_level < 0) {
      return res.status(200).json({
        hasAccess: true,
        tier: 'free',
        accessLevel: 0,
        subscriptionType: 'free',
        subscriptionStatus: 'revoked',
        maxDayUnlocked: FREE_DAY_LIMIT,
        features: { progressTracking: false, saveJobs: false, slackCommunity: false, certification: false },
      });
    }

    // Determine access level and features
    const isPaid = data.access_level >= 2;
    const isPastDue = data.subscription_status === 'past_due';
    const isAnnual = data.subscription_type === 'annual' || data.tier === 'annual';
    const isOneTime = data.subscription_type === 'one_time';

    // Past due: limited access (days 1-30 as grace)
    const maxDay = isPaid ? 60 : (isPastDue ? 30 : FREE_DAY_LIMIT);

    return res.status(200).json({
      hasAccess: true,
      tier: data.tier,
      accessLevel: data.access_level,
      grantedAt: data.granted_at,
      subscriptionType: data.subscription_type || 'free',
      subscriptionStatus: data.subscription_status || 'free',
      subscriptionRenewsAt: data.subscription_renews_at,
      maxDayUnlocked: maxDay,
      features: {
        progressTracking: isPaid || isPastDue || isOneTime,
        saveJobs: isPaid || isPastDue || isOneTime,
        slackCommunity: isPaid || isOneTime,
        certification: isAnnual || isOneTime,
      },
    });

  } catch (err) {
    console.error('Access check error:', err);
    return res.status(500).json({ hasAccess: false, reason: 'server_error' });
  }
}
