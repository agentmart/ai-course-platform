-- Sprint 7 — LLM Job Screener
-- Adds:
--   1. job_postings.description     — JD body captured at discovery time
--                                     (Greenhouse + Lever populate; Workable + Ashby
--                                     leave NULL — screener falls back to title-only)
--   2. job_postings.screener_verdict — cached LLM classification, JSONB shape:
--        { is_ai_pm: bool,
--          confidence: 'high'|'medium'|'low',
--          evidence: string,
--          role_type: 'ai_pm'|'pm_at_ai_co'|'ml_eng'|'data_pm'|'other',
--          model: string,
--          screened_at: ISO timestamp }
-- Idempotent.

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS description       TEXT;

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS screener_verdict  JSONB;

-- Partial index: weekly cron only cares about active rows we've already screened
CREATE INDEX IF NOT EXISTS idx_job_postings_screened
  ON public.job_postings ((screener_verdict->>'is_ai_pm'))
  WHERE screener_verdict IS NOT NULL;
