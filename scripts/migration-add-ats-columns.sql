-- Migration: Add ashby_slug and workable_slug columns to ai_companies
-- Run this in your Supabase SQL editor before running migrate-ats-slugs.mjs

ALTER TABLE ai_companies ADD COLUMN IF NOT EXISTS ashby_slug TEXT;
ALTER TABLE ai_companies ADD COLUMN IF NOT EXISTS workable_slug TEXT;

-- Optional: create an index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_ai_companies_ashby_slug ON ai_companies (ashby_slug) WHERE ashby_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_companies_workable_slug ON ai_companies (workable_slug) WHERE workable_slug IS NOT NULL;
