#!/usr/bin/env node
/**
 * scripts/fetch-ashby-playwright.mjs
 *
 * Playwright-based Ashby job board scraper — network intercept approach.
 *
 * Why the previous page.evaluate() approach failed:
 *   Cloudflare detects navigator.webdriver=true in headless Chromium and
 *   silently returns null for jobBoard on ANY fetch call from that session,
 *   even ones made inside the browser context via page.evaluate().
 *
 * This version's approach — intercept the page's OWN network request:
 *   1. Register a response listener BEFORE navigating
 *   2. Navigate to jobs.ashbyhq.com/<slug> — the React SPA makes the
 *      GraphQL call itself as part of its normal render cycle
 *   3. Capture that response via page.on('response') — it's a legitimate
 *      browser-initiated request, Cloudflare can't distinguish it from human
 *   4. No second API call needed; we just read what the page already fetched
 *
 * Additionally hides automation signals via:
 *   - --disable-blink-features=AutomationControlled launch arg
 *   - context.addInitScript to delete navigator.webdriver
 *   - Realistic chrome object + plugin count spoofing
 *
 * Usage:  node scripts/fetch-ashby-playwright.mjs openai,cursor,harvey
 * Stdout: JSON { slug: Job[] | null, ... }
 *   null = page loaded but no GraphQL response captured (CF blocked or bad slug)
 *   []   = valid company, zero open roles right now
 */

import { chromium } from 'playwright';

async function scrapeSlug(page, slug) {
  return new Promise(async (resolve) => {
    let resolved = false;
    let capturedJobs = null;

    // Safety timeout — resolve null if nothing captured within 25s
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        process.stderr.write(`  [playwright] ${slug}: timeout — no GraphQL response captured\n`);
        resolve(null);
      }
    }, 25000);

    // Listen for the GraphQL response the page makes during its render cycle.
    // This fires before waitForLoadState resolves, so we catch it in-flight.
    page.on('response', async (response) => {
      try {
        if (!response.url().includes('non-user-graphql')) return;
        if (response.status() !== 200) return;

        const body = await response.json();
        const postings = body?.data?.jobBoard?.jobPostings;

        if (Array.isArray(postings)) {
          capturedJobs = postings.map(j => ({
            external_id: j.id,
            title:       j.title,
            department:  j.departmentName || null,
            location:    j.jobLocation?.name || null,
            remote:      j.isRemote || false,
            job_url:     j.externalLink || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
            ats_source:  'ashby',
          }));
          process.stderr.write(`  [playwright] ${slug}: captured ${capturedJobs.length} jobs\n`);
        } else {
          // Page loaded but Cloudflare returned null jobBoard
          process.stderr.write(`  [playwright] ${slug}: GraphQL returned null jobBoard\n`);
        }

        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(capturedJobs);
        }
      } catch (e) {
        // Response body parse error — not fatal, just skip
      }
    });

    try {
      await page.goto(`https://jobs.ashbyhq.com/${slug}`, {
        waitUntil: 'networkidle',
        timeout: 22000,
      });
    } catch (e) {
      process.stderr.write(`  [playwright] ${slug}: navigation error: ${e.message}\n`);
    }

    // If networkidle fired but response listener never resolved us
    // (e.g. page was a 404 or CF challenge with no GraphQL call)
    if (!resolved) {
      resolved = true;
      clearTimeout(timer);
      resolve(capturedJobs); // null if nothing captured
    }
  });
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
      // Hide automation signals — critical for Cloudflare bypass
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    viewport: { width: 1280, height: 800 },
  });

  // Spoof navigator properties that Cloudflare checks
  await context.addInitScript(() => {
    // Remove the webdriver flag — the #1 bot detection signal
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    // Fake plugin count — headless Chrome has 0 plugins
    Object.defineProperty(navigator, 'plugins', { get: () => ({ length: 3 }) });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    // Add chrome object that real Chrome has
    if (!window.chrome) window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
  });

  const results = {};

  for (const slug of slugs) {
    process.stderr.write(`  → ${slug}\n`);
    const page = await context.newPage();
    results[slug] = await scrapeSlug(page, slug);
    await page.close();
    if (slugs.indexOf(slug) < slugs.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
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
