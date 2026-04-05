# Project Guidelines

## Architecture

Static HTML/CSS/JS frontend + Vercel serverless API functions + Supabase PostgreSQL.

| Layer | Tech | Key Files |
|-------|------|-----------|
| Frontend | Vanilla HTML/CSS/JS | `public/course.html`, `public/index.html` |
| API | Vercel serverless (Node.js 18+) | `api/*.js` |
| Auth | Clerk (OIDC JWT) | `lib/clerk.js` |
| Database | Supabase (PostgreSQL, RLS) | `supabase-schema.sql` |
| Course Content | 60 day files | `public/days/day-NN.js` |
| Analytics | Pendo | Initialized post-auth in `course.html` |

No build step. Vercel serves `public/` as static files and `api/` as serverless functions.

## Build and Test

```bash
npm run sync:dry     # Test company sync (dry run, no DB writes)
npm run sync:live    # Weekly AI company discovery → Supabase
npm run jobs:check   # Daily PM job checker across 4 ATS providers
```

No test suite or linter configured. Deploy via `git push` to `main` → Vercel auto-deploys.

See [DEPLOY.md](../DEPLOY.md) for full setup, [PRODUCTION_CHECKLIST.md](../PRODUCTION_CHECKLIST.md) for launch steps.

## API Conventions

Every file in `api/` is a **standalone Vercel serverless function** (not Express).

- Export a single `default async function handler(req, res)`
- Check `req.method` manually; handle `OPTIONS` for CORS preflight
- Set CORS headers on every response: `Access-Control-Allow-Origin` from `NEXT_PUBLIC_APP_URL`
- Authenticate with Clerk JWT: `Authorization: Bearer <token>` → verify via `lib/clerk.js`
- Use `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` for DB operations
- Return JSON with appropriate HTTP status codes
- Cache public endpoints with `Cache-Control` headers (5 min for `/api/config`, `/api/companies`)

## Course Day Files

Files: `public/days/day-NN.js` (N = 1–60, day 26 is missing)

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

**Secret (server-only):** `CLERK_DOMAIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `PENDO_API_KEY`, `GITHUB_TOKEN`, `TURNSTILE_SECRET_KEY`

Never commit `.env`. Configure in Vercel dashboard for production.

## Conventions

- **No framework** — vanilla JS, no React/Vue/Svelte. Keep it that way.
- **No CSS framework** — custom properties for theming (dark nav, beige background, amber accents)
- **ES modules** — `import`/`export` in `.mjs` scripts; Vercel functions use CommonJS-style but support top-level await
- **User access** — all authenticated Clerk users get full 60-day access, no payment gating
- **Progress data** — stored as JSONB in `user_access.progress_data`, not in separate tables
