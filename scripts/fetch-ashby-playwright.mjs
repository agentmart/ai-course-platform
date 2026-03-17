#!/usr/bin/env node
/**
 * scripts/fetch-ashby-playwright.mjs
 *
 * Playwright-based Ashby job board scraper.
 *
 * Why Playwright instead of fetch():
 *   Ashby uses Cloudflare bot detection. Even with browser-like headers,
 *   Node fetch() gets a null jobBoard response because Cloudflare checks
 *   TLS fingerprinting and browser behavioral signals that fetch() can't fake.
 *
 *   Playwright launches a real Chromium instance, visits the Ashby page
 *   (acquiring Cloudflare clearance cookies), then calls the GraphQL endpoint
 *   FROM INSIDE the browser via page.evaluate(). The request carries real
 *   session cookies + correct same-origin headers — Cloudflare passes it.
 *
 * Usage (called as subprocess by daily-jobs-check.mjs):
 *   node scripts/fetch-ashby-playwright.mjs openai,cursor,harvey,perplexity
 *
 * Output (stdout): JSON object — { slug: Job[] | null, ... }
 *   null = slug not found or Cloudflare blocked
 *   []   = valid company, no open roles right now
 */

import { chromium } from 'playwright';

const GRAPHQL_QUERY = `
  query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
    jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
      jobPostings {
        id
        title
        isRemote
        departmentName
        jobLocation { name }
        externalLink
      }
    }
  }
`;

async function scrapeSlug(page, slug) {
  try {
    // Step 1: Visit the page — acquires Cloudflare clearance cookies
    await page.goto(`https://jobs.ashbyhq.com/${slug}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    // Step 2: Brief wait for CF challenge to resolve if present
    await page.waitForTimeout(1500);

    // Step 3: Call GraphQL from inside the browser context.
    // Relative URL → request goes through jobs.ashbyhq.com with the session
    // cookies the page just acquired. Cloudflare sees a legitimate browser session.
    const postings = await page.evaluate(async ({ slug, query }) => {
      try {
        const res = await fetch('/api/non-user-graphql?op=ApiJobBoardWithTeams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operationName: 'ApiJobBoardWithTeams',
            variables: { organizationHostedJobsPageName: slug },
            query,
          }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.data?.jobBoard?.jobPostings ?? null;
      } catch {
        return null;
      }
    }, { slug, query: GRAPHQL_QUERY });

    if (!Array.isArray(postings)) return null;

    return postings.map(j => ({
      external_id: j.id,
      title:       j.title,
      department:  j.departmentName || null,
      location:    j.jobLocation?.name || null,
      remote:      j.isRemote || false,
      job_url:     j.externalLink || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
      ats_source:  'ashby',
    }));
  } catch (e) {
    process.stderr.write(`  [playwright] ${slug}: ${e.message}\n`);
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

  process.stderr.write(`[playwright] Launching Chromium for ${slugs.length} Ashby slugs...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  const results = {};

  for (const slug of slugs) {
    process.stderr.write(`  → ${slug}\n`);
    const page = await context.newPage();
    results[slug] = await scrapeSlug(page, slug);
    await page.close();
    // Brief pause between slugs — avoids Cloudflare rate limits
    if (slugs.indexOf(slug) < slugs.length - 1) {
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  await browser.close();

  // Output JSON to stdout — parsed by daily-jobs-check.mjs
  process.stdout.write(JSON.stringify(results));
  const succeeded = Object.values(results).filter(v => v !== null).length;
  process.stderr.write(`\n[playwright] Done. ${succeeded}/${slugs.length} slugs succeeded.\n`);
}

main().catch(e => {
  process.stderr.write(`[playwright] Fatal: ${e.message}\n`);
  process.exit(1);
});
