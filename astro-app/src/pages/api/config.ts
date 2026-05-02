import type { APIRoute } from 'astro';
import { envFrom } from '~/lib/handler';

export const prerender = false;

export const GET: APIRoute = ({ locals }) => {
  const env = envFrom(locals);
  return new Response(
    JSON.stringify({
      clerkPublishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '',
      clerkDomain: env.CLERK_DOMAIN ?? '',
      appUrl: env.NEXT_PUBLIC_APP_URL ?? '',
      supabaseUrl: env.SUPABASE_URL ?? '',
      supabaseAnonKey: env.SUPABASE_ANON_KEY ?? '',
      pendoApiKey: env.PENDO_API_KEY ?? '',
      turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? '',
    }),
    {
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=300',
      },
    }
  );
};
