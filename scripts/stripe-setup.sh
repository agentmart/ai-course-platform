#!/usr/bin/env bash
# =============================================================
# becomeaipm.com — Stripe Subscription Products Setup
# Run once with Stripe CLI authenticated (stripe login).
# =============================================================
set -e

echo ""
echo "🔧 Creating becomeaipm.com subscription products in Stripe..."
echo ""

# ----- MONTHLY PLAN -----
MONTHLY_PRODUCT=$(stripe products create \
  --name="becomeaipm.com Monthly" \
  --description="All 60 days, progress tracking, save jobs, Slack community" \
  --metadata[platform]="becomeaipm" \
  --metadata[tier]="monthly" \
  --format=json | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo "✅ Monthly product: $MONTHLY_PRODUCT"

MONTHLY_PRICE=$(stripe prices create \
  --product="$MONTHLY_PRODUCT" \
  --unit-amount=900 \
  --currency=usd \
  --recurring[interval]=month \
  --metadata[tier]="monthly" \
  --format=json | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo "✅ Monthly price: $MONTHLY_PRICE  ← STRIPE_PRICE_MONTHLY"
echo ""

# ----- ANNUAL PLAN -----
ANNUAL_PRODUCT=$(stripe products create \
  --name="becomeaipm.com Annual" \
  --description="All 60 days + completion certificate, billed yearly" \
  --metadata[platform]="becomeaipm" \
  --metadata[tier]="annual" \
  --format=json | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo "✅ Annual product: $ANNUAL_PRODUCT"

ANNUAL_PRICE=$(stripe prices create \
  --product="$ANNUAL_PRODUCT" \
  --unit-amount=8400 \
  --currency=usd \
  --recurring[interval]=year \
  --metadata[tier]="annual" \
  --format=json | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo "✅ Annual price: $ANNUAL_PRICE  ← STRIPE_PRICE_ANNUAL"
echo ""

# ----- OUTPUT ENV VARS -----
echo "============================================================"
echo "  Copy these into Vercel env vars (or run the lines below)"
echo "============================================================"
echo ""
echo "  STRIPE_PRICE_MONTHLY=$MONTHLY_PRICE"
echo "  STRIPE_PRICE_ANNUAL=$ANNUAL_PRICE"
echo ""
echo "  # Push to Vercel production:"
echo "  vercel env add STRIPE_PRICE_MONTHLY production <<< \"$MONTHLY_PRICE\""
echo "  vercel env add STRIPE_PRICE_ANNUAL production  <<< \"$ANNUAL_PRICE\""
echo ""
echo "Done! Now update your Stripe webhook events and enable Billing Portal."
