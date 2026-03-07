// api/stripe-webhook.js
// Handles Stripe payment confirmation → grants course access in Supabase
// Set this URL in Stripe Dashboard → Webhooks → Add endpoint

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key server-side only
);

// IMPORTANT: disable body parsing — Stripe needs the raw body for signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // Verify webhook signature — prevents fake events
    // STRIPE_WEBHOOK_SECRET: found in Stripe Dashboard → Webhooks → Your endpoint → Signing secret
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.payment_status !== 'paid') break;

      const clerkUserId = session.metadata?.clerk_user_id || session.client_reference_id;
      const tier = session.metadata?.tier || 'full';
      const email = session.metadata?.email || session.customer_email;

      console.log(`Payment complete: user=${clerkUserId} tier=${tier}`);

      // Grant access in Supabase
      const { error } = await supabase
        .from('user_access')
        .upsert({
          clerk_user_id:    clerkUserId,
          email:            email,
          tier:             tier,
          stripe_session_id: session.id,
          stripe_customer_id: session.customer,
          granted_at:       new Date().toISOString(),
          access_level:     getTierAccessLevel(tier),
        }, { onConflict: 'clerk_user_id' });

      if (error) {
        console.error('Supabase upsert error:', error);
        // Return 200 anyway so Stripe doesn't retry — log and investigate manually
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      console.error('Payment failed:', pi.id, pi.last_payment_error?.message);
      // Optionally: send a recovery email via your email provider
      break;
    }

    case 'charge.refunded': {
      // Revoke access if a refund is issued
      const charge = event.data.object;
      const session = await stripe.checkout.sessions.list({
        payment_intent: charge.payment_intent,
        limit: 1
      });
      if (session.data[0]?.metadata?.clerk_user_id) {
        await supabase
          .from('user_access')
          .update({ access_level: 'revoked', revoked_at: new Date().toISOString() })
          .eq('clerk_user_id', session.data[0].metadata.clerk_user_id);
        console.log('Access revoked for refund:', session.data[0].metadata.clerk_user_id);
      }
      break;
    }
  }

  return res.status(200).json({ received: true });
}

function getTierAccessLevel(tier) {
  const levels = { basic: 1, full: 2, team: 2 };
  return levels[tier] || 1;
}
