import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse, appCors } from '~/lib/handler';
import { verifyClerkToken, bearerToken } from '~/lib/clerk';

export const prerender = false;

export const OPTIONS: APIRoute = ({ locals }) =>
  new Response(null, { status: 204, headers: appCors(envFrom(locals)) });

export const POST: APIRoute = async ({ locals, request }) => {
  const env = envFrom(locals);
  const cors = appCors(env);
  const body = (await request.json().catch(() => ({}))) as any;
  const { job_posting_id, company_id, company_name, job_title, job_url, referrer_page } = body ?? {};
  if (!job_url || !company_name) {
    return jsonResponse({ error: 'job_url and company_name required' }, { status: 400, headers: cors });
  }
  let clerkUserId: string | null = null;
  try {
    const auth = request.headers.get('authorization') ?? '';
    if (auth.startsWith('Bearer ')) {
      const claims = await verifyClerkToken(bearerToken(request), env);
      clerkUserId = claims?.sub ?? null;
    }
  } catch {
    /* anonymous */
  }
  try {
    const supabase = getSupabaseAdmin(env);
    await supabase.from('click_events').insert({
      clerk_user_id: clerkUserId,
      company_id: company_id ?? null,
      company_name,
      job_posting_id: job_posting_id ?? null,
      job_title: job_title ?? null,
      job_url,
      referrer_page: referrer_page ?? null,
    });
    return jsonResponse({ ok: true }, { headers: cors });
  } catch (err: any) {
    console.error('track-click error:', err?.message);
    return jsonResponse({ ok: true }, { headers: cors });
  }
};
