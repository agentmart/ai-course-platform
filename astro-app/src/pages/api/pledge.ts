// Sprint 5 — public pledge endpoint.
//
// POST   /api/pledge                       — create pledge (auth required)
// GET    /api/pledge?token=<token>         — fetch pledge (public, by token)
// PATCH  /api/pledge                       — mark pledge fulfilled (auth, owner only)
//
// Pledge URL pattern: /pledge/<token>      (rendered by pledge/[token].astro)
// OG image:           /api/share-card?type=pledge&...
//
// Schema lives in scripts/migration-sprint5-gamification.sql.

import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';

export const prerender = false;

function randomToken(byteLen = 18): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  // base36 keeps the URL pleasant and short
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

function sanitizeText(s: unknown, max: number): string {
  if (typeof s !== 'string') return '';
  return s.replace(/\s+/g, ' ').trim().slice(0, max);
}

function isIsoDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const corsHdrs = (env: any) => ({ ...appCors(env), 'cache-control': 'no-store' });

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: corsHdrs(envFrom(locals)) });

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = corsHdrs(env);

  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const display_name = sanitizeText(body.display_name, 80);
  const pledge_text = sanitizeText(body.pledge_text, 240);
  const target_date = isIsoDate(body.target_date) ? body.target_date : null;
  const track = body.track === 'full' ? 'full' : 'sprint';

  if (!display_name || !pledge_text || !target_date) {
    return jsonResponse(
      { error: 'display_name, pledge_text and target_date (YYYY-MM-DD) are required' },
      { status: 400, headers: cors }
    );
  }
  // Sanity check: target between today and 18 months out.
  const todayMs = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  const targetMs = Date.parse(target_date + 'T00:00:00Z');
  if (!Number.isFinite(targetMs) || targetMs < todayMs || targetMs - todayMs > 540 * 86_400_000) {
    return jsonResponse(
      { error: 'target_date must be between today and 18 months from now' },
      { status: 400, headers: cors }
    );
  }

  const supabase = getSupabaseAdmin(env);
  const token = randomToken();
  const { data, error } = await supabase
    .from('pledges')
    .insert({
      token,
      clerk_user_id: user.sub,
      display_name,
      pledge_text,
      track,
      target_date,
    })
    .select('token, target_date, track')
    .single();

  if (error) {
    console.error('[pledge] insert error', error);
    return jsonResponse({ error: 'Failed to create pledge' }, { status: 500, headers: cors });
  }

  const appUrl = (env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  return jsonResponse(
    { token: data.token, url: `${appUrl}/pledge/${data.token}` },
    { headers: cors }
  );
};

export const GET: APIRoute = async ({ locals, request, url }) => {
  const env = envFrom(locals);
  const cors = corsHdrs(env);

  // Auth path: /api/pledge?mine=1 returns the signed-in user's most recent pledge.
  if (url.searchParams.get('mine') === '1') {
    let user;
    try {
      user = await verifyClerkToken(bearerToken(request), env);
    } catch {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
    }
    const supabase = getSupabaseAdmin(env);
    const { data, error } = await supabase
      .from('pledges')
      .select('token, display_name, pledge_text, track, start_date, target_date, demo_url, demo_completed_at, created_at')
      .eq('clerk_user_id', user.sub)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[pledge] mine error', error);
      return jsonResponse({ error: 'Lookup failed' }, { status: 500, headers: cors });
    }
    return jsonResponse(data ?? null, { headers: cors });
  }

  const token = url.searchParams.get('token');
  if (!token) return jsonResponse({ error: 'token required' }, { status: 400, headers: cors });

  const supabase = getSupabaseAdmin(env);
  const { data, error } = await supabase
    .from('pledges')
    .select('token, display_name, pledge_text, track, start_date, target_date, demo_url, demo_completed_at, created_at')
    .eq('token', token)
    .maybeSingle();

  if (error) {
    console.error('[pledge] get error', error);
    return jsonResponse({ error: 'Lookup failed' }, { status: 500, headers: cors });
  }
  if (!data) return jsonResponse({ error: 'Not found' }, { status: 404, headers: cors });

  return jsonResponse(data, {
    headers: { ...cors, 'cache-control': 'public, max-age=300, s-maxage=300' },
  });
};

export const PATCH: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = corsHdrs(env);

  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token : '';
  if (!token) return jsonResponse({ error: 'token required' }, { status: 400, headers: cors });

  const demo_url = sanitizeText(body.demo_url, 500);
  if (!demo_url || !/^https?:\/\//i.test(demo_url)) {
    return jsonResponse({ error: 'demo_url must be a valid http(s) URL' }, { status: 400, headers: cors });
  }

  const supabase = getSupabaseAdmin(env);
  const { data, error } = await supabase
    .from('pledges')
    .update({
      demo_url,
      demo_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('clerk_user_id', user.sub)
    .select('token, demo_url, demo_completed_at')
    .maybeSingle();

  if (error) {
    console.error('[pledge] patch error', error);
    return jsonResponse({ error: 'Update failed' }, { status: 500, headers: cors });
  }
  if (!data) {
    return jsonResponse({ error: 'Not found or not owner' }, { status: 404, headers: cors });
  }
  return jsonResponse(data, { headers: cors });
};
