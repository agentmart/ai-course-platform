// api/companies.js
// Public endpoint — returns AI companies list from Supabase
// No auth required: this directory is visible to all visitors

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=300'); // cache 5 min
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { search, investor, tech, source } = req.query;

    try {
        let query = supabase
            .from('ai_companies')
            .select('*')
            .order('announcement_date', { ascending: false });

        // Full-text search on company name
        if (search) {
            query = query.ilike('company_name', `%${search}%`);
        }

        // Filter by investor (checks JSONB array)
        if (investor) {
            query = query.contains('investors', JSON.stringify([{ value: investor }]));
        }

        // Filter by tech stack item
        if (tech) {
            query = query.contains('tech_stack', JSON.stringify([{ value: tech }]));
        }

        // Filter by source type
        if (source) {
            query = query.ilike('source', `%${source}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ companies: data || [] });
    } catch (err) {
        console.error('Companies fetch error:', err);
        return res.status(500).json({ error: 'Could not load companies.' });
    }
}