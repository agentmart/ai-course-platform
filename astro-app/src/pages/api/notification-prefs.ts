import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';

export const prerender = false;

const ALLOWED_FILTER_KEYS = ['roles', 'locations', 'remote_only', 'seniority', 'companies'];

function sanitizeFilters(input: any): Record<string, any> {
  if (!input || typeof input !== 'object') return {};
  const out: Record<string, any> = {};
  for (const k of ALLOWED_FILTER_KEYS) {
    if (input[k] === undefined) continue;
    if (k === 'remote_only') out[k] = !!input[k];
    else if (Array.isArray(input[k])) {
      out[k] = input[k]
        .filter((v: any) => typeof v === 'string')
        .map((v: string) => v.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 50);
    }
  }
  return out;
}

function randomToken(byteLen = 24): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const corsHdrs = (env: any) => ({ ...appCors(env), 'cache-control': 'no-store' });

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: corsHdrs(envFrom(locals)) });

async function loadOrCreate(env: any, request: Request, body: any) {
  let user;
  try {
    user = await verifyClerkToken(bearerToken(request), env);
  } catch {
    return { error: jsonResponse({ error: 'Unauthorized' }, { status: 401, headers: corsHdrs(env) }) };
  }
  const supabase = getSupabaseAdmin(env);
  let { data: row } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('clerk_user_id', user.sub)
    .maybeSingle();

  if (!row) {
    const fallbackEmail = user.email ?? body?.email ?? null;
    let email = fallbackEmail;
    if (!email) {
      const { data: ua } = await supabase
        .from('user_access')
        .select('email')
        .eq('clerk_user_id', user.sub)
        .maybeSingle();
      email = ua?.email ?? null;
    }
    if (!email) {
      return {
        error: jsonResponse(
          { error: 'Email required to create prefs' },
          { status: 400, headers: corsHdrs(env) }
        ),
      };
    }
    const insert = {
      clerk_user_id: user.sub,
      email,
      job_alerts_opt_in: false,
      interview_prep_opt_in: false,
      daily_nudge_opt_in: false,
      job_filters: {},
      unsubscribe_token: randomToken(24),
    };
    const { data: created, error } = await supabase
      .from('notification_prefs')
      .insert(insert)
      .select('*')
      .single();
    if (error) {
      console.error('[notification-prefs] insert error', error);
      return {
        error: jsonResponse(
          { error: 'Failed to create prefs' },
          { status: 500, headers: corsHdrs(env) }
        ),
      };
    }
    row = created;
  }
  return { user, row, supabase };
}

export const GET: APIRoute = async ({ locals, request, url }) => {
  const env = envFrom(locals);
  const body = { email: url.searchParams.get('email') ?? undefined };
  const r = await loadOrCreate(env, request, body);
  if ('error' in r) return r.error;
  return jsonResponse(
    {
      email: r.row.email,
      job_alerts_opt_in: r.row.job_alerts_opt_in,
      interview_prep_opt_in: r.row.interview_prep_opt_in,
      daily_nudge_opt_in: r.row.daily_nudge_opt_in ?? false,
      job_filters: r.row.job_filters ?? {},
    },
    { headers: corsHdrs(env) }
  );
};

export const PUT: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const body = (await request.json().catch(() => ({}))) as any;
  const r = await loadOrCreate(env, request, body);
  if ('error' in r) return r.error;
  const { row, supabase } = r;
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body.job_alerts_opt_in === 'boolean') update.job_alerts_opt_in = body.job_alerts_opt_in;
  if (typeof body.interview_prep_opt_in === 'boolean') update.interview_prep_opt_in = body.interview_prep_opt_in;
  if (typeof body.daily_nudge_opt_in === 'boolean') update.daily_nudge_opt_in = body.daily_nudge_opt_in;
  if (body.job_filters !== undefined) update.job_filters = sanitizeFilters(body.job_filters);
  if (typeof body.email === 'string' && body.email.includes('@')) update.email = body.email.trim();

  const { data: updated, error } = await supabase
    .from('notification_prefs')
    .update(update)
    .eq('clerk_user_id', row.clerk_user_id)
    .select('*')
    .single();
  if (error) {
    console.error('[notification-prefs] update error', error);
    return jsonResponse({ error: 'Failed to update prefs' }, { status: 500, headers: corsHdrs(env) });
  }
  return jsonResponse(
    {
      email: updated.email,
      job_alerts_opt_in: updated.job_alerts_opt_in,
      interview_prep_opt_in: updated.interview_prep_opt_in,
      daily_nudge_opt_in: updated.daily_nudge_opt_in ?? false,
      job_filters: updated.job_filters ?? {},
    },
    { headers: corsHdrs(env) }
  );
};
