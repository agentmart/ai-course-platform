// api/notification-prefs.js
// GET  → returns current user's prefs (creates default row on first call)
// PUT  → updates opt-ins + job filters
//
// Auth: Clerk JWT (Authorization: Bearer <token>)

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { verifyClerkToken } from '../lib/clerk.js';

const ALLOWED_FILTER_KEYS = ['roles', 'locations', 'remote_only', 'seniority', 'companies'];

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
}

function sanitizeFilters(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};
  for (const k of ALLOWED_FILTER_KEYS) {
    if (input[k] === undefined) continue;
    if (k === 'remote_only') {
      out[k] = !!input[k];
    } else if (Array.isArray(input[k])) {
      out[k] = input[k]
        .filter(v => typeof v === 'string')
        .map(v => v.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 50);
    }
  }
  return out;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  let userId, claimsEmail;
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
    claimsEmail = claims.email || null;
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Load existing row
  let { data: row } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  // Auto-create default row on first hit (so GET always returns something usable)
  if (!row) {
    const fallbackEmail = claimsEmail || (req.body && req.body.email) || null;
    if (!fallbackEmail) {
      return res.status(400).json({ error: 'Email required to create prefs' });
    }
    const insert = {
      clerk_user_id: userId,
      email: fallbackEmail,
      job_alerts_opt_in: false,
      interview_prep_opt_in: false,
      job_filters: {},
      unsubscribe_token: crypto.randomBytes(24).toString('hex'),
    };
    const { data: created, error } = await supabase
      .from('notification_prefs')
      .insert(insert)
      .select('*')
      .single();
    if (error) {
      console.error('[notification-prefs] insert error', error);
      return res.status(500).json({ error: 'Failed to create prefs' });
    }
    row = created;
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      email: row.email,
      job_alerts_opt_in: row.job_alerts_opt_in,
      interview_prep_opt_in: row.interview_prep_opt_in,
      job_filters: row.job_filters || {},
    });
  }

  // PUT
  const body = req.body || {};
  const update = { updated_at: new Date().toISOString() };
  if (typeof body.job_alerts_opt_in === 'boolean')     update.job_alerts_opt_in = body.job_alerts_opt_in;
  if (typeof body.interview_prep_opt_in === 'boolean') update.interview_prep_opt_in = body.interview_prep_opt_in;
  if (body.job_filters !== undefined)                  update.job_filters = sanitizeFilters(body.job_filters);
  if (typeof body.email === 'string' && body.email.includes('@')) update.email = body.email.trim();

  const { data: updated, error: updErr } = await supabase
    .from('notification_prefs')
    .update(update)
    .eq('clerk_user_id', userId)
    .select('*')
    .single();

  if (updErr) {
    console.error('[notification-prefs] update error', updErr);
    return res.status(500).json({ error: 'Failed to update prefs' });
  }

  return res.status(200).json({
    email: updated.email,
    job_alerts_opt_in: updated.job_alerts_opt_in,
    interview_prep_opt_in: updated.interview_prep_opt_in,
    job_filters: updated.job_filters || {},
  });
}
