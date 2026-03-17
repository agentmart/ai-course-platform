#!/usr/bin/env node
/**
 * scripts/fetch-ashby-playwright.mjs
 *
 * Playwright + stealth plugin Ashby scraper.
 *
 * Why playwright-extra + stealth:
 *   Cloudflare blocks headless Chromium via multiple fingerprinting vectors:
 *   TLS fingerprint, canvas entropy, WebGL vendor, permission APIs, navigator
 *   properties, iframe contentWindow, hairline features, etc.
 *   Manual navigator.webdriver spoofing only patches one signal.
 *   playwright-extra-plugin-stealth patches ~20 detection vectors simultaneously,
 *   making headless Chromium indistinguishable from a real Chrome browser.
 *
 * Strategy — intercept the page's OWN network request:
 *   1. Register response listener BEFORE navigating
 *   2. Navigate to jobs.ashbyhq.com/<slug> — Ashby's React SPA fires the
 *      GraphQL call itself as part of its render cycle
 *   3. Capture that response via page.on('response') — legitimate browser
 *      request, Cloudflare passes it because stealth makes us look real
 *   4. No second API call needed — we just read what the page already fetched
 *
 * Usage:  node scripts/fetch-ashby-playwright.mjs openai,cursor,harvey
 * Stdout: JSON { slug: Job[] | null, ... }
 *   null = CF blocked or invalid slug
 *   []   = valid company, zero open roles right now
 */

import { chromium } from 'playwright-extra';
import StealthPlugin from 'playwright-extra-plugin-stealth';

chromium.use(StealthPlugin());

async function scrapeSlug(page, slug) {
  return new Promise(async (resolve) => {
    let resolved = false;
    let capturedJobs = null;

    const done = (jobs, reason) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      if (reason) process.stderr.write(`  [playwright] ${slug}: ${reason}\n`);
      resolve(jobs);
    };

    // Safety net — resolve null if nothing captured within 28s
    const timer = setTimeout(() => done(null, 'timeout — no GraphQL response captured'), 28000);

    // Intercept the GraphQL response Ashby fires during its render cycle
    page.on('response', async (response) => {
      try {
        if (!response.url().includes('non-user-graphql')) return;
        if (response.status() !== 200) {
          return done(null, `GraphQL HTTP ${response.status()}`);
        }
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
          process.stderr.write(`  [playwright] ${slug}: ${capturedJobs.length} jobs\n`);
          done(capturedJobs, null);
        } else {
          done(null, 'GraphQL responded but jobBoard is null (CF challenge or bad slug)');
        }
      } catch (e) {
        done(null, `response parse error: ${e.message}`);
      }
    });

    try {
      await page.goto(`https://jobs.ashbyhq.com/${slug}`, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });
      // Wait up to 8s for the React SPA to boot and fire the GraphQL call
      await page.waitForTimeout(8000);
    } catch (e) {
      process.stderr.write(`  [playwright] ${slug}: navigation: ${e.message}\n`);
    }

    // If we reach here and haven't resolved, no GraphQL call was intercepted
    done(capturedJobs, capturedJobs === null ? 'page loaded but no GraphQL call captured' : null);
  });
}

async function main() {
  const slugsArg = process.argv[2] || '';
  const slugs = slugsArg.split(',').map(s => s.trim()).filter(Boolean);

  if (!slugs.length) {
    process.stderr.write('Usage: node fetch-ashby-playwright.mjs slug1,slug2,...\n');
    process.exit(1);
  }

  process.stderr.write(`[playwright] Launching Chromium (stealth) for ${slugs.length} slugs...\n`);

  const browser = await chromium.launch({
    headless: true,
    args: [
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
