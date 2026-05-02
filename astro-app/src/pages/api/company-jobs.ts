import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse } from '~/lib/handler';

export const prerender = false;

export const OPTIONS: APIRoute = () =>
  new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*' } });

export const GET: APIRoute = async ({ locals, url }) => {
  const env = envFrom(locals);
  const supabase = getSupabaseAdmin(env);
  const company_id = url.searchParams.get('company_id');
  const company_name = url.searchParams.get('company_name');
  if (!company_id && !company_name) {
    return jsonResponse({ error: 'company_id or company_name required' }, { status: 400 });
  }

  let jobQuery = supabase
    .from('job_postings')
    .select('id, title, department, location, remote, job_url, ats_source, last_seen_at, first_seen_at')
    .eq('is_active', true)
    .order('title');
  let companyQuery = supabase.from('ai_companies').select('*');

  if (company_id) {
    jobQuery = jobQuery.eq('company_id', company_id);
    companyQuery = companyQuery.eq('id', company_id);
  } else if (company_name) {
    jobQuery = jobQuery.ilike('company_name', company_name);
    companyQuery = companyQuery.ilike('company_name', company_name).limit(1);
  }

  const [{ data: jobs, error: jobErr }, { data: companyRows, error: compErr }] = await Promise.all([
    jobQuery,
    companyQuery,
  ]);
  if (jobErr) console.error('job_postings query error:', jobErr.message);
  if (compErr) console.error('ai_companies query error:', compErr.message);

  const company = Array.isArray(companyRows) ? companyRows[0] ?? null : companyRows ?? null;
  return jsonResponse(
    { company, jobs: jobs ?? [], count: (jobs ?? []).length },
    {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=300',
      },
    }
  );
};
