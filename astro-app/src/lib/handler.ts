import type { APIContext } from 'astro';
import { verifyClerkToken, bearerToken, type ClerkUser } from './clerk';
import { getSupabaseAdmin, jsonResponse, corsHeaders, type SupabaseEnv } from './supabase';

export interface Env extends SupabaseEnv {
  CLERK_DOMAIN?: string;
  SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  PENDO_API_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  GITHUB_TOKEN?: string;
  RESEND_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

export function envFrom(locals: App.Locals): Env {
  // @ts-expect-error — Cloudflare adapter exposes runtime.env at runtime
  const cf = (locals?.runtime?.env ?? {}) as Env;
  // @ts-expect-error — fall back to import.meta.env in dev
  const im = (import.meta.env ?? {}) as Env;
  const pick = <K extends keyof Env>(k: K): Env[K] => cf[k] ?? im[k];
  return {
    CLERK_DOMAIN: pick('CLERK_DOMAIN'),
    SUPABASE_URL: pick('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: pick('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_ANON_KEY: pick('SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_APP_URL: pick('NEXT_PUBLIC_APP_URL'),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pick('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
    PENDO_API_KEY: pick('PENDO_API_KEY'),
    TURNSTILE_SITE_KEY: pick('TURNSTILE_SITE_KEY'),
    TURNSTILE_SECRET_KEY: pick('TURNSTILE_SECRET_KEY'),
    GITHUB_TOKEN: pick('GITHUB_TOKEN'),
    RESEND_API_KEY: pick('RESEND_API_KEY'),
    ANTHROPIC_API_KEY: pick('ANTHROPIC_API_KEY'),
    OPENAI_API_KEY: pick('OPENAI_API_KEY'),
  };
}

export function publicCors(env: Env) {
  return corsHeaders('*');
}

export function appCors(env: Env) {
  return corsHeaders(env.NEXT_PUBLIC_APP_URL ?? '*');
}

export async function withAuth(
  ctx: APIContext
): Promise<{ user: ClerkUser; env: Env; cors: Record<string, string> } | Response> {
  const env = envFrom(ctx.locals);
  const cors = appCors(env);
  try {
    const user = await verifyClerkToken(bearerToken(ctx.request), env);
    return { user, env, cors };
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }
}

export { jsonResponse, corsHeaders, getSupabaseAdmin };
