// api/company-jobs.js
// Returns active PM job postings for a company.
// GET /api/company-jobs?company_id=5
// GET /api/company-jobs?company_name=Anthropic

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  const { company_id, company_name } = req.query;
  if (!company_id && !company_name)  return res.status(400).json({ error: 'company_id or company_name required' });

  try {
    let jobQuery = supabase
      .from('job_postings')
      .select('id, title, department, location, remote, job_url, ats_source, last_seen_at, first_seen_at')
      .eq('is_active', true)
      .order('title');

    if (company_id)   jobQuery = jobQuery.eq('company_id', company_id);
    else              jobQuery = jobQuery.ilike('company_name', company_name);

    // Also fetch the company row for metadata
    let companyQuery = supabase.from('ai_companies').select('*');
    if (company_id)   companyQuery = companyQuery.eq('id', company_id).single();
    else              companyQuery = companyQuery.ilike('company_name', company_name).limit(1).single();

    const [{ data: jobs, error: jobErr }, { data: company, error: compErr }] = await Promise.all([
      jobQuery, companyQuery,
    ]);

    if (jobErr)  console.error('job_postings query error:', jobErr.message);
    if (compErr) console.error('ai_companies query error:', compErr.message);

    return res.status(200).json({
      company: company || null,
      jobs:    jobs    || [],
      count:   (jobs || []).length,
    });
  } catch (err) {
    console.error('company-jobs error:', err);
    return res.status(500).json({ error: 'Failed to load jobs.' });
  }
}
