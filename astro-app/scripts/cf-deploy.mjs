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
// Also: the auto-generated kv_namespaces[].id is missing, so the SESSION
// binding is broken at runtime. Patch both before deploying.
const SESSION_KV_ID = process.env.CF_SESSION_KV_ID || '901ac4b30ccc4c3099a02cfd6d031f6f';

function patchConfig() {
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

  const flags = new Set(cfg.compatibility_flags ?? []);
  flags.add('nodejs_compat');
  cfg.compatibility_flags = [...flags];

  if (Array.isArray(cfg.kv_namespaces)) {
    cfg.kv_namespaces = cfg.kv_namespaces.map((kv) =>
      kv.binding === 'SESSION' && !kv.id ? { ...kv, id: SESSION_KV_ID } : kv,
    );
  }

  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  console.log(`[postbuild] patched ${CONFIG_PATH}: compatibility_flags=${JSON.stringify(cfg.compatibility_flags)}, kv_namespaces=${JSON.stringify(cfg.kv_namespaces)}`);
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

