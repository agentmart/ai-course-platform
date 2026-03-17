#!/usr/bin/env node
/**
 * scripts/fetch-ashby-playwright.mjs
 *
 * Playwright-based Ashby job board scraper — route interception approach.
 *
 * Why route interception instead of page.evaluate() fetch:
 *   Cloudflare blocks explicit fetch() calls from page.evaluate() because
 *   the request fingerprint differs from the page's own natural XHR calls.
 *   Route interception lets the PAGE make its own GraphQL call naturally on
 *   load, then we intercept and capture the response. Cloudflare never sees
 *   a second request — there's only the one the page always makes.
 *
 * Usage: node scripts/fetch-ashby-playwright.mjs slug1,slug2,...
 * Output (stdout): JSON { slug: Job[] | null }
 *   null = not found / blocked
 *   []   = valid company, no open roles
 */

import { chromium } from 'playwright';

const ASHBY_GRAPHQL_PATH = '**/non-user-graphql**';

function mapPosting(j, slug) {
  return {
    external_id: j.id,
    title:       j.title,
    department:  j.departmentName || null,
    location:    j.jobLocation?.name || null,
    remote:      j.isRemote || false,
    job_url:     j.externalLink || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
    ats_source:  'ashby',
  };
}

async function scrapeSlug(page, slug) {
  let capturedPostings = undefined; // undefined = not yet intercepted

  // Intercept the GraphQL call the page makes naturally on load.
  // We fulfil the route normally so the page continues to work,
  // but we capture the response body before passing it through.
  await page.route(ASHBY_GRAPHQL_PATH, async (route) => {
    try {
      const response = await route.fetch();
      let json;
      try { json = await response.json(); } catch { json = null; }
      capturedPostings = json?.data?.jobBoard?.jobPostings ?? null;
      await route.fulfill({ response });
    } catch {
      capturedPostings = null;
      await route.continue();
    }
  });

  try {
    await page.goto(`https://jobs.ashbyhq.com/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    // Poll for the intercept to fire — the page's own XHR will trigger it.
    // Max wait 15s to handle slow CF challenges or slow CI runners.
    const deadline = Date.now() + 15000;
    while (capturedPostings === undefined && Date.now() < deadline) {
      await page.waitForTimeout(300);
    }
  } catch (e) {
    process.stderr.write(`  [playwright] ${slug} navigation error: ${e.message}\n`);
  }

  await page.unroute(ASHBY_GRAPHQL_PATH).catch(() => {});

  if (capturedPostings === undefined || capturedPostings === null) return null;
  return capturedPostings.map(j => mapPosting(j, slug));
}

async function main() {
  const slugsArg = process.argv[2] || '';
  const slugs = slugsArg.split(',').map(s => s.trim()).filter(Boolean);

  if (!slugs.length) {
    process.stderr.write('Usage: node fetch-ashby-playwright.mjs slug1,slug2,...\n');
    process.exit(1);
  }

  process.stderr.write(`[playwright] Launching Chromium for ${slugs.length} Ashby slugs...\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 800 },
    // Mask headless signals
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  // Remove navigator.webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const results = {};

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    process.stderr.write(`  -> ${slug}\n`);
    const page = await context.newPage();
    results[slug] = await scrapeSlug(page, slug);
    const count = results[slug];
    process.stderr.write(`     ${count === null ? 'NULL' : `${count.length} jobs`}\n`);
    await page.close();
    // Pause between slugs — gives CF time to not flag burst requests
    if (i < slugs.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  process.stdout.write(JSON.stringify(results));
  const succeeded = Object.values(results).filter(v => v !== null).length;
  process.stderr.write(`\n[playwright] Done. ${succeeded}/${slugs.length} slugs succeeded.\n`);
}

main().catch(e => {
  process.stderr.write(`[playwright] Fatal: ${e.message}\n`);
  process.exit(1);
});
