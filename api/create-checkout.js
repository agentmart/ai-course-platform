// api/create-checkout.js
import Stripe from 'stripe';
import { verifyClerkToken } from '../lib/clerk.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_BASIC,
  full: process.env.STRIPE_PRICE_FULL,
  team: process.env.STRIPE_PRICE_TEAM,
};

// Derive the app's base URL reliably.
// Priority: NEXT_PUBLIC_APP_URL env var → request Host header.
// This avoids "deployment unavailable" when the env var contains an old preview URL.
function getAppUrl(req) {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '');
  if (envUrl) return envUrl;
  // Fall back to the Host header of the current request
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

    const { tier, promoCode } = req.body;
    if (!PRICE_IDS[tier]) return res.status(400).json({ error: 'Invalid tier' });

    const sessionParams = {
      mode: 'payment',
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      client_reference_id: clerkUser.sub,
      customer_email: clerkUser.email,
      allow_promotion_codes: true,
      // Uses request-derived URL — never stale
      success_url: `${appUrl}/course.html?session_id={CHECKOUT_SESSION_ID}&access=granted`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      metadata: {
        clerk_user_id: clerkUser.sub,
        tier,
        email: clerkUser.email,
      },
    };

    if (promoCode) {
      const promotionCodes = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      if (promotionCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }];
        delete sessionParams.allow_promotion_codes;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}