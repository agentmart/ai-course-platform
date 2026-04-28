// api/gaps.js
// Public GET: returns top 5 active content gaps for the /gaps.html page.
// 5-minute cache.

import { createClient } from '@supabase/supabase-js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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
    return res.status(500).json({ error: 'Failed to load gaps' });
  }

  const now = Date.now();
  const gaps = (data || []).map(g => ({
    id: g.id,
    title: g.cluster_title,
    url: g.canonical_url,
    sources: Array.isArray(g.source_urls) ? g.source_urls : [],
    importance: g.importance,
    source_count: g.source_count,
    days_old: Math.max(0, Math.round((now - new Date(g.first_seen_at).getTime()) / 86400000)),
  }));

  return res.status(200).json({ gaps, generated_at: new Date().toISOString() });
}
