-- TAXIO Rescue Phase 2 — enable Realtime for Rescue tables (staging only)
-- TARGET: taxio-v001-staging (lyjicuuyrvblbsqlduqg)
-- Safe to re-run: ignores if already in publication.

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rescue_requests;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rescue_opportunities;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;
