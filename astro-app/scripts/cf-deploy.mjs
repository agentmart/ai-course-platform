#!/usr/bin/env node
// Auto-deploys to Cloudflare Workers when running inside Workers Builds CI.
// Triggered by `npm run build` via the `postbuild` script.
// Local builds are a no-op (WORKERS_CI is unset) so devs aren't surprised.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CONFIG_PATH = 'dist/server/wrangler.json';

// The Astro Cloudflare adapter v13 generates wrangler.json with
// compatibility_flags: [] — but Supabase/Clerk/jose pull in node:crypto and
// node:buffer at module init, which crash the Worker without nodejs_compat.
// Patch the generated config to add the flag before deploying.
function patchConfig() {
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const flags = new Set(cfg.compatibility_flags ?? []);
  flags.add('nodejs_compat');
  cfg.compatibility_flags = [...flags];
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  console.log(`[postbuild] patched ${CONFIG_PATH}: compatibility_flags=${JSON.stringify(cfg.compatibility_flags)}`);
}

if (process.env.WORKERS_CI !== '1') {
  console.log('[postbuild] WORKERS_CI not set — skipping deploy (local build).');
  process.exit(0);
}

patchConfig();

console.log('[postbuild] WORKERS_CI=1 detected — running wrangler deploy...');
const result = spawnSync(
  'npx',
  [
    'wrangler',
    'deploy',
    '--config',
    CONFIG_PATH,
    '--name',
    'ai-course-platform',
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);

