# becomeaipm.com — Production Go-Live Checklist

All items in **Step 1** can be run via CLI (fastest). Steps 2–5 are Stripe dashboard only.

---

## ✅ Already Done (automated)
- [x] Supabase migration: subscription columns added to `user_access`
- [x] Defaults updated: `tier='free'`, `access_level=0` for new users
- [x] Existing beta users backfilled as `subscription_type='one_time'`
- [x] Indexes added: `stripe_subscription_id`, `stripe_customer_id`
- [x] All API files present: `create-checkout.js`, `stripe-webhook.js`, `check-access.js`, `billing-portal.js`

---

## Step 1 — Create Stripe Products (CLI, ~1 min)

```bash
chmod +x scripts/stripe-setup.sh
bash scripts/stripe-setup.sh
```

This creates:
- **Monthly**: $9/month recurring → outputs `STRIPE_PRICE_MONTHLY`
- **Annual**: $84/year recurring → outputs `STRIPE_PRICE_ANNUAL`

Then push those two price IDs to Vercel:
```bash
vercel env add STRIPE_PRICE_MONTHLY production
vercel env add STRIPE_PRICE_ANNUAL production
```

---

## Step 2 — Update Stripe Webhook Events (Dashboard)

**Stripe Dashboard → Developers → Webhooks → your endpoint**

Endpoint URL: `https://becomeaipm.com/api/stripe-webhook`

Ensure ALL of these events are selected:
- [x] `checkout.session.completed` (should exist)
- [x] `charge.refunded` (should exist)
- [ ] `customer.subscription.updated` ← ADD
- [ ] `customer.subscription.deleted` ← ADD
- [ ] `invoice.payment_succeeded` ← ADD
- [ ] `invoice.payment_failed` ← ADD

---

## Step 3 — Enable Stripe Billing Portal (Dashboard)

**Stripe Dashboard → Settings → Billing → Customer portal**

- Toggle **"Customer portal"** to enabled
- Set **Return URL**: `https://becomeaipm.com/course.html`
- Enable: Cancel subscriptions, Update payment methods, View billing history

This activates the `/api/billing-portal` endpoint.

---

## Step 4 — Fix BETA Promo Code (Dashboard)

**Stripe Dashboard → Products → Coupons**

1. Archive the old broken BETA coupon (`amount_off` misconfigured)
2. Confirm coupon `5GrVqLwo` ("BETA — 100% Free Beta Access") exists with `percent_off=100`
3. Go to **Promotion codes** → Create code `BETA` attached to coupon `5GrVqLwo`

---

## Step 5 — Pendo Analytics

1. Go to **pendo.io** → Create account → Create app for `becomeaipm.com`
2. Copy the **API Key** from Install Settings → Add to `.env` as `PENDO_API_KEY=<your-key>`
3. Pendo is initialized automatically after Clerk auth loads (visitor ID = Clerk user ID)
4. Verify events show up: **Day Completed** (with day), **Contact Click** (with channel)

---

## Step 6 — Deploy to Production

```bash
git checkout main
git merge stage
git push origin main
```

Vercel auto-deploys on push to main. Monitor the deployment:
```bash
vercel logs --follow
```

---

## Step 7 — End-to-End Test (Sandbox)

1. Go to `becomeaipm.com` → Start Free
2. Sign up with a test account
3. Verify days 1–15 are accessible, day 16 shows paywall
4. Click upgrade → use Stripe test card `4242 4242 4242 4242`
5. After checkout, verify in Supabase `user_access`: `subscription_type='monthly'`, `subscription_status='active'`
6. Verify days 1–60 are now unlocked
7. Test billing portal link in course.html

---

## Step 8 — Activate Stripe Live Mode

**Stripe Dashboard → Activate your account**

Submit business details. Once approved:
- Repeat Step 1 in **live mode** to create live prices
- Update Vercel env vars to **live** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET`
- Register webhook endpoint in live mode

---

## Vercel Environment Variables Reference

| Variable | Required | Notes |
|----------|----------|-------|
| `STRIPE_SECRET_KEY` | ✅ | Test: `sk_test_...`, Live: `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | From webhook endpoint in Stripe dashboard |
| `STRIPE_PRICE_MONTHLY` | ✅ | From Step 1 output |
| `STRIPE_PRICE_ANNUAL` | ✅ | From Step 1 output |
| `STRIPE_PRICE_BASIC` | legacy | Keep for existing one-time users |
| `STRIPE_PRICE_FULL` | legacy | Keep for existing one-time users |
| `STRIPE_PRICE_TEAM` | ✅ | Team plan |
| `SUPABASE_URL` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://becomeaipm.com` |
| `CLERK_SECRET_KEY` | ✅ | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | |
