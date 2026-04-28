// api/course-advisor.js
// POST → take quiz answers, run deterministic rules + LLM polish for rationale,
//        persist into user_access.progress_data.course_advisor, return spine.
// GET  → return current saved advisor state for the user.
//
// Auth: Clerk JWT (Authorization: Bearer <token>)

import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';
import { profileToSpine, staticRationale } from '../scripts/lib/advisor-rules.mjs';

const MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const MODEL_ID = process.env.ADVISOR_MODEL || 'openai/gpt-4.1';
const VALID = {
  background: ['engineer', 'pm_non_ai', 'pm_ai', 'designer', 'other'],
  yearsExp:   ['0_2', '3_5', '6_10', '10_plus'],
  aiLevel:    ['chatgpt', 'prompts', 'rag', 'shipped'],
  targetCo:   ['frontier', 'startup', 'enterprise', 'non_ai'],
  goal:       ['land_role', 'add_ai', 'build_product', 'literacy'],
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

function sanitize(answers) {
  if (!answers || typeof answers !== 'object') return null;
  const out = {};
  for (const [k, allowed] of Object.entries(VALID)) {
    if (!allowed.includes(answers[k])) return null;
    out[k] = answers[k];
  }
  return out;
}

async function llmRationale(answers, spine, daySubtitles) {
  const token = process.env.GH_MODELS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return null;
  const sys = "You write a single warm, specific paragraph (60–80 words) explaining a personalized AI PM curriculum sequence to the learner. Address them as 'you'. No headings, no bullets, no markdown.";
  const user = `Profile: ${JSON.stringify(answers)}
Recommended starting days: ${spine.join(', ')}
Day subtitles for the recommended days:
${spine.map((d, i) => `Day ${d}: ${daySubtitles[i] || ''}`).join('\n')}

Write 60–80 words explaining why this sequence is right for them, in plain prose. Reference their background and goal explicitly. Do not list the days again at the end.`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(MODELS_ENDPOINT, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
        max_tokens: 220,
        temperature: 0.5,
      }),
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || '').trim();
    return text || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let userId, claimsEmail;
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
    claimsEmail = claims.email || null;
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Load user_access row (or create minimal one)
  let { data: row } = await supabase
    .from('user_access')
    .select('id, progress_data')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (!row) {
    if (req.method === 'GET') return res.status(200).json({ advisor: null });
    if (!claimsEmail) return res.status(400).json({ error: 'Email required' });
    const { data: created, error } = await supabase
      .from('user_access')
      .insert({ clerk_user_id: userId, email: claimsEmail, tier: 'free', access_level: 1, progress_data: {} })
      .select('id, progress_data')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to create user record' });
    row = created;
  }

  if (req.method === 'GET') {
    const advisor = (row.progress_data && row.progress_data.course_advisor) || null;
    return res.status(200).json({ advisor });
  }

  // POST
  const body = req.body || {};
  if (body.skip === true) {
    const merged = { ...(row.progress_data || {}), course_advisor: { skipped: true, generated_at: new Date().toISOString() } };
    await supabase.from('user_access').update({ progress_data: merged, updated_at: new Date().toISOString() }).eq('id', row.id);
    return res.status(200).json({ advisor: merged.course_advisor });
  }

  const answers = sanitize(body.answers);
  if (!answers) return res.status(400).json({ error: 'Invalid answers — every quiz key is required.' });

  const { spine, reasonCodes } = profileToSpine(answers);
  const subtitles = Array.isArray(body.daySubtitles) ? body.daySubtitles.slice(0, spine.length) : [];

  let rationale = await llmRationale(answers, spine, subtitles);
  if (!rationale) rationale = staticRationale(answers, spine);

  const advisor = {
    profile: answers,
    spine,
    rationale,
    reason_codes: reasonCodes,
    completed_spine: false,
    skipped: false,
    generated_at: new Date().toISOString(),
  };
  const merged = { ...(row.progress_data || {}), course_advisor: advisor };
  const { error: updErr } = await supabase
    .from('user_access')
    .update({ progress_data: merged, updated_at: new Date().toISOString() })
    .eq('id', row.id);
  if (updErr) return res.status(500).json({ error: 'Failed to persist advisor result' });

  return res.status(200).json({ advisor });
}
