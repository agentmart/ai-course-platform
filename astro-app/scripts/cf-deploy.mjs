#!/usr/bin/env node
// Auto-deploys to Cloudflare Workers when running inside Workers Builds CI.
// Triggered by `npm run build` via the `postbuild` script.
// Local builds are a no-op (WORKERS_CI is unset) so devs aren't surprised.
import { spawnSync } from 'node:child_process';

if (process.env.WORKERS_CI !== '1') {
  console.log('[postbuild] WORKERS_CI not set — skipping deploy (local build).');
  process.exit(0);
}

console.log('[postbuild] WORKERS_CI=1 detected — running wrangler deploy...');
const result = spawnSync(
  'npx',
  [
    'wrangler',
    'deploy',
    '--config',
    'dist/server/wrangler.json',
    '--name',
    'ai-course-platform',
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
