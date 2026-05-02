-- Sprint 5 — gamification: pledges + daily-nudge opt-in
-- Adds:
--   1. notification_prefs.daily_nudge_opt_in BOOLEAN DEFAULT false
--      (controls the daily 09:00 UTC reminder cron — see s5-daily-nudge)
--   2. public.pledges — backs /api/pledge POST + /pledge/[token].astro public
--      page (s5-pledge). On Day-28 capstone (s6-capstone) we set
--      demo_url + demo_completed_at to mark the pledge fulfilled.
--
-- Idempotent: safe to re-run. Applied 2026-04-30 via Supabase Management API.

ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS daily_nudge_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.pledges (
  id            bigserial PRIMARY KEY,
  token         text UNIQUE NOT NULL,
  clerk_user_id text NOT NULL,
  display_name  text NOT NULL,
  pledge_text   text NOT NULL,
  track         text NOT NULL DEFAULT 'sprint' CHECK (track IN ('sprint','full')),
  start_date    date NOT NULL DEFAULT CURRENT_DATE,
  target_date   date NOT NULL,
  demo_url      text,
  demo_completed_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pledges_clerk_user_id_idx ON public.pledges(clerk_user_id);
CREATE INDEX IF NOT EXISTS pledges_target_date_idx   ON public.pledges(target_date);

ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;

-- All app access goes through service-role (server-side); the public
-- /pledge/[token] page is gated by the unguessable token, so no public
-- RLS policy is needed.
