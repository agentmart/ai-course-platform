# ai-course-platform-astro

Astro 5 + React + Cloudflare Pages migration of becomeaipm.com.

**Status: Sprint 4 (foundation) — in progress.**

## What's here

- `src/content/days/` — 60 day files migrated from `../public/days/day-NN.js` via `scripts/codemod-days.mjs`. Pure MDX with Zod-validated frontmatter (`src/content.config.ts`).
- `src/pages/course/` — dynamic routes (`/course/[day]`) rendering days from the content collection.
- `src/pages/api/progress.ts` — first API endpoint ported from `../api/progress.js`. Adds `completion_dates[]` for Sprint 5 streak tracking.
- `src/lib/clerk.ts`, `src/lib/supabase.ts` — TypeScript ports of the existing libs, runtime-aware (Cloudflare Workers `locals.runtime.env`).
- Cloudflare adapter configured (`astro.config.mjs`).

## Build / dev

```bash
npm install
npm run dev      # local dev server on http://localhost:4321
npm run build    # produces dist/ for Cloudflare Pages

# Re-run the day-file codemod after edits to ../public/days/day-NN.js:
node scripts/codemod-days.mjs
```

## Migration plan

See `~/.copilot/session-state/.../plan.md`. Current sprint: 4 (Astro foundation, no new features). Next: Sprint 5 (gamification overlay) on top of the same `feat/astro-migration` branch.

## Notes

- **Day content body**: Existing 60 day files have legacy HTML in `context` (mixed inline/block markup, inconsistent self-closing). To avoid an ongoing MDX-parse-error whack-a-mole, the codemod stores `context` as a YAML-frontmatter string and the page renders it via `set:html`. New days authored from scratch can use real MDX bodies — the schema accepts both.
- Day 26 was reported "missing" in repo memory but all 60 source files exist; the codemod migrates all 60.
- Env vars on Cloudflare Pages must include: `CLERK_DOMAIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, plus the others used by the API (Clerk publishable key, Pendo, Resend, etc).
