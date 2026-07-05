# Project Guidelines

## Architecture

> **Hosting: Cloudflare Workers (migrated off Vercel).** The live site
> `becomeaipm.com` is served by the Cloudflare Worker **`ai-course-platform`**
> (account `hello@becomeaipm.com`), built from the **Astro app in
> [`astro-app/`](../astro-app/)** — Astro 6 SSR (`output: 'server'`) +
> `@astrojs/cloudflare`, React islands, MDX content collection. **`astro-app/`
> is the canonical app**; see [`astro-app/AGENTS.md`](../astro-app/AGENTS.md)
> and [`astro-app/DEPLOY.md`](../astro-app/DEPLOY.md).
>
> The root `public/`, `api/*.js`, and `vercel.json` are **legacy Vercel
> artifacts** kept for reference/URL parity during cutover. The sections below
> describe that legacy structure — for new work, prefer `astro-app/`.

Legacy (Vercel) layout — static HTML/CSS/JS frontend + serverless API functions + Supabase PostgreSQL:

| Layer | Tech | Key Files |
|-------|------|-----------|
| Frontend | Vanilla HTML/CSS/JS | `public/course.html`, `public/index.html` |
| Navigation | Shared sidebar component | `public/components/nav.js`, `public/components/nav.css` |
| API (legacy) | Vercel serverless (Node.js 18+) | `api/*.js` |
| API (current) | Astro routes on Cloudflare Workers | `astro-app/src/pages/api/*.ts` |
| Auth | Clerk (OIDC JWT) | `lib/clerk.js` (legacy); `jose` + remote JWKS in astro-app |
| Database | Supabase (PostgreSQL, RLS) | `supabase-schema.sql` |
| Course Content | 60 day files → MDX collection | `public/days/day-NN.js` (legacy); `astro-app/src/content` (current) |
| Analytics | Pendo | Initialized post-auth in `course.html` |

Legacy had no build step (Vercel served `public/` static + `api/` functions). The current app **builds with Astro** and deploys as a single Cloudflare Worker.

## Build and Test

```bash
npm run sync:dry        # Test company sync (dry run, no DB writes)
npm run sync:live       # Weekly AI company discovery → Supabase
npm run jobs:check      # Daily PM job checker across ATS providers
npm run freshness:check # Content freshness / staleness check
npm run gaps:live       # Weekly curriculum gap detector
npm run notify:jobs     # Weekly job-alert emails
npm run notify:interview # Weekly interview-prep emails
```

Most scripts have a `:dry` variant (sets `DRY_RUN=true`, no DB/email writes) — see `package.json` for the full list.

No test suite or linter configured.

**Deploy (Cloudflare Workers):** the app deploys via **Workers Builds** (git-connected CI on Cloudflare) or manually with `cd astro-app && npm run deploy` (`astro build` → `wrangler deploy --config dist/server/wrangler.json --name ai-course-platform`). The `@astrojs/cloudflare` adapter auto-generates `dist/server/wrangler.json` (bindings: `ASSETS`, `IMAGES`, `SESSION` KV). Requires Node ≥ 20. Vercel git-push auto-deploy is **retired**.

See [DEPLOY.md](../DEPLOY.md) for full setup, [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) for launch steps.

## API Conventions

**Current:** API routes live in `astro-app/src/pages/api/*.ts` (Astro endpoints running on Cloudflare Workers, V8 isolates with `nodejs_compat`). Read env via the Worker runtime (`locals`/`env` binding), not `process.env`.

**Legacy (`api/*.js`, Vercel):** each file is a **standalone Vercel serverless function** (not Express).

- Export a single `default async function handler(req, res)`
- Check `req.method` manually; handle `OPTIONS` for CORS preflight
- Set CORS headers on every response: `Access-Control-Allow-Origin` from `NEXT_PUBLIC_APP_URL`
- Authenticate with Clerk JWT: `Authorization: Bearer <token>` → verify via `lib/clerk.js`
- Use `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` for DB operations
- Return JSON with appropriate HTTP status codes
- Cache public endpoints with `Cache-Control` headers (5 min for `/api/config`, `/api/companies`)

## Course Day Files

Files: `public/days/day-NN.js` (N = 1–60, all present)

Each file sets `window.COURSE_DAY_DATA[N]` with this structure:

```javascript
window.COURSE_DAY_DATA[N] = {
  subtitle:    "~100 chars, what you'll learn",
  context:     "~800 words HTML (<p>, <strong>, <code>, <a target='_blank'>)",
  tasks:       [/* exactly 4 */{ title, description, time /* 15-30 min */ }],
  codeExample: { title, lang: "python" | "js", code: "90-130 lines" },
  interview:   { question, answer /* HTML with <strong>, <code>, <br> */ },
  pmAngle:     "~100-150 words strategic PM context",
  resources:   [/* 5-7 */{ type, title, url, note }]
}
```

### Critical standards

- **Model strings**: Use current names — `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`
- **Pricing**: Never hardcode. Link to live pricing pages + provide formula
- **HTML only**: No markdown in `context`, `interview.answer`, or `pmAngle` — use `<p>`, `<strong>`, `<code>`, `<a>`
- **Resources**: Authoritative sources preferred (`docs.anthropic.com`, official docs). Types: `DOCS`, `BLOG`, `PRICING`, `PAPER`, `TOOL`
- **Code examples**: Executable, well-commented, include error handling. Python for ML/data topics, JS for web topics
- Day files override legacy `course-data-phase*.js` files. Track changes in `public/days/CHANGELOG.md`

## Environment Variables

**Public (safe for browser):** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`

**Secret (server-only):** `CLERK_DOMAIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `PENDO_API_KEY`, `TURNSTILE_SECRET_KEY`

**GitHub tokens (fine-grained PATs, both optional):**
- `GH_PAT_TOKEN` — powers the feedback/contact forms (`Issues: write` + `Projects: write` on `agentmart/ai-course-platform`). If unset, `/api/create-feedback` returns "Feedback system not configured"; everything else works.
- `GH_MODELS_TOKEN` — GitHub Models access for the course advisor (`Models: read`, account-level). Falls back to a static rationale if unset.

Never commit `.env`. For production, set vars on the **Cloudflare Worker** — dashboard (Workers & Pages → `ai-course-platform` → Settings → Variables) or `wrangler secret put <NAME>`. (Not the Vercel dashboard.) The **GitHub Actions cron workflows** use Actions' auto-injected `GITHUB_TOKEN` + repo secrets — configured in GitHub, independent of the Worker.

## Conventions

- **Legacy site = no framework** — the root `public/` pages are vanilla JS (no React/Vue/Svelte); keep them that way. **New work happens in `astro-app/`**, which intentionally uses **Astro + React islands + MDX** (see `astro-app/AGENTS.md`).
- **No CSS framework** — custom properties for theming (dark nav, beige background, amber accents)
- **Navigation (legacy)** — `public/` pages mount a shared sidebar: include `<aside id="app-nav"></aside>`, load `/components/nav.js`, then call `renderSidebar({ active: '<key>' })` (key from `NAV_ITEMS` in `nav.js`; omit/`{}` for no highlight). Do not hand-write inline `<nav>` blocks per page.
- **ES modules** — `import`/`export` in `.mjs` scripts; astro-app is TypeScript ESM; legacy Vercel functions use CommonJS-style but support top-level await
- **User access** — all authenticated Clerk users get full 60-day access, no payment gating
- **Progress data** — stored as JSONB in `user_access.progress_data`, not in separate tables
