#!/usr/bin/env node
/**
 * scripts/fetch-ashby-playwright.mjs
 *
 * Playwright-based Ashby scraper — intercept strategy.
 *
 * Why route interception instead of page.evaluate fetch:
 *   Cloudflare serves a JS challenge page on first visit. The page "loads"
 *   (domcontentloaded fires, goto resolves) but is still a CF challenge —
 *   not Ashby content. Our manual fetch inside page.evaluate fires immediately
 *   after the 1500ms wait and hits CF before the challenge resolves.
 *
 *   Instead, we use page.route() to intercept Ashby's OWN GraphQL call
 *   as their React app loads. When CF resolves and Ashby renders, their
 *   JS makes the GraphQL request — we capture that response instead of
 *   making our own. No racing the challenge timer.
 *
 * Stealth measures applied:
 *   - --disable-blink-features=AutomationControlled (hides automation flag)
 *   - navigator.webdriver patched to undefined via addInitScript
 *   - window.chrome stub added
 *   - Realistic Chrome UA + locale + timezone
 *
 * Usage: node scripts/fetch-ashby-playwright.mjs slug1,slug2,...
 * Output (stdout): JSON { slug: Job[] | null, ... }
 *   null = not found or CF blocked after all retries
 *   []   = valid company, zero open roles
 */

import { chromium } from 'playwright';

async function scrapeSlug(context, slug) {
  const page = await context.newPage();
  let captured = null;

  try {
    // Intercept Ashby's own GraphQL call as the page loads naturally.
    // This fires AFTER CF resolves and Ashby's React app runs — no racing.
    await page.route('**/non-user-graphql**', async (route) => {
      try {
        const response = await route.fetch();
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          const postings = json?.data?.jobBoard?.jobPostings;
          if (Array.isArray(postings)) captured = postings;
        } catch { /* JSON parse failed */ }
        await route.fulfill({ response, body: text });
      } catch {
        await route.continue();
      }
    });

    // networkidle waits for all XHRs to settle, including Ashby's GraphQL call.
    // This naturally handles CF JS challenges — we wait until the real page loads.
    await page.goto(`https://jobs.ashbyhq.com/${slug}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Extra buffer if the GraphQL call came in just before networkidle fired
    if (!captured) {
      await page.waitForTimeout(2000);
    }

    if (!Array.isArray(captured)) return null;

    return captured.map(j => ({
      external_id: j.id,
      title:       j.title,
      department:  j.departmentName || null,
      location:    j.jobLocation?.name || null,
      remote:      j.isRemote || false,
      job_url:     j.externalLink || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      ats_source:  'ashby',
    }));
  } catch (e) {
    process.stderr.write(`  [playwright] ${slug} error: ${e.message}\n`);
    return null;
  } finally {
    await page.close();
  }
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
  });

  // Patch automation-detection properties before any page script runs
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {}, app: {} };
  });

  const results = {};

  for (const slug of slugs) {
    process.stderr.write(`  -> ${slug}\n`);
    results[slug] = await scrapeSlug(context, slug);
    const count = results[slug] === null ? 'null' : results[slug].length;
    process.stderr.write(`     ${slug}: ${count}\n`);
    // Pause between slugs to avoid Cloudflare rate limits
    if (slug !== slugs[slugs.length - 1]) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  await browser.close();

  const succeeded = Object.values(results).filter(v => v !== null).length;
  process.stderr.write(`[playwright] Done. ${succeeded}/${slugs.length} slugs succeeded.\n`);

  // Write JSON to stdout — consumed by daily-jobs-check.mjs via execFile callback
  // IMPORTANT: nothing else should write to stdout in this process
  process.stdout.write(JSON.stringify(results));
}

main().catch(e => {
  process.stderr.write(`[playwright] Fatal: ${e.message}\n`);
  process.exit(1);
});
