#!/usr/bin/env node
/**
 * scripts/fetch-ashby-playwright.mjs
 *
 * Playwright-based Ashby scraper — waitForResponse approach.
 *
 * Key insight: don't make a secondary fetch() call (Cloudflare fingerprints it).
 * Instead, use page.waitForResponse() to observe the browser's OWN natural
 * GraphQL request that Ashby makes when the page loads. We're just a passive
 * observer of a request the page was always going to make.
 *
 * Usage: node scripts/fetch-ashby-playwright.mjs slug1,slug2,...
 * stdout: JSON { slug: Job[] | null }
 *   null = company not found or blocked
 *   []   = valid, no open roles
 */

import { chromium } from 'playwright';

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
  try {
    // Observe the browser's OWN GraphQL call — set up BEFORE navigation.
    // Filter specifically for ApiJobBoardWithTeams to avoid capturing
    // other unrelated GraphQL calls the page might make.
    const responsePromise = page.waitForResponse(
      async (resp) => {
        if (!resp.url().includes('non-user-graphql')) return false;
        if (resp.status() !== 200) return false;
        try {
          const body = resp.request().postData() || '';
          return body.includes('ApiJobBoardWithTeams');
        } catch {
          return true; // if we can't read the body, accept any graphql response
        }
      },
      { timeout: 25000 }
    );

    await page.goto(`https://jobs.ashbyhq.com/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    process.stderr.write(`     navigated → ${page.url()}\n`);

    // Await the intercepted response
    let response;
    try {
      response = await responsePromise;
    } catch (e) {
      process.stderr.write(`     waitForResponse timeout for ${slug}: ${e.message}\n`);
      process.stderr.write(`     page URL was: ${page.url()}\n`);
      // Log page title to detect Cloudflare challenge pages
      try {
        const title = await page.title();
        process.stderr.write(`     page title: ${title}\n`);
      } catch {}
      return null;
    }

    let json;
    try {
      json = await response.json();
    } catch (e) {
      process.stderr.write(`     JSON parse error for ${slug}: ${e.message}\n`);
      return null;
    }

    const postings = json?.data?.jobBoard?.jobPostings;

    if (!Array.isArray(postings)) {
      // Log a snippet to understand what came back
      process.stderr.write(`     unexpected response for ${slug}: ${JSON.stringify(json).slice(0, 300)}\n`);
      return null;
    }

    return postings.map(j => mapPosting(j, slug));
  } catch (e) {
    process.stderr.write(`  [playwright] ${slug} error: ${e.message}\n`);
    return null;
  }
}

async function main() {
  const slugsArg = process.argv[2] || '';
  const slugs = slugsArg.split(',').map(s => s.trim()).filter(Boolean);

  if (!slugs.length) {
    process.stderr.write('Usage: node fetch-ashby-playwright.mjs slug1,slug2,...\n');
    process.exit(1);
  }

  process.stderr.write(`[playwright] Launching Chromium for ${slugs.length} slugs...\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
  });

  // Mask navigator.webdriver — primary Cloudflare JS detection signal
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // Also mask chrome automation extension presence
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  });

  const results = {};

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    process.stderr.write(`  -> ${slug}\n`);
    const page = await context.newPage();
    results[slug] = await scrapeSlug(page, slug);
    const r = results[slug];
    process.stderr.write(`     result: ${r === null ? 'NULL' : `${r.length} jobs`}\n`);
    await page.close();
    if (i < slugs.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  // Write JSON to stdout — consumed by daily-jobs-check.mjs
  process.stdout.write(JSON.stringify(results));
  const ok = Object.values(results).filter(v => v !== null).length;
  process.stderr.write(`\n[playwright] Done. ${ok}/${slugs.length} succeeded.\n`);
}

main().catch(e => {
  process.stderr.write(`[playwright] Fatal: ${e.message}\n`);
  process.exit(1);
});
