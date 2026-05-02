import type { APIRoute } from 'astro';
import { envFrom, getSupabaseAdmin, jsonResponse } from '~/lib/handler';

export const prerender = false;

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
  'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
};

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: corsHeaders });

export const GET: APIRoute = async ({ locals }) => {
  const env = envFrom(locals);
  const supabase = getSupabaseAdmin(env);
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from('content_gaps')
    .select('id, cluster_title, canonical_url, source_urls, first_seen_at, importance, source_count')
    .is('dismissed_at', null)
    .is('addressed_in_day_id', null)
    .gte('first_seen_at', cutoff)
    .order('importance', { ascending: false })
    .order('first_seen_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[api/gaps] query error', error);
    return jsonResponse({ error: 'Failed to load gaps' }, { status: 500, headers: corsHeaders });
  }
  const now = Date.now();
  const gaps = (data ?? []).map((g: any) => ({
    id: g.id,
    title: g.cluster_title,
    url: g.canonical_url,
    sources: Array.isArray(g.source_urls) ? g.source_urls : [],
    importance: g.importance,
    source_count: g.source_count,
    days_old: Math.max(0, Math.round((now - new Date(g.first_seen_at).getTime()) / 86400000)),
  }));
  return jsonResponse({ gaps, generated_at: new Date().toISOString() }, { headers: corsHeaders });
};
