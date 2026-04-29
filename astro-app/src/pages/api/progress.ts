import type { APIRoute } from 'astro';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';
import { getSupabaseAdmin, jsonResponse, corsHeaders } from '~/lib/supabase';

export const prerender = false;

interface Env {
  CLERK_DOMAIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

function envFrom(locals: App.Locals): Env {
  // @ts-expect-error — Cloudflare adapter exposes runtime.env at runtime
  const cfEnv = (locals?.runtime?.env ?? {}) as Env;
  return {
    CLERK_DOMAIN: cfEnv.CLERK_DOMAIN ?? import.meta.env.CLERK_DOMAIN,
    SUPABASE_URL: cfEnv.SUPABASE_URL ?? import.meta.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY:
      cfEnv.SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: cfEnv.NEXT_PUBLIC_APP_URL ?? import.meta.env.NEXT_PUBLIC_APP_URL,
  };
}

export const OPTIONS: APIRoute = ({ locals }) => {
  const env = envFrom(locals);
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env.NEXT_PUBLIC_APP_URL ?? '*'),
  });
};

export const GET: APIRoute = async ({ request, locals }) => {
  const env = envFrom(locals);
  const cors = corsHeaders(env.NEXT_PUBLIC_APP_URL ?? '*');

  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const supabase = getSupabaseAdmin(env);
  await supabase.from('user_access').upsert(
    {
      clerk_user_id: user.sub,
      email: user.email ?? null,
      tier: 'free',
      access_level: 2,
      granted_at: new Date().toISOString(),
    },
    { onConflict: 'clerk_user_id', ignoreDuplicates: true }
  );

  const { data: access } = await supabase
    .from('user_access')
    .select('progress_data')
    .eq('clerk_user_id', user.sub)
    .single();

  return jsonResponse(
    access?.progress_data ?? { completed: [], taskStates: {}, notes: {} },
    { headers: cors }
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  const env = envFrom(locals);
  const cors = corsHeaders(env.NEXT_PUBLIC_APP_URL ?? '*');

  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const { completed, taskStates, notes } = body as {
    completed?: number[];
    taskStates?: Record<string, unknown>;
    notes?: Record<string, unknown>;
  };

  const supabase = getSupabaseAdmin(env);

  // Append today's ISO date (UTC) to completion_dates[] when a NEW day is marked done.
  // Sprint 5 (gamification) reads this for streaks and badges.
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from('user_access')
    .select('progress_data')
    .eq('clerk_user_id', user.sub)
    .single();

  const prev = (existing?.progress_data ?? {}) as Record<string, unknown>;
  const prevCompleted = Array.isArray(prev.completed) ? (prev.completed as number[]) : [];
  const prevDates = Array.isArray(prev.completion_dates)
    ? (prev.completion_dates as string[])
    : [];
  const newDay = (completed ?? []).find((d) => !prevCompleted.includes(d));
  const completion_dates = newDay && !prevDates.includes(today) ? [...prevDates, today] : prevDates;

  const merged = {
    ...prev,
    completed: completed ?? prevCompleted,
    taskStates: taskStates ?? prev.taskStates ?? {},
    notes: notes ?? prev.notes ?? {},
    completion_dates,
  };

  const { error } = await supabase
    .from('user_access')
    .update({ progress_data: merged, updated_at: new Date().toISOString() })
    .eq('clerk_user_id', user.sub);

  if (error) return jsonResponse({ error: 'Failed to save progress' }, { status: 500, headers: cors });
  return jsonResponse({ ok: true, completion_dates }, { headers: cors });
};
