-- =============================================================================
-- STAGING ONLY — Passenger Rescue WhatsApp fallback (View Booking + 20m reminder)
-- Project: lyjicuuyrvblbsqlduqg (staging.taxio.be)
-- DO NOT run on production / taxio.be
--
-- Reuses passenger_confirm_whatsapp_sent_at for first offer WhatsApp (send-once).
-- Adds passenger_confirm_reminder_whatsapp_sent_at for 20-minute reminder (send-once).
-- Does NOT change Company A 25s, opportunity 30s, or 30-minute passenger expiry.
-- WhatsApp send itself remains in Node (/api/rescue-whatsapp-tick + Accept path).
-- =============================================================================

ALTER TABLE public.rescue_requests
  ADD COLUMN IF NOT EXISTS passenger_confirm_reminder_whatsapp_sent_at timestamptz;

COMMENT ON COLUMN public.rescue_requests.passenger_confirm_whatsapp_sent_at IS
  'Send-once claim timestamp for the first Rescue offer WhatsApp (View Booking → /trip/:token).';

COMMENT ON COLUMN public.rescue_requests.passenger_confirm_reminder_whatsapp_sent_at IS
  'Send-once claim timestamp for the ~20-minute Rescue reminder WhatsApp (View Booking → /trip/:token).';

CREATE INDEX IF NOT EXISTS rescue_requests_reminder_due_idx
  ON public.rescue_requests (accepted_at)
  WHERE status = 'ACCEPTED'
    AND passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION'
    AND passenger_confirm_reminder_whatsapp_sent_at IS NULL;

-- Optional: expose due reminder count from timeout processor (no WhatsApp from SQL).
-- Reminder eligibility is evaluated in Node; this preserves process_timeouts shape.
CREATE OR REPLACE FUNCTION public.taxio_rescue_process_timeouts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_act jsonb;
  v_auto_activated int := 0;
  v_opp_withdrawn int := 0;
  v_rescues_expired int := 0;
  v_passenger_expired int := 0;
  v_reminders_due int := 0;
  r_id uuid;
  open_left int;
BEGIN
  -- A) Company A silent timeout → auto Rescue
  FOR v_booking IN
    SELECT b.id
    FROM public.booking_requests b
    WHERE b.status = 'new'
      AND b.decision_deadline_at IS NOT NULL
      AND b.decision_deadline_at <= now()
      AND NOT EXISTS (
        SELECT 1 FROM public.rescue_requests rr WHERE rr.booking_request_id = b.id
      )
    ORDER BY b.decision_deadline_at
    LIMIT 50
  LOOP
    v_act := public.taxio_rescue_auto_activate_booking(v_booking.id);
    IF v_act ? 'ok' AND (v_act->>'ok')::boolean THEN
      v_auto_activated := v_auto_activated + 1;
    END IF;
  END LOOP;

  -- B) Opportunity windows expired
  UPDATE public.rescue_opportunities o
  SET status = 'WITHDRAWN', responded_at = coalesce(o.responded_at, now())
  WHERE o.status = 'OFFERED'
    AND o.expires_at IS NOT NULL
    AND o.expires_at <= now();
  GET DIAGNOSTICS v_opp_withdrawn = ROW_COUNT;

  -- C) OPEN rescues with no remaining OFFERED opportunities → EXPIRED
  FOR r_id IN
    SELECT rr.id
    FROM public.rescue_requests rr
    WHERE rr.status = 'OPEN'
  LOOP
    SELECT count(*) INTO open_left
    FROM public.rescue_opportunities
    WHERE rescue_request_id = r_id AND status = 'OFFERED';

    IF open_left = 0 THEN
      UPDATE public.rescue_requests
      SET status = 'EXPIRED', closed_at = now()
      WHERE id = r_id AND status = 'OPEN';
      IF FOUND THEN
        v_rescues_expired := v_rescues_expired + 1;
      END IF;
    END IF;
  END LOOP;

  -- D) Passenger confirm window expired (WAITING → EXPIRED only)
  UPDATE public.rescue_requests
  SET
    passenger_confirm_status = 'EXPIRED',
    closed_at = coalesce(closed_at, now())
  WHERE status = 'ACCEPTED'
    AND passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION'
    AND passenger_confirm_deadline_at IS NOT NULL
    AND passenger_confirm_deadline_at <= now();
  GET DIAGNOSTICS v_passenger_expired = ROW_COUNT;

  -- E) Count reminders due (accepted + 20m, still WAITING, not expired, not yet sent)
  -- Node /api/rescue-whatsapp-tick performs the actual send-once claim + Meta send.
  SELECT count(*)::int INTO v_reminders_due
  FROM public.rescue_requests rr
  WHERE rr.status = 'ACCEPTED'
    AND rr.passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION'
    AND rr.passenger_confirm_reminder_whatsapp_sent_at IS NULL
    AND rr.accepted_at IS NOT NULL
    AND rr.accepted_at + interval '20 minutes' <= now()
    AND (
      rr.passenger_confirm_deadline_at IS NULL
      OR rr.passenger_confirm_deadline_at > now()
    );

  RETURN jsonb_build_object(
    'ok', true,
    'auto_activated', v_auto_activated,
    'opportunities_withdrawn', v_opp_withdrawn,
    'rescues_expired', v_rescues_expired,
    'passenger_confirms_expired', v_passenger_expired,
    'passenger_reminders_due', v_reminders_due,
    'decision_seconds', public.taxio_rescue_decision_seconds(),
    'opportunity_seconds', public.taxio_rescue_opportunity_seconds(),
    'passenger_confirm_seconds', public.taxio_rescue_passenger_confirm_seconds(),
    'server_now', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_process_timeouts() TO authenticated, service_role, anon;

-- Manual verify:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'rescue_requests'
--       AND column_name IN (
--         'passenger_confirm_whatsapp_sent_at',
--         'passenger_confirm_reminder_whatsapp_sent_at'
--       );
-- Reminder sends: POST /api/rescue-whatsapp-tick with x-taxio-rescue-wa-secret
-- (also invoked after Accept for first offer; Vercel cron every minute for reminders).
