// api/stripe-webhook.js
// Handles Stripe payment & subscription events → grants/revokes course access in Supabase
// Set this URL in Stripe Dashboard → Webhooks → Add endpoint
// Events to listen for:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted, invoice.payment_succeeded,
//   invoice.payment_failed, charge.refunded

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Subscription tiers that map to paid access
const SUBSCRIPTION_TIERS = new Set(['monthly', 'annual']);

function getAccessLevel(tier, subscriptionStatus) {
  // Revoked = -1, Free = 0, Basic = 1, Paid/Full = 2
  if (subscriptionStatus === 'cancelled') return 0;
  if (subscriptionStatus === 'past_due') return 1; // limited access during grace period
  const levels = { free: 0, basic: 1, full: 2, team: 2, monthly: 2, annual: 2 };
  return levels[tier] ?? 0;
}

function getSubscriptionType(tier) {
  if (SUBSCRIPTION_TIERS.has(tier)) return tier;
  if (['basic', 'full', 'team'].includes(tier)) return 'one_time';
  return 'free';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {

    // ── One-time payment OR first subscription checkout ──
    case 'checkout.session.completed': {
      const session = event.data.object;
      const clerkUserId = session.metadata?.clerk_user_id || session.client_reference_id;
      const tier = session.metadata?.tier || 'full';
      const email = session.metadata?.email || session.customer_email;

      if (!clerkUserId) {
        console.error('checkout.session.completed: no clerk_user_id found');
        break;
      }

      // One-time payment
      if (session.mode === 'payment') {
        if (session.payment_status !== 'paid') break;
        console.log(`One-time payment complete: user=${clerkUserId} tier=${tier}`);

        const { error } = await supabase
          .from('user_access')
          .upsert({
            clerk_user_id:      clerkUserId,
            email,
            tier,
            access_level:       getAccessLevel(tier, 'active'),
            subscription_type:  'one_time',
            subscription_status: 'one_time',
            stripe_session_id:  session.id,
            stripe_customer_id: session.customer,
            granted_at:         new Date().toISOString(),
          }, { onConflict: 'clerk_user_id' });

        if (error) console.error('Supabase upsert error (one-time):', error);
        break;
      }

      // Subscription checkout — Stripe creates subscription automatically
      if (session.mode === 'subscription') {
        const subscriptionId = session.subscription;
        console.log(`Subscription created: user=${clerkUserId} tier=${tier} sub=${subscriptionId}`);

        // Fetch subscription to get period details
        let renewsAt = null;
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            renewsAt = new Date(sub.current_period_end * 1000).toISOString();
          } catch (e) {
            console.error('Failed to fetch subscription details:', e.message);
          }
        }

        const { error } = await supabase
          .from('user_access')
          .upsert({
            clerk_user_id:        clerkUserId,
            email,
            tier,
            access_level:         getAccessLevel(tier, 'active'),
            subscription_type:    getSubscriptionType(tier),
            subscription_status:  'active',
            stripe_subscription_id: subscriptionId,
            stripe_session_id:    session.id,
            stripe_customer_id:   session.customer,
            subscription_start:   new Date().toISOString(),
            subscription_renews_at: renewsAt,
            granted_at:           new Date().toISOString(),
          }, { onConflict: 'clerk_user_id' });

        if (error) console.error('Supabase upsert error (subscription):', error);
      }
      break;
    }

    // ── Subscription updated (upgrade, downgrade, renewal) ──
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const clerkUserId = subscription.metadata?.clerk_user_id;
      const tier = subscription.metadata?.tier;

      if (!clerkUserId) {
        console.log('subscription.updated: no clerk_user_id in metadata, looking up by subscription ID');
        // Fallback: find user by stripe_subscription_id
        const { data } = await supabase
          .from('user_access')
          .select('clerk_user_id, tier')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        if (!data) { console.error('subscription.updated: user not found'); break; }
        // Update with current status
        const status = subscription.status; // active, past_due, unpaid, cancelled
        const renewsAt = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        await supabase
          .from('user_access')
          .update({
            subscription_status:   status === 'active' ? 'active' : status,
            access_level:          getAccessLevel(data.tier, status),
            subscription_renews_at: renewsAt,
          })
          .eq('clerk_user_id', data.clerk_user_id);
        break;
      }

      const status = subscription.status;
      const renewsAt = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

      console.log(`Subscription updated: user=${clerkUserId} status=${status}`);

      const { error } = await supabase
        .from('user_access')
        .update({
          subscription_status:   status === 'active' ? 'active' : status,
          access_level:          getAccessLevel(tier || 'monthly', status),
          subscription_renews_at: renewsAt,
        })
        .eq('clerk_user_id', clerkUserId);

      if (error) console.error('Supabase update error (sub updated):', error);
      break;
    }

    // ── Subscription cancelled (end of billing period) ──
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const clerkUserId = subscription.metadata?.clerk_user_id;

      // Find user by subscription ID if metadata missing
      let userId = clerkUserId;
      if (!userId) {
        const { data } = await supabase
          .from('user_access')
          .select('clerk_user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();
        userId = data?.clerk_user_id;
      }

      if (!userId) {
        console.error('subscription.deleted: user not found');
        break;
      }

      console.log(`Subscription cancelled: user=${userId}`);

      // Downgrade to free tier
      const { error } = await supabase
        .from('user_access')
        .update({
          tier:                  'free',
          access_level:          0,
          subscription_status:   'cancelled',
          subscription_renews_at: null,
          revoked_at:            new Date().toISOString(),
        })
        .eq('clerk_user_id', userId);

      if (error) console.error('Supabase update error (sub deleted):', error);
      break;
    }

    // ── Invoice paid (subscription renewal success) ──
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_create') break; // handled by checkout.session.completed

      const subscriptionId = invoice.subscription;
      if (!subscriptionId) break;

      // Update renewal date
      const { data } = await supabase
        .from('user_access')
        .select('clerk_user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (data) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await supabase
          .from('user_access')
          .update({
            subscription_status:   'active',
            access_level:          2,
            subscription_renews_at: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('clerk_user_id', data.clerk_user_id);
        console.log(`Subscription renewed: user=${data.clerk_user_id}`);
      }
      break;
    }

    // ── Invoice payment failed (card declined, etc.) ──
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) break;

      const { data } = await supabase
        .from('user_access')
        .select('clerk_user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (data) {
        await supabase
          .from('user_access')
          .update({
            subscription_status: 'past_due',
            access_level:        1, // limited access during grace
          })
          .eq('clerk_user_id', data.clerk_user_id);
        console.log(`Payment failed, grace period: user=${data.clerk_user_id}`);
      }
      break;
    }

    // ── Refund (one-time payment) ──
    case 'charge.refunded': {
      const charge = event.data.object;
      const session = await stripe.checkout.sessions.list({
        payment_intent: charge.payment_intent,
        limit: 1
      });
      if (session.data[0]?.metadata?.clerk_user_id) {
        await supabase
          .from('user_access')
          .update({ access_level: -1, subscription_status: 'cancelled', revoked_at: new Date().toISOString() })
          .eq('clerk_user_id', session.data[0].metadata.clerk_user_id);
        console.log('Access revoked for refund:', session.data[0].metadata.clerk_user_id);
      }
      break;
    }
  }

  return res.status(200).json({ received: true });
}
