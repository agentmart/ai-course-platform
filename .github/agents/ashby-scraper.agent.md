---
name: Ashby Job Scraper
description: Playwright-based agent for scraping Ashby job boards. Uses real Chromium to bypass Cloudflare bot detection on jobs.ashbyhq.com. Invoke when daily-jobs-check shows 'not found' for Ashby companies.
tools: ["read", "run_terminal_command"]
---

# Ashby Job Scraper Agent

You are a specialist agent for debugging and running the Playwright-based Ashby scraper.

## Why Playwright for Ashby

Ashby uses Cloudflare bot detection. Direct `fetch()` calls — even with full browser-like headers — return `null` for `jobBoard` because Cloudflare checks TLS fingerprinting and browser behavioral signals that Node.js cannot fake.

Our solution (`scripts/fetch-ashby-playwright.mjs`):
1. Launch headless Chromium (real browser, real TLS fingerprint)
2. Navigate to `jobs.ashbyhq.com/${slug}` — acquires Cloudflare clearance cookies
3. Call GraphQL via `page.evaluate()` FROM INSIDE the browser context
4. Request carries real cookies + same-origin headers → Cloudflare passes it

## Debugging a failing slug

```bash
# Install Chromium first (one-time)
npx playwright install chromium --with-deps

# Test a single slug
node scripts/fetch-ashby-playwright.mjs openai

# Test multiple slugs
node scripts/fetch-ashby-playwright.mjs openai,cursor,harvey,perplexity

# Expected stdout: JSON { "openai": [...jobs], "cursor": [...], ... }
# null  = slug wrong or Cloudflare blocked
# []    = valid company, no open roles
```

## Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `null` for ALL slugs | Chromium not installed | `npx playwright install chromium --with-deps` |
| `null` for ONE slug | Slug changed or company inactive | Visit `jobs.ashbyhq.com/<slug>` manually |
| Timeout on CI | Slow runner or CF challenge | Increase `waitForTimeout` in scraper |
| `execFile` error | Path resolution issue | Check `__dirname` in ESM context |

## Adding a new Ashby company

1. Verify the slug: visit `https://jobs.ashbyhq.com/<slug>` in a browser
2. Add to `KNOWN_COMPANIES` in `daily-jobs-check.mjs`: `{ name: 'Company', ashby: 'slug' }`
3. The DB will auto-update on the next successful run

## Key distinction

- `null` = company not found or Cloudflare blocked the session → investigate
- `[]` = company exists, zero open roles right now → expected, not an error
