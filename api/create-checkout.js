// api/create-checkout.js
// Vercel Serverless Function — Stripe Checkout with promo codes
// Deploy: drop this file in /api/ folder of your Vercel project

import Stripe from 'stripe';
import { verifyClerkToken } from '../lib/clerk.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price IDs — set these in your Vercel environment variables
// Go to Vercel Dashboard → Project → Settings → Environment Variables
const PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_BASIC, // e.g. price_1ABC...
  full:  process.env.STRIPE_PRICE_FULL,
  team:  process.env.STRIPE_PRICE_TEAM,
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. Verify the Clerk JWT — ensures user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    const clerkUser = await verifyClerkToken(token);
    if (!clerkUser) return res.status(401).json({ error: 'Invalid token' });

    const { tier, promoCode } = req.body;
    if (!PRICE_IDS[tier]) return res.status(400).json({ error: 'Invalid tier' });

    // 2. Build the Stripe Checkout Session params
    const sessionParams = {
      mode: 'payment',
      line_items: [{
        price: PRICE_IDS[tier],
        quantity: 1,
      }],
      // Pass user ID so we can link the purchase to the Clerk user in the webhook
      client_reference_id: clerkUser.sub,
      customer_email: clerkUser.email,

      // Allow promo code entry on Stripe's hosted page
      allow_promotion_codes: true,

      // Success/cancel URLs — Vercel auto-fills NEXT_PUBLIC_APP_URL
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/course.html?session_id={CHECKOUT_SESSION_ID}&access=granted`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/?checkout=cancelled`,

      // Metadata for our webhook
      metadata: {
        clerk_user_id: clerkUser.sub,
        tier,
        email: clerkUser.email,
      },
    };

    // 3. If a promo code was passed programmatically (from our API)
    //    attach it as a Stripe coupon. Users can also enter codes on the Stripe page.
    if (promoCode) {
      const promotionCodes = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
      if (promotionCodes.data.length > 0) {
        sessionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }];
        // When using discounts, can't use allow_promotion_codes simultaneously
        delete sessionParams.allow_promotion_codes;
      }
    }

    // 4. Create the session
    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
