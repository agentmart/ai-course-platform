// api/billing-portal.js
// Creates a Stripe Customer Portal session for subscription management
// Users can upgrade, downgrade, cancel, update payment method

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getAppUrl(req) {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  if (envUrl) return envUrl;
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  const appUrl = getAppUrl(req);

  res.setHeader('Access-Control-Allow-Origin', appUrl || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const clerkUser = await verifyClerkToken(authHeader.replace('Bearer ', ''));
    if (!clerkUser) return res.status(401).json({ error: 'Invalid token' });

    // Look up user's Stripe customer ID
    const { data, error } = await supabase
      .from('user_access')
      .select('stripe_customer_id')
      .eq('clerk_user_id', clerkUser.sub)
      .single();

    if (error || !data?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    // Create Stripe billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/course.html`,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Billing portal error:', err);
    return res.status(500).json({ error: err.message });
  }
}
