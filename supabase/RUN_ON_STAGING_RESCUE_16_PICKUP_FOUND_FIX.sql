-- =============================================================================
-- TAXIO STAGING ONLY — RUN_ON_STAGING_RESCUE_16_PICKUP_FOUND_FIX.sql
-- =============================================================================
-- Bug: taxio_company_set_pickup_progress (and complete_trip) returned NOT_FOUND
-- for direct Company A accepts when no rescue_requests row exists.
--
-- Cause: after SELECT booking (FOUND=true), optional SELECT rescue with 0 rows
-- sets FOUND=false; then `IF NOT FOUND OR v_booking.id IS NULL` wrongly fails.
-- Rescue path always has a rescue row, so it worked.
--
-- Fix: check booking existence immediately; do not use FOUND after the optional
-- rescue lookup. Eligibility / ownership logic unchanged.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.taxio_company_set_pickup_progress(
  p_company_id uuid,
  p_action text,
  p_booking_request_id uuid DEFAULT NULL,
  p_rescue_request_id uuid DEFAULT NULL,
  p_eta_minutes integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.booking_requests%ROWTYPE;
  v_rescue public.rescue_requests%ROWTYPE;
  v_responsible uuid;
  v_action text := upper(trim(COALESCE(p_action, '')));
  v_eta integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  IF p_company_id IS NULL OR NOT public.taxio_user_can_act_as_company(p_company_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF v_action NOT IN ('ON_THE_WAY', 'ARRIVED') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_ACTION');
  END IF;

  IF p_rescue_request_id IS NOT NULL THEN
    SELECT * INTO v_rescue FROM public.rescue_requests WHERE id = p_rescue_request_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;
    SELECT * INTO v_booking FROM public.booking_requests WHERE id = v_rescue.booking_request_id;
    IF NOT FOUND OR v_booking.id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;
  ELSIF p_booking_request_id IS NOT NULL THEN
    SELECT * INTO v_booking FROM public.booking_requests WHERE id = p_booking_request_id;
    IF NOT FOUND OR v_booking.id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;
    -- Optional: may find 0 rows. Do NOT use FOUND after this for booking presence.
    SELECT * INTO v_rescue
    FROM public.rescue_requests
    WHERE booking_request_id = v_booking.id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  END IF;

  IF v_booking.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_COMPLETED');
  END IF;

  -- Responsible: confirmed Rescue winner, else Company A accepted
  IF v_rescue.id IS NOT NULL
     AND v_rescue.status = 'ACCEPTED'
     AND COALESCE(v_rescue.passenger_confirm_status, '') = 'CONFIRMED'
     AND v_rescue.accepted_by_company_id IS NOT NULL THEN
    v_responsible := v_rescue.accepted_by_company_id;
  ELSIF v_booking.status = 'accepted' THEN
    v_responsible := v_booking.company_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_ELIGIBLE');
  END IF;

  IF v_rescue.id IS NOT NULL
     AND v_rescue.status = 'ACCEPTED'
     AND COALESCE(v_rescue.passenger_confirm_status, '') IN ('CANCELLED_BY_PASSENGER', 'EXPIRED') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_ELIGIBLE');
  END IF;

  IF v_responsible IS DISTINCT FROM p_company_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF v_action = 'ON_THE_WAY' THEN
    IF v_booking.driver_pickup_status = 'ARRIVED' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION');
    END IF;
    IF v_booking.driver_pickup_status = 'ON_THE_WAY' THEN
      IF p_eta_minutes IS NOT NULL AND p_eta_minutes >= 0 AND p_eta_minutes <= 1440 THEN
        UPDATE public.booking_requests
        SET
          driver_eta_minutes = p_eta_minutes,
          driver_eta_updated_at = now()
        WHERE id = v_booking.id;
      END IF;
      SELECT * INTO v_booking FROM public.booking_requests WHERE id = v_booking.id;
      RETURN jsonb_build_object(
        'ok', true,
        'code', 'ALREADY_ON_THE_WAY',
        'booking_request_id', v_booking.id,
        'driver_pickup_status', v_booking.driver_pickup_status,
        'driver_on_way_at', v_booking.driver_on_way_at,
        'driver_eta_minutes', v_booking.driver_eta_minutes,
        'driver_eta_updated_at', v_booking.driver_eta_updated_at
      );
    END IF;

    v_eta := NULL;
    IF p_eta_minutes IS NOT NULL AND p_eta_minutes >= 0 AND p_eta_minutes <= 1440 THEN
      v_eta := p_eta_minutes;
    END IF;

    UPDATE public.booking_requests
    SET
      driver_pickup_status = 'ON_THE_WAY',
      driver_on_way_at = COALESCE(driver_on_way_at, now()),
      driver_eta_minutes = COALESCE(v_eta, driver_eta_minutes),
      driver_eta_updated_at = CASE
        WHEN v_eta IS NOT NULL THEN now()
        ELSE driver_eta_updated_at
      END
    WHERE id = v_booking.id
      AND completed_at IS NULL
      AND (driver_pickup_status IS NULL OR driver_pickup_status = 'ON_THE_WAY');

  ELSIF v_action = 'ARRIVED' THEN
    IF v_booking.driver_pickup_status IS DISTINCT FROM 'ON_THE_WAY'
       AND v_booking.driver_pickup_status IS DISTINCT FROM 'ARRIVED' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION');
    END IF;
    IF v_booking.driver_pickup_status = 'ARRIVED' THEN
      RETURN jsonb_build_object(
        'ok', true,
        'code', 'ALREADY_ARRIVED',
        'booking_request_id', v_booking.id,
        'driver_pickup_status', v_booking.driver_pickup_status,
        'driver_arrived_at', v_booking.driver_arrived_at,
        'driver_eta_minutes', v_booking.driver_eta_minutes
      );
    END IF;

    UPDATE public.booking_requests
    SET
      driver_pickup_status = 'ARRIVED',
      driver_arrived_at = COALESCE(driver_arrived_at, now())
    WHERE id = v_booking.id
      AND completed_at IS NULL
      AND driver_pickup_status = 'ON_THE_WAY';
  END IF;

  SELECT * INTO v_booking FROM public.booking_requests WHERE id = v_booking.id;

  IF v_action = 'ON_THE_WAY' AND v_booking.driver_pickup_status IS DISTINCT FROM 'ON_THE_WAY' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UPDATE_FAILED');
  END IF;
  IF v_action = 'ARRIVED' AND v_booking.driver_pickup_status IS DISTINCT FROM 'ARRIVED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UPDATE_FAILED');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', v_action,
    'booking_request_id', v_booking.id,
    'driver_pickup_status', v_booking.driver_pickup_status,
    'driver_on_way_at', v_booking.driver_on_way_at,
    'driver_arrived_at', v_booking.driver_arrived_at,
    'driver_eta_minutes', v_booking.driver_eta_minutes,
    'driver_eta_updated_at', v_booking.driver_eta_updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_company_set_pickup_progress(uuid, text, uuid, uuid, integer)
  TO authenticated, service_role;

-- Same FOUND bug in complete_trip (Company A with no rescue row).
CREATE OR REPLACE FUNCTION public.taxio_company_complete_trip(
  p_company_id uuid,
  p_booking_request_id uuid DEFAULT NULL,
  p_rescue_request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.booking_requests%ROWTYPE;
  v_rescue public.rescue_requests%ROWTYPE;
  v_responsible uuid;
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  IF p_company_id IS NULL OR NOT public.taxio_user_can_act_as_company(p_company_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF p_rescue_request_id IS NOT NULL THEN
    SELECT * INTO v_rescue FROM public.rescue_requests WHERE id = p_rescue_request_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;
    SELECT * INTO v_booking FROM public.booking_requests WHERE id = v_rescue.booking_request_id;
    IF NOT FOUND OR v_booking.id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;
  ELSIF p_booking_request_id IS NOT NULL THEN
    SELECT * INTO v_booking FROM public.booking_requests WHERE id = p_booking_request_id;
    IF NOT FOUND OR v_booking.id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;
    SELECT * INTO v_rescue
    FROM public.rescue_requests
    WHERE booking_request_id = v_booking.id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  END IF;

  IF v_booking.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_COMPLETED',
      'booking_request_id', v_booking.id,
      'completed_at', v_booking.completed_at
    );
  END IF;

  IF v_rescue.id IS NOT NULL
     AND v_rescue.status = 'ACCEPTED'
     AND COALESCE(v_rescue.passenger_confirm_status, '') = 'CONFIRMED'
     AND v_rescue.accepted_by_company_id IS NOT NULL THEN
    v_responsible := v_rescue.accepted_by_company_id;
  ELSIF v_booking.status = 'accepted' THEN
    v_responsible := v_booking.company_id;
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_COMPLETABLE');
  END IF;

  IF v_responsible IS DISTINCT FROM p_company_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  UPDATE public.booking_requests
  SET completed_at = now()
  WHERE id = v_booking.id
    AND completed_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    SELECT completed_at INTO v_booking.completed_at FROM public.booking_requests WHERE id = v_booking.id;
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_COMPLETED',
      'booking_request_id', v_booking.id,
      'completed_at', v_booking.completed_at
    );
  END IF;

  SELECT completed_at INTO v_booking.completed_at FROM public.booking_requests WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'COMPLETED',
    'booking_request_id', v_booking.id,
    'completed_at', v_booking.completed_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_company_complete_trip(uuid, uuid, uuid) TO authenticated, service_role;

-- Verify (manual):
--   -- Company A, no rescue row:
--   SELECT public.taxio_company_set_pickup_progress('<company_id>', 'ON_THE_WAY', '<booking_id>', NULL, NULL);
--   -- Must return ok:true, not NOT_FOUND
