-- Sprint 2 — Gap Detector: tracks AI releases NOT yet covered in any of the
-- 60 day files. Idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS public.content_gaps (
  id BIGSERIAL PRIMARY KEY,
  cluster_title TEXT NOT NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  importance INT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source_count INT NOT NULL DEFAULT 1,
  dismissed_at TIMESTAMPTZ,
  addressed_in_day_id INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_gaps_active
  ON public.content_gaps (importance DESC, first_seen_at DESC)
  WHERE dismissed_at IS NULL AND addressed_in_day_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_content_gaps_recent
  ON public.content_gaps (first_seen_at DESC);

-- Auto-update updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.touch_content_gaps_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_gaps_updated_at ON public.content_gaps;
CREATE TRIGGER trg_content_gaps_updated_at
  BEFORE UPDATE ON public.content_gaps
  FOR EACH ROW EXECUTE FUNCTION public.touch_content_gaps_updated_at();

-- Service-role-only access; the public /api/gaps endpoint reads via service role
ALTER TABLE public.content_gaps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                                            AND tablename='content_gaps'
                                            AND policyname='service_role_all') THEN
    CREATE POLICY service_role_all ON public.content_gaps
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
