import type { APIRoute } from 'astro';
// @ts-ignore — virtual module from @astrojs/cloudflare
import { env as cfEnv } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = () => {
  const env = (cfEnv ?? {}) as Record<string, unknown>;
  const present = Object.fromEntries(
    [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'CLERK_DOMAIN',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_APP_URL',
      'RESEND_API_KEY',
      'CRON_SECRET',
      'TURNSTILE_SECRET_KEY',
      'TURNSTILE_SITE_KEY',
      'PENDO_API_KEY',
    ].map((k) => [k, typeof env[k] === 'string' && (env[k] as string).length > 0]),
  );
  return new Response(
    JSON.stringify({ ok: true, env: present, bindings: Object.keys(env) }, null, 2),
    { headers: { 'content-type': 'application/json' } },
  );
};
