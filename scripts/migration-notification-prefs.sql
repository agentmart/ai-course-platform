-- Migration: notification_prefs + notification_log
-- Sprint 1: Job Alert Agent + Interview Prep Agent
-- Run in Supabase SQL Editor. Idempotent.

-- ── notification_prefs ─────────────────────────────────────────────
-- One row per user. Holds opt-ins + job filters + unsubscribe token.
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  clerk_user_id          TEXT PRIMARY KEY,
  email                  TEXT NOT NULL,
  job_alerts_opt_in      BOOLEAN NOT NULL DEFAULT FALSE,
  interview_prep_opt_in  BOOLEAN NOT NULL DEFAULT FALSE,
  -- shape: { roles: ["ai pm","senior pm"], locations: ["sf","remote"],
  --          remote_only: false, seniority: ["senior","staff"],
  --          companies: ["Anthropic","OpenAI"] }
  job_filters            JSONB NOT NULL DEFAULT '{}'::jsonb,
  unsubscribe_token      TEXT NOT NULL UNIQUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_jobs_optin
  ON public.notification_prefs(job_alerts_opt_in) WHERE job_alerts_opt_in = TRUE;
CREATE INDEX IF NOT EXISTS idx_notif_prefs_interview_optin
  ON public.notification_prefs(interview_prep_opt_in) WHERE interview_prep_opt_in = TRUE;
CREATE INDEX IF NOT EXISTS idx_notif_prefs_unsub_token
  ON public.notification_prefs(unsubscribe_token);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
-- service_role bypasses RLS; this policy gates direct DB access only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_prefs'
      AND policyname='Users manage own prefs'
  ) THEN
    CREATE POLICY "Users manage own prefs" ON public.notification_prefs
      FOR ALL USING (auth.uid()::text = clerk_user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_notif_prefs_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notif_prefs_updated ON public.notification_prefs;
CREATE TRIGGER trg_notif_prefs_updated
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW EXECUTE FUNCTION update_notif_prefs_updated_at();

-- ── notification_log ───────────────────────────────────────────────
-- Send log: dedupe + analytics. payload_hash prevents double-sends on cron retries.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id              BIGSERIAL PRIMARY KEY,
  clerk_user_id   TEXT NOT NULL,
  kind            TEXT NOT NULL,                  -- 'job_alert' | 'interview_prep'
  payload_hash    TEXT,                           -- sha1 of canonical payload
  payload         JSONB,                          -- {jobs:[ids]} or {qHash}
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_id       TEXT,
  status          TEXT NOT NULL DEFAULT 'sent',   -- 'sent' | 'failed' | 'skipped'
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_notif_log_user_kind
  ON public.notification_log(clerk_user_id, kind, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_dedupe
  ON public.notification_log(clerk_user_id, kind, payload_hash);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
-- No client-side reads; service_role only. Empty policy = locked down.
