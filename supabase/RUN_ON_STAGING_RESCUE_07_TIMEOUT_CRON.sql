-- =============================================================================
-- STAGING ONLY — lyjicuuyrvblbsqlduqg / staging.taxio.be
-- Rescue timeout processor: server-side schedule (~every 5 seconds)
--
-- Does NOT depend on Company A browser / PWA / polling.
-- Invokes existing public.taxio_rescue_process_timeouts().
--
-- Supabase Cron (pg_cron) supports sub-minute schedules as 'N seconds'
-- on Postgres 15.1.1.61+. Fallback: once-per-minute worker that loops
-- every 5s for ~55s under an advisory lock.
-- =============================================================================

-- Guard: block Company A late ACCEPT after Rescue has already committed
CREATE OR REPLACE FUNCTION public.taxio_booking_guard_accept_vs_rescue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'accepted'
     AND OLD.status IS DISTINCT FROM 'accepted' THEN
    IF EXISTS (
      SELECT 1 FROM public.rescue_requests rr WHERE rr.booking_request_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'RESCUE_ALREADY_ACTIVE'
        USING ERRCODE = 'P0001';
    END IF;
    NEW.decision_deadline_at := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'rejected' THEN
    NEW.decision_deadline_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_guard_accept_vs_rescue ON public.booking_requests;
CREATE TRIGGER trg_booking_guard_accept_vs_rescue
  BEFORE UPDATE OF status ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.taxio_booking_guard_accept_vs_rescue();

-- Locked wrapper so overlapping cron ticks do not pile up
CREATE OR REPLACE FUNCTION public.taxio_rescue_process_timeouts_cron()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_got boolean;
  v_result jsonb;
BEGIN
  v_got := pg_try_advisory_lock(872314250);
  IF NOT v_got THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'lock_busy');
  END IF;
  BEGIN
    v_result := public.taxio_rescue_process_timeouts();
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(872314250);
      RAISE;
  END;
  PERFORM pg_advisory_unlock(872314250);
  RETURN COALESCE(v_result, jsonb_build_object('ok', true));
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_process_timeouts_cron() TO service_role;

-- Minute fallback worker (used only if '5 seconds' schedule is unavailable)
CREATE OR REPLACE FUNCTION public.taxio_rescue_timeout_minute_worker()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_got boolean;
  i int;
  v_last jsonb;
  v_sum_auto int := 0;
  v_sum_opp int := 0;
  v_sum_exp int := 0;
BEGIN
  v_got := pg_try_advisory_lock(872314251);
  IF NOT v_got THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'lock_busy');
  END IF;
  BEGIN
    FOR i IN 1..11 LOOP
      v_last := public.taxio_rescue_process_timeouts();
      v_sum_auto := v_sum_auto + COALESCE((v_last->>'auto_activated')::int, 0);
      v_sum_opp := v_sum_opp + COALESCE((v_last->>'opportunities_withdrawn')::int, 0);
      v_sum_exp := v_sum_exp + COALESCE((v_last->>'rescues_expired')::int, 0);
      IF i < 11 THEN
        PERFORM pg_sleep(5);
      END IF;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM pg_advisory_unlock(872314251);
      RAISE;
  END;
  PERFORM pg_advisory_unlock(872314251);
  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'minute_worker',
    'auto_activated', v_sum_auto,
    'opportunities_withdrawn', v_sum_opp,
    'rescues_expired', v_sum_exp,
    'last', v_last
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_timeout_minute_worker() TO service_role;

-- Schedule via pg_cron when available
DO $$
DECLARE
  v_jobid bigint;
  v_name text := 'taxio-rescue-process-timeouts';
  v_mode text := 'none';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
        RETURN;
    END;
  END IF;

  -- Remove prior schedules for this job name
  FOR v_jobid IN
    SELECT jobid FROM cron.job WHERE jobname = v_name
  LOOP
    PERFORM cron.unschedule(v_jobid);
  END LOOP;

  -- Preferred: every 5 seconds (Supabase sub-minute)
  BEGIN
    PERFORM cron.schedule(
      v_name,
      '5 seconds',
      $$SELECT public.taxio_rescue_process_timeouts_cron()$$
    );
    v_mode := '5_seconds';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '5 seconds schedule failed (%); falling back to minute worker', SQLERRM;
      BEGIN
        PERFORM cron.schedule(
          v_name,
          '* * * * *',
          $$SELECT public.taxio_rescue_timeout_minute_worker()$$
        );
        v_mode := 'minute_worker';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'cron schedule failed: %', SQLERRM;
          v_mode := 'failed';
      END;
  END;

  RAISE NOTICE 'taxio rescue timeout cron mode=%', v_mode;
END
$$;

-- Manual verify:
--   SELECT * FROM cron.job WHERE jobname = 'taxio-rescue-process-timeouts';
--   SELECT public.taxio_rescue_process_timeouts();
