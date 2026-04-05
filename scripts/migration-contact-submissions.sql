-- Migration: Add contact_submissions table for the contact form
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS contact_submissions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('bug', 'feature', 'content', 'partnership', 'general')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queries by date and subject
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created ON contact_submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_subject ON contact_submissions (subject);

-- RLS: service_role only (no client-side access needed)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
