// Test: just the prefs handler, copied from old notification-prefs.js
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
    if (k === 'remote_only') out[k] = !!input[k];
    else if (Array.isArray(input[k])) {
      out[k] = input[k].filter(v => typeof v === 'string').map(v => v.trim().toLowerCase()).filter(Boolean).slice(0, 50);
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

  let userId, claimsEmail;
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const claims = await verifyClerkToken(token);
    userId = claims.sub;
    claimsEmail = claims.email || null;
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.status(200).json({ ok: true, userId });
}
