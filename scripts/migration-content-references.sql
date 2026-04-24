-- Migration: Reference grounding store for course content freshness
-- Run this in Supabase SQL Editor before first run of content-freshness-check.mjs
--
-- Purpose:
--   Persist every external reference cited by public/days/day-NN.js so future
--   audits, re-writes, and LLM grounding can cite a verified snapshot.

-- ─────────────────────────────────────────────────────────
-- Table 1: content_references — one row per (day_number, url)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INT,                         -- 1-60, nullable for cross-day refs
  source_field TEXT NOT NULL,             -- resources | context | interview | pmAngle | codeExample
  url TEXT NOT NULL,
  resource_type TEXT,                     -- DOCS | BLOG | PRICING | PAPER | TOOL | INLINE
  title TEXT,
  note TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  http_status INT,
  content_hash TEXT,                      -- sha256 of normalized body
  archive_url TEXT,                       -- web.archive.org snapshot URL
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (day_number, url)
);

CREATE INDEX IF NOT EXISTS idx_refs_day ON content_references (day_number);
CREATE INDEX IF NOT EXISTS idx_refs_url_active ON content_references (url) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_refs_last_verified ON content_references (last_verified_at);

-- ─────────────────────────────────────────────────────────
-- Table 2: content_reference_snapshots — append-only history
-- New row only when content_hash changes
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_reference_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES content_references(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  http_status INT,
  content_hash TEXT,
  excerpt TEXT,                           -- first 2000 chars of normalized extract
  archive_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_snapshots_ref_captured
  ON content_reference_snapshots (reference_id, captured_at DESC);

-- ─────────────────────────────────────────────────────────
-- RLS: service_role only (agent writes, no client-side access)
-- ─────────────────────────────────────────────────────────
ALTER TABLE content_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reference_snapshots ENABLE ROW LEVEL SECURITY;
