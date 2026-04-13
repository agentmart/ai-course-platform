// api/models.js — public read of llm_models table, no auth required
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('llm_models')
      .select('id,company,model_id,name,model_type,input_price_per_1m,output_price_per_1m,context_window,best_for,status,pricing_url,last_price_check')
      .order('company')
      .order('input_price_per_1m', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ models: data, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('[models] error:', e?.message);
    return res.status(500).json({ error: 'Failed to load models' });
  }
}
