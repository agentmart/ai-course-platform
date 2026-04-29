# Astro + Cloudflare Pages Deploy Runbook

This is the Sprint 4 deployment plan for migrating becomeaipm.com from Vercel to Cloudflare Pages with Astro.

## Why we're moving

- **Vercel Hobby 12-fn cap** — we hit it. Cloudflare bundles all endpoints into a single Worker, so no cap.
- **Content maintainability** — 60 hand-edited `day-NN.js` files → MDX content collection with Zod-validated frontmatter.
- **Cost** — Cloudflare Pages free tier is genuinely free at our traffic.

## Architecture after migration

| Layer | Tech | Notes |
|-------|------|-------|
| Hosting | Cloudflare Pages | One Worker bundles all API + page handlers |
| Framework | Astro 6 (`output: 'server'`) + `@astrojs/cloudflare` | React islands, MDX content collection |
| Static assets | `astro-app/public/` | Legacy HTML pages still served from here for URL parity during cutover |
| API | `astro-app/src/pages/api/*.ts` | 12 ports of the original `api/*.js` |
| DB | Supabase | Unchanged |
| Auth | Clerk | Unchanged (verified server-side via `jose` + remote JWKS) |
| Email | Resend | Unchanged |

## Step-by-step deploy

### 1. One-time Cloudflare project setup

1. Log into Cloudflare → Workers & Pages → Create → Pages → Connect to Git
2. Repo: `agentmart/ai-course-platform`
3. Production branch: `main` (will switch from `feat/astro-migration` after squash-merge)
4. Build settings:
   - **Framework preset**: `Astro`
   - **Build command**: `cd astro-app && npm install && npm run build`
   - **Build output directory**: `astro-app/dist`
   - **Root directory**: leave empty (project root)
   - **Compatibility flags**: `nodejs_compat` (required — Astro server output uses Node APIs that the Workers runtime exposes only when this flag is set)
   - **Compatibility date**: `2024-09-23` or newer
   - **Environment variable** `NODE_VERSION = 20` (Astro 6 + `@astrojs/cloudflare@13` require Node ≥ 20). The `astro-app/.nvmrc` and `engines.node` field also pin this.
5. Environment variables (Production + Preview both):

   | Var | Source |
   |-----|--------|
   | `CLERK_DOMAIN` | from current Vercel |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | from current Vercel |
   | `NEXT_PUBLIC_APP_URL` | `https://<branch>.becomeaipm.pages.dev` for preview, `https://becomeaipm.com` after cutover |
   | `SUPABASE_URL` | from current Vercel |
   | `SUPABASE_SERVICE_ROLE_KEY` | from current Vercel |
   | `SUPABASE_ANON_KEY` | from current Vercel |
   | `RESEND_API_KEY` | from current Vercel |
   | `CRON_SECRET` | from current Vercel |
   | `GH_PAT_TOKEN` | from current Vercel (feedback issues) |
   | `GH_MODELS_TOKEN` | from current Vercel (course advisor LLM) |
   | `TURNSTILE_SECRET_KEY` | from current Vercel (contact form) |

### 1.b Common build-failure causes (fix these before re-running)

| Symptom | Fix |
|---|---|
| `Cannot find module 'resend'` | `astro-app/package.json` must list `resend` (added). Run `npm install` to refresh `package-lock.json` before pushing. |
| `Process #unstable_enableNodejsCompat is not enabled` or `node:crypto / node:buffer not found` | Add `nodejs_compat` to **Compatibility flags** in CF Pages → Settings → Functions. |
| `engine "node" requires Node >=20` | Set `NODE_VERSION=20` env var on the project (production + preview). |
| `cannot find package "@astrojs/cloudflare"` | The build runs from repo root; ensure build command does `cd astro-app && npm install && npm run build` — not just `npm run build` at root. |
| `Module not found: cloudflare:workers` | Means the adapter wasn't loaded. Verify `astro.config.mjs` has `import cloudflare from '@astrojs/cloudflare'` and `output: 'server'`. |
| Build wedges at "Detecting framework" | CF Pages auto-detected Vercel. Manually pick `Astro` preset. |

### 2. Preview deploy (no DNS impact)

- Push `feat/astro-migration` (already done at SHA 5440409)
- Cloudflare auto-builds → `https://feat-astro-migration.becomeaipm.pages.dev`
- Run parity QA against the preview URL (see "Parity QA checklist" below)

### 3. Parity QA checklist

Verify on the preview URL before flipping DNS:

- [ ] `/` loads, Clerk sign-in flow works
- [ ] `/course.html` loads day 1, JS fetches `/api/check-access`, `/api/progress`, `/api/config`
- [ ] `/course/1` (new MDX route) renders day 1 content (frontmatter HTML)
- [ ] `/companies.html` lists companies, jobs link tracking via `/api/track-click`
- [ ] `/settings.html` loads prefs via `/api/notification-prefs`
- [ ] `/contact.html` Turnstile + GitHub issue creation via `/api/contact`
- [ ] `/ai-calculator.html` lists models via `/api/models`
- [ ] Authenticated `POST /api/progress` writes to Supabase `user_access`
- [ ] Authenticated `POST /api/course-advisor` runs LLM advisor + persists
- [ ] `GET /api/leaderboard` shows current top learners (compare to prod)
- [ ] `GET /api/gaps` returns content_gaps rows
- [ ] `POST /api/welcome-email` (after fresh signup) hits Resend
- [ ] `GET /api/unsubscribe?token=...&kind=all` returns unsubscribe HTML

### 4. Cron port (no code change needed)

The GitHub Actions workflows that hit HTTP endpoints already use `APP_BASE_URL` / `NEXT_PUBLIC_APP_URL` as repo secrets:

- `.github/workflows/daily-reminders.yml` → `${APP_BASE_URL}/api/send-reminders`
- `.github/workflows/daily-price-check.yml` → `${APP_BASE_URL}/api/models`

Plan: when ready to cut over, **temporarily** add a `APP_BASE_URL_NEXT` secret pointing at the Cloudflare preview, run a one-off manual dispatch of each cron against the preview to validate, then on cutover day update `APP_BASE_URL` itself.

The notification-related crons (`weekly-notifications.yml`) run as Node scripts that talk to Resend/Supabase directly — no HTTP endpoint dependency, no change.

### 5. DNS cutover runbook

**Pre-flight (T-1 day):**
1. Final preview parity QA pass (checklist above)
2. Snapshot `user_access` and `notification_prefs` row counts so we can sanity-check post-cutover
3. Communicate cutover window (low-traffic hours, e.g. Sunday 04:00 UTC)

**Cutover (T-0):**
1. Cloudflare Pages → custom domain → add `becomeaipm.com` and `www.becomeaipm.com` to the Pages project (DNS config via the same Cloudflare zone — instant since CF manages DNS)
2. Vercel → remove production domain claim on `becomeaipm.com` (after CF takes over)
3. Update repo secrets: `APP_BASE_URL = https://becomeaipm.com` (already correct), but verify
4. Disable Vercel auto-deploys on `main` (Project → Settings → Git → Production branch → Disconnect)
5. Smoke test prod: signed-out load, signed-in load, one progress write, one company-jobs fetch
6. Watch Cloudflare Pages real-time logs and Supabase logs for 30 min

**Rollback:**
- Re-add domain claim on Vercel + lower TTL beforehand → flip back in <5 min
- Cloudflare Pages preserves the previous deployment, so we can redeploy a known-good version with one click if a bad commit lands later

### 6. Post-cutover cleanup (separate PR, ~1 week after)

- Delete root `api/`, `lib/`, `public/`, `vercel.json`
- Move `astro-app/*` to repo root
- Remove Vercel build output config

This is intentionally NOT done as part of the migration commit — keeping the legacy code around as a fast rollback escape hatch for the first week.

## Operational notes

- **Cold starts**: Cloudflare Workers cold-start < 5 ms (vs. Vercel Lambda 200-1000 ms), so `course-advisor` LLM calls and `models` LiteLLM fetches will feel snappier.
- **Logs**: Cloudflare Pages Functions stream to `wrangler tail` or the dashboard real-time tab. There is no historical log retention on the free plan — pipe critical errors to Supabase via existing `console.error` if needed.
- **Image processing**: enabled on the adapter; if we later use `<Image>` Astro will route through Cloudflare Images binding.
- **Sessions KV binding**: enabled on the adapter — not used yet, but available if we ever need anonymous-state storage.

## Blockers and known follow-ups

| Item | Sprint |
|------|--------|
| Per-page Astro idiomatic refactor (replace static HTML pages with `.astro` + islands) | Sprint 4 polish |
| Sprint 5 — gamification overlay (streaks, badges, share-cards, pledge, daily-nudge) | Sprint 5 |
| Sprint 6 — 28-day "AI PM Sprint" track | Sprint 6 |
| Sprint 7 — LangChain.js + LangGraph.js real agents | Sprint 7 |
