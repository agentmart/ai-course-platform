// api/validate-promo.js
// Validates a promo code against Stripe — real validation, not client-side

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: 'No code provided' });

  try {
    // Look up promotion code in Stripe
    const promotionCodes = await stripe.promotionCodes.list({
      code: code.toUpperCase(),
      active: true,
      limit: 1,
    });

    if (promotionCodes.data.length === 0) {
      return res.status(200).json({ valid: false, error: 'Promo code not found or expired.' });
    }

    const promoCode = promotionCodes.data[0];
    const coupon = promoCode.coupon;

    // Check expiry
    if (coupon.redeem_by && coupon.redeem_by < Date.now() / 1000) {
      return res.status(200).json({ valid: false, error: 'This promo code has expired.' });
    }

    // Check usage limits
    if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
      return res.status(200).json({ valid: false, error: 'This promo code has reached its usage limit.' });
    }

    // Return discount info for UI display
    let description = '';
    let discountPct = 0;
    let discountAmt = 0;

    if (coupon.percent_off) {
      discountPct = coupon.percent_off;
      description = `${coupon.percent_off}% off your order!`;
    } else if (coupon.amount_off) {
      discountAmt = coupon.amount_off / 100;
      description = `$${discountAmt} off your order!`;
    }

    return res.status(200).json({
      valid: true,
      description,
      discountPct,
      discountAmt,
      couponId: coupon.id,
      promoCodeId: promoCode.id,
    });

  } catch (err) {
    console.error('Promo validation error:', err);
    return res.status(500).json({ valid: false, error: 'Could not validate code. Try again.' });
  }
}
