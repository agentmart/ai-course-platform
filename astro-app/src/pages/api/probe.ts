import type { APIRoute } from 'astro';

export const prerender = false;

// Minimal probe — no imports of supabase/clerk/handler. If this still 500s,
// the problem is in the Astro Cloudflare adapter itself, not our code.
export const GET: APIRoute = ({ locals }) => {
  // @ts-expect-error
  const env = locals?.runtime?.env ?? {};
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
    ].map((k) => [k, typeof env[k] === 'string' && env[k].length > 0]),
  );
  return new Response(
    JSON.stringify({ ok: true, env: present, bindings: Object.keys(env) }, null, 2),
    { headers: { 'content-type': 'application/json' } },
  );
};
