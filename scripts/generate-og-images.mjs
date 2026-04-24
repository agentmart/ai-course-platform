#!/usr/bin/env node
/**
 * Generate per-page OG images (1200x630) by rendering scripts/og-image-source.html
 * with query-string overrides through headless Chrome, then snapshotting.
 *
 * Usage:  node scripts/generate-og-images.mjs
 * Output: public/og-image.png (default) + public/og-{course,how-to,jobs,companies,pm-os}.png
 *
 * Requires Google Chrome installed at the standard macOS path.
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE = resolve(ROOT, 'scripts/og-image-source.html');
const OUT_DIR = resolve(ROOT, 'public');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

if (!existsSync(CHROME)) {
  console.error(`Chrome not found at: ${CHROME}`);
  process.exit(1);
}

// Each preset is rendered by appending the query string to the source file URL.
// Title accepts inline <em>…</em> for the amber italic accent (see CSS in source).
const PRESETS = [
  {
    out: 'og-image.png',
    // Default/hero — no query params = original generic design
    params: {},
  },
  {
    out: 'og-course.png',
    params: {
      eyebrow: 'THE 60-DAY AI PM COURSE',
      title: '60-Day <em>AI PM</em><br>Course.',
      sub: 'Ship real AI features with Claude, OpenAI, and Anthropic APIs.<br>PRDs, evals, LLM economics, and interview prep.',
      badge: 'Free · Hands-on',
      stats: '60|Days,240+|Hours,15+|Projects,$0|Cost',
    },
  },
  {
    out: 'og-how-to.png',
    params: {
      eyebrow: 'THE HONEST 2026 PLAYBOOK',
      title: 'How to become<br>an <em>AI PM</em>.',
      sub: 'The skills, the timeline, the portfolio, and the interviews.<br>Written by a working AI Product Manager.',
      badge: 'Updated for 2026',
      stats: '12|Weeks,6|Skills,100+|Jobs,$0|Cost',
    },
  },
  {
    out: 'og-jobs.png',
    params: {
      eyebrow: 'LIVE AI PM JOB TRACKER',
      title: 'AI <em>PM Jobs</em>.<br>Updated daily.',
      sub: '100+ AI-first companies. Pulled live from Greenhouse, Lever,<br>Ashby, and Workday. No dead links. No recruiter spam.',
      badge: 'Updated every 24h',
      stats: '100+|Companies,4|ATS Sources,Daily|Updated,Free|Access',
    },
  },
  {
    out: 'og-companies.png',
    params: {
      eyebrow: 'AI COMPANIES HIRING PMs',
      title: '100+ <em>AI companies</em><br>hiring PMs.',
      sub: 'OpenAI, Anthropic, Scale, Cohere, Mistral, Perplexity, and<br>every AI-first startup with open PM roles.',
      badge: 'Greenhouse · Lever · Ashby',
      stats: '100+|Companies,500+|Roles,4|ATS,Daily|Fresh',
    },
  },
  {
    out: 'og-pm-os.png',
    params: {
      eyebrow: 'PROMPT OPS FOR PMs',
      title: '<em>PM-OS</em>.<br>For Claude &amp; Copilot.',
      sub: 'Battle-tested prompts for PRDs, user research, roadmaps,<br>eval design, and stakeholder comms. Copy. Paste. Ship.',
      badge: 'Claude · Copilot · GPT',
      stats: '40+|Prompts,6|Workflows,$0|Cost,∞|Copies',
    },
  },
];

function toQueryString(params) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) u.set(k, v);
  return u.toString();
}

function render({ out, params }) {
  const outPath = resolve(OUT_DIR, out);
  const qs = toQueryString(params);
  const url = qs ? `file://${SOURCE}?${qs}` : `file://${SOURCE}`;
  console.log(`→ ${out}`);

  // Chrome writes to CWD as "screenshot.png" by default when --screenshot has no value.
  // We pass an explicit path to avoid that.
  // --virtual-time-budget waits for fonts/network before snapshotting.
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      `--screenshot=${outPath}`,
      '--window-size=1200,630',
      '--default-background-color=00000000',
      '--virtual-time-budget=5000',
      url,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );

  if (!existsSync(outPath)) {
    throw new Error(`Render failed: ${outPath} not created`);
  }
}

// Clean stale default screenshot if Chrome wrote one in CWD previously
const stale = resolve(process.cwd(), 'screenshot.png');
if (existsSync(stale)) rmSync(stale);

for (const preset of PRESETS) render(preset);

console.log(`\nDone. Wrote ${PRESETS.length} OG images to public/`);
