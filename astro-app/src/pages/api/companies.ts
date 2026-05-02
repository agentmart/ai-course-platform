import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse } from '~/lib/handler';

export const prerender = false;

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'Content-Type',
    },
  });

export const GET: APIRoute = async ({ locals, url }) => {
  const env = envFrom(locals);
  const supabase = getSupabaseAdmin(env);
  const search = url.searchParams.get('search');
  const investor = url.searchParams.get('investor');
  const tech = url.searchParams.get('tech');
  const source = url.searchParams.get('source');

  let q = supabase.from('ai_companies').select('*').order('announcement_date', { ascending: false });
  if (search) q = q.ilike('company_name', `%${search}%`);
  if (investor) q = q.contains('investors', JSON.stringify([{ value: investor }]));
  if (tech) q = q.contains('tech_stack', JSON.stringify([{ value: tech }]));
  if (source) q = q.ilike('source', `%${source}%`);

  const { data, error } = await q;
  if (error) {
    console.error('companies error', error);
    return jsonResponse({ error: 'Could not load companies.' }, { status: 500 });
  }
  return jsonResponse(
    { companies: data ?? [] },
    {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=300',
      },
    }
  );
};
