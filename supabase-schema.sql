-- ════════════════════════════════════════════════════
-- Supabase Schema — AI Course Platform
-- Run this in your Supabase project's SQL Editor
-- supabase.com → Your Project → SQL Editor → New query
-- ════════════════════════════════════════════════════

-- User access table: tracks who has paid and at what tier
CREATE TABLE IF NOT EXISTS public.user_access (
  id                    BIGSERIAL PRIMARY KEY,
  clerk_user_id         TEXT NOT NULL UNIQUE,   -- Clerk's user ID (sub claim in JWT)
  email                 TEXT,
  tier                  TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'monthly' | 'annual' | 'basic' | 'full' | 'team'
  access_level          INTEGER NOT NULL DEFAULT 0,    -- 0=free, 1=basic, 2=full/paid, -1=revoked
  subscription_type     TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'monthly' | 'annual' | 'one_time'
  stripe_subscription_id TEXT,                          -- Stripe subscription ID (for recurring billing)
  stripe_session_id     TEXT,
  stripe_customer_id    TEXT,
  subscription_status   TEXT DEFAULT 'free',            -- 'free' | 'active' | 'past_due' | 'cancelled' | 'one_time'
  subscription_start    TIMESTAMPTZ,
  subscription_renews_at TIMESTAMPTZ,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Progress tracking: per-user per-day completion
CREATE TABLE IF NOT EXISTS public.day_progress (
  id             BIGSERIAL PRIMARY KEY,
  clerk_user_id  TEXT NOT NULL,
  day_number     INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 60),
  completed      BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_user_id, day_number)
);

-- Task completion: individual task checkboxes
CREATE TABLE IF NOT EXISTS public.task_progress (
  id             BIGSERIAL PRIMARY KEY,
  clerk_user_id  TEXT NOT NULL,
  day_number     INTEGER NOT NULL,
  task_index     INTEGER NOT NULL,
  completed      BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_user_id, day_number, task_index)
);

-- Notes: per-user per-day text notes
CREATE TABLE IF NOT EXISTS public.day_notes (
  id             BIGSERIAL PRIMARY KEY,
  clerk_user_id  TEXT NOT NULL,
  day_number     INTEGER NOT NULL,
  content        TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clerk_user_id, day_number)
);

-- ── Row Level Security ──────────────────────────────
-- Enable RLS on all tables (service role key bypasses RLS)
ALTER TABLE public.user_access   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_notes     ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own rows
-- (Our API uses service_role_key which bypasses these — these protect direct DB access)
CREATE POLICY "Users read own access" ON public.user_access
  FOR SELECT USING (auth.uid()::text = clerk_user_id);

CREATE POLICY "Users read own progress" ON public.day_progress
  FOR ALL USING (auth.uid()::text = clerk_user_id);

CREATE POLICY "Users manage own tasks" ON public.task_progress
  FOR ALL USING (auth.uid()::text = clerk_user_id);

CREATE POLICY "Users manage own notes" ON public.day_notes
  FOR ALL USING (auth.uid()::text = clerk_user_id);

-- ── Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_access_clerk   ON public.user_access(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_day_progress_user   ON public.day_progress(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_user  ON public.task_progress(clerk_user_id);

-- ── Updated_at trigger ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_access_updated
  BEFORE UPDATE ON public.user_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Subscription Migration (run once on existing DBs) ──────────
-- Adds subscription columns to existing user_access table.
-- Safe to run multiple times (uses IF NOT EXISTS / column checks).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_access' AND column_name='subscription_type') THEN
    ALTER TABLE public.user_access ADD COLUMN subscription_type TEXT NOT NULL DEFAULT 'free';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_access' AND column_name='stripe_subscription_id') THEN
    ALTER TABLE public.user_access ADD COLUMN stripe_subscription_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_access' AND column_name='subscription_status') THEN
    ALTER TABLE public.user_access ADD COLUMN subscription_status TEXT DEFAULT 'free';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_access' AND column_name='subscription_start') THEN
    ALTER TABLE public.user_access ADD COLUMN subscription_start TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_access' AND column_name='subscription_renews_at') THEN
    ALTER TABLE public.user_access ADD COLUMN subscription_renews_at TIMESTAMPTZ;
  END IF;
END $$;

-- Migrate existing one-time purchasers: mark them as 'one_time' subscription type
UPDATE public.user_access
SET subscription_type = 'one_time',
    subscription_status = 'one_time'
WHERE stripe_session_id IS NOT NULL
  AND subscription_type = 'free'
  AND access_level > 0;

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_user_access_stripe_sub ON public.user_access(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_access_stripe_cust ON public.user_access(stripe_customer_id);
