-- TAXIO abuse_rate_events retention + admin visibility safety
-- Keeps only recent rows; never touches companies/booking_requests.

-- 1) Function: cleanup old abuse events (default 60 days)
CREATE OR REPLACE FUNCTION public.cleanup_abuse_rate_events(retention_days integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  IF retention_days IS NULL OR retention_days < 1 THEN
    retention_days := 60;
  END IF;

  DELETE FROM public.abuse_rate_events
  WHERE created_at < now() - make_interval(days => retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_abuse_rate_events(integer)
  IS 'Deletes old rows from abuse_rate_events. Default retention: 60 days.';

-- 2) RLS for admin dashboard visibility (platform admins only)
ALTER TABLE public.abuse_rate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS abuse_rate_events_select_admin ON public.abuse_rate_events;
CREATE POLICY abuse_rate_events_select_admin
  ON public.abuse_rate_events
  FOR SELECT
  USING (public.is_platform_admin());

-- 3) Optional scheduler (pg_cron). Safe no-op when unavailable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      -- Daily at 03:17 UTC, keep 60 days.
      PERFORM cron.schedule(
        'taxio-abuse-events-cleanup-daily',
        '17 3 * * *',
        $$SELECT public.cleanup_abuse_rate_events(60);$$
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Job already exists.
        NULL;
      WHEN OTHERS THEN
        -- If scheduling perms differ by project tier, migration should still succeed.
        RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron extension not installed. Run manual cleanup SQL when needed.';
  END IF;
END
$$;

-- Manual fallback cleanup command (if no pg_cron):
-- SELECT public.cleanup_abuse_rate_events(60);
-- or for 30 days:
-- SELECT public.cleanup_abuse_rate_events(30);
