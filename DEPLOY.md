# 🚀 Deployment Guide — AI Course Platform
## From zero to live with payments in under 2 hours

---

## ARCHITECTURE OVERVIEW

```
User visits yourdomain.com (Vercel)
       │
       ├── index.html     Landing page + pricing
       ├── course.html    Protected course content  
       └── /api/          Vercel Serverless Functions
              ├── check-access.js      → Supabase
              ├── create-checkout.js   → Stripe
              ├── stripe-webhook.js    → Supabase
              └── validate-promo.js    → Stripe

Auth:     Clerk  (Google, Apple, Meta, X, LinkedIn)
Payments: Stripe (checkout + promo codes + webhooks)
Database: Supabase (user access records + progress)
Code run: Piston API (free, no key)
Hosting:  Vercel (free tier)
```

---

## STEP 1 — Clerk Setup (Auth + Social Login)
**Time: ~20 minutes | Cost: Free up to 10K users/month**

1. Go to **clerk.com** → Sign up → Create application
2. Name it "AI Course Platform"
3. Under **User & Authentication → Social connections**, enable:
   - ✅ Google
   - ✅ Apple  
   - ✅ Facebook (Meta)
   - ✅ Twitter/X
   - ✅ LinkedIn
4. Copy your **Publishable Key** (starts with `pk_live_...`)
5. Copy your **Frontend API URL** (looks like `xxx.clerk.accounts.dev`)
6. Copy your **Secret Key** (starts with `sk_live_...`) — for server-side
7. Note your **Clerk Domain** (just the `xxx` part of your frontend API)

**Replace in your files:**
- `index.html` line 8: replace `pk_live_YOUR_CLERK_PUBLISHABLE_KEY`
- `index.html` line 9: replace `YOUR_FRONTEND_API`
- `course.html`: same replacements
- Vercel env var: `CLERK_DOMAIN` = `xxx.clerk.accounts.dev`

---

## STEP 2 — Stripe Setup (Payments + Promo Codes)
**Time: ~20 minutes | Cost: 2.9% + $0.30 per transaction**

### Create Products & Prices:
1. Go to **dashboard.stripe.com** → Products → Add product
2. Create 3 products:

| Name | Price | Billing |
|------|-------|---------|
| AI Course — Self-Paced | $147 | One-time |
| AI Course — Full Access | $297 | One-time |
| AI Course — Team (5 seats) | $997 | One-time |

3. For each: copy the **Price ID** (starts with `price_...`)

### Create Promo Codes:
1. Stripe Dashboard → Coupons → Create coupon
2. Examples to create:
   - Code: `LAUNCH50` → 50% off → Limited to 100 uses → Expires 30 days
   - Code: `FRIEND20` → 20% off → Unlimited uses
   - Code: `VIP100` → $100 off → Limited to 10 uses
3. For each coupon → Promotion codes → Add code → set the code name

### Webhook:
1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/stripe-webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the **Webhook Signing Secret** (starts with `whsec_...`)

---

## STEP 3 — Supabase Setup (Database)
**Time: ~10 minutes | Cost: Free tier**

1. Go to **supabase.com** → New project
2. Choose a region close to your users
3. SQL Editor → New query → Paste contents of `supabase-schema.sql` → Run
4. Settings → API:
   - Copy **Project URL** (like `https://xxx.supabase.co`)
   - Copy **service_role key** (long JWT — keep secret, server-side only)
   - Copy **anon key** (for client-side if needed)

---

## STEP 4 — Vercel Deployment
**Time: ~10 minutes | Cost: Free**

### Option A: Deploy via CLI (recommended)
```bash
npm install -g vercel
cd ai-course-platform
vercel deploy --prod
```

### Option B: Deploy via GitHub
1. Push this folder to a GitHub repo
2. vercel.com → New Project → Import Git Repository
3. Select your repo → Deploy

### Set Environment Variables:
In Vercel Dashboard → Your Project → Settings → Environment Variables:

| Variable | Value | Where to find it |
|----------|-------|-----------------|
| `CLERK_DOMAIN` | `xxx.clerk.accounts.dev` | Clerk Dashboard → API Keys |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe Dashboard → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe Dashboard → Webhooks → Your endpoint |
| `STRIPE_PRICE_BASIC` | `price_...` | Stripe Dashboard → Products → Self-Paced |
| `STRIPE_PRICE_FULL` | `price_...` | Stripe Dashboard → Products → Full Access |
| `STRIPE_PRICE_TEAM` | `price_...` | Stripe Dashboard → Products → Team |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Long JWT | Supabase → Settings → API (service_role) |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` | Your Vercel deployment URL |

---

## STEP 5 — Add Course Content
1. Open `public/course.html`
2. Replace the `<div id="course-content-placeholder">` with the full content from `ai-leadership-60days.html` (everything between `<body>` and `</body>`)
3. Deploy again: `vercel deploy --prod`

---

## STEP 6 — Custom Domain (Optional)
1. Vercel Dashboard → Your Project → Domains → Add
2. Enter `yourdomain.com`
3. Follow DNS instructions (add CNAME record at your registrar)
4. SSL is automatic and free

---

## STEP 7 — Test the Full Flow
1. Visit your site → Click "Get Access" → Sign in with Google
2. Select a pricing tier → You land on Stripe Checkout
3. Use Stripe test card: `4242 4242 4242 4242` exp `04/26` cvv `242`
4. Enter a promo code: create `TEST50` in Stripe for testing
5. Complete payment → You land back at `/course.html?access=granted`
6. Course loads ✓

---

## MONTHLY COST BREAKDOWN

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth, unlimited deploys | $20/mo (Pro) |
| Clerk | 10,000 MAU/month | $25/mo after |
| Stripe | No monthly fee | 2.9% + $0.30/transaction |
| Supabase | 500MB DB, 50K rows | $25/mo (Pro) |
| Piston API | Unlimited (public) | Self-host on $5 VPS |
| **Total at launch** | **$0/month** | **Until real scale** |

At 100 paying customers/month at $297 avg = ~$29,700 revenue
Stripe fees = ~$870 (3%)
Everything else = $0 (still on free tiers)
**Net: ~$28,830**

---

## CREATING PROMO CODES (ongoing)

In Stripe Dashboard → Coupons → Create coupon:
- **Percent off**: `LAUNCH50` = 50% off
- **Amount off**: `SAVE100` = $100 off  
- **Free**: `BETA` = 100% off (for beta testers)
- Set max redemptions to prevent unlimited use
- Set expiry date for urgency

Users enter codes on the Stripe-hosted Checkout page — no code needed on your end.

---

## SUPPORT & ANALYTICS (recommended additions)

- **Email**: Resend.com (free 3K emails/day) — send purchase confirmations
- **Analytics**: Posthog.com (free) — track conversion funnel
- **Support**: Crisp.chat (free tier) — live chat widget
- **Email list**: ConvertKit or Beehiiv — build audience

---

## TROUBLESHOOTING

**"Unauthorized" error on checkout:**
→ Clerk publishable key not updated in index.html

**Webhook not firing:**
→ Check Stripe Dashboard → Webhooks → Recent events for errors
→ Ensure `STRIPE_WEBHOOK_SECRET` matches exactly

**User has paid but can't access course:**
→ Check Supabase → Table Editor → user_access for their row
→ Manually insert a row if webhook failed: `INSERT INTO user_access (clerk_user_id, email, tier, access_level) VALUES ('user_xxx', 'email@x.com', 'full', 2);`

**Piston API rate limited:**
→ Self-host: `docker run -d -p 2000:2000 ghcr.io/engineer-man/piston`
→ Update PISTON_API in course.html to `http://localhost:2000/api/v2/piston`

---

## SCHEDULED AGENTS (GitHub Actions)

| Workflow | Schedule | Purpose |
|---|---|---|
| `daily-price-check.yml` | 06:00 UTC daily | Refresh `llm_models` from LiteLLM → powers `/api/models` calculator |
| `daily-jobs-check.yml` | 06:00 UTC daily | PM job listings across 4 ATS providers (Playwright+stealth for Ashby) |
| `daily-reminders.yml` | 15:00 UTC daily | Inactivity email reminders via `/api/send-reminders` |
| `daily-feedback-summary.yml` | 14:00 UTC daily | AI summary of new GitHub issues |
| `weekly-companies-sync.yml` | Mon 08:00 UTC | AI company discovery into Supabase (HN + YC) |
| `weekly-content-freshness.yml` | Mon 09:00 UTC | **Course content freshness audit** — URL health, deprecated model strings, pricing drift vs. `llm_models`, policy dates, resource recency, codeExample syntax, vendor announcements |

### Content Freshness Agent

Audits all 60 files in `public/days/day-NN.js` across 7 dimensions and files triage issues (label `content-freshness`, `drift:critical|major|minor`, `day-NN`). Label an issue `approved` to hand off to `auto-fix.yml` for automated patching.

**Reference grounding store** — every external URL cited by course content is captured in Supabase tables `content_references` + `content_reference_snapshots` with sha256 hashes, 2k-char excerpts, and Wayback archive URLs. AI checks use these snapshots as grounding so verdicts are source-backed.

**Before first run:** apply `scripts/migration-content-references.sql` in Supabase SQL Editor.

**Local commands:**
```bash
npm run freshness:dry      # Deterministic checks only, no writes, no network writes to Supabase
npm run freshness:check    # Full run (requires GITHUB_TOKEN + Supabase creds)
npm run freshness:backfill # URL capture + reference store only; skips AI + issue filing
```

**workflow_dispatch inputs:** `mode=full|backfill|dry`, `issue_cap` (default 20, severity-sorted).
