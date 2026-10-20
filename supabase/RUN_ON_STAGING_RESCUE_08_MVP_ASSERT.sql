-- =============================================================================
-- STAGING ONLY — lyjicuuyrvblbsqlduqg
-- Clean Rescue MVP assert / consolidation (NO schema wipe).
-- DO NOT APPLY AUTOMATICALLY — review then run in staging SQL editor.
--
-- Verifies cron + key grants. Does not re-apply Phase1/Phase2 bodies.
-- =============================================================================

-- 1) Confirm cron job exists (expect schedule '5 seconds')
DO $$
DECLARE
  v_count int;
  v_schedule text;
BEGIN
  SELECT count(*), max(schedule)
  INTO v_count, v_schedule
  FROM cron.job
  WHERE jobname = 'taxio-rescue-process-timeouts';

  IF v_count = 0 THEN
    RAISE NOTICE 'MISSING cron job taxio-rescue-process-timeouts — re-run RUN_ON_STAGING_RESCUE_07_TIMEOUT_CRON.sql';
  ELSE
    RAISE NOTICE 'cron taxio-rescue-process-timeouts present schedule=% count=%', v_schedule, v_count;
  END IF;
END
$$;

-- 2) Ensure timeout processor remains executable by service_role (cron)
GRANT EXECUTE ON FUNCTION public.taxio_rescue_process_timeouts() TO service_role;
GRANT EXECUTE ON FUNCTION public.taxio_rescue_process_timeouts_cron() TO service_role;

-- 3) Smoke-call (safe no-op when nothing due)
SELECT public.taxio_rescue_process_timeouts_cron();

-- Manual verify:
--   SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'taxio-rescue-process-timeouts';
--   SELECT public.taxio_rescue_process_timeouts();
