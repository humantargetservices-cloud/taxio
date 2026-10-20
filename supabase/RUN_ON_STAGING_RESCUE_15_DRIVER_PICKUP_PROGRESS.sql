-- =============================================================================
-- TAXIO STAGING ONLY — RUN_ON_STAGING_RESCUE_15_DRIVER_PICKUP_PROGRESS.sql
-- =============================================================================
-- Driver pickup progress after trip confirmed (Company A or Rescue winner).
--
-- Adds:
--   booking_requests.driver_pickup_status  NULL | ON_THE_WAY | ARRIVED
--   booking_requests.driver_on_way_at
--   booking_requests.driver_arrived_at
--   booking_requests.driver_eta_minutes
--   booking_requests.driver_eta_updated_at
--   booking_requests.pickup_lat / pickup_lng  (optional; for navigate + one-time ETA)
--
-- Does NOT store driver GPS.
-- Existing NULL driver_pickup_status = CONFIRMED (unchanged passenger UX).
--
-- RPC: taxio_company_set_pickup_progress
-- =============================================================================

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS driver_pickup_status text,
  ADD COLUMN IF NOT EXISTS driver_on_way_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS driver_eta_minutes integer,
  ADD COLUMN IF NOT EXISTS driver_eta_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_requests_driver_pickup_status_check'
  ) THEN
    ALTER TABLE public.booking_requests
      ADD CONSTRAINT booking_requests_driver_pickup_status_check
      CHECK (
        driver_pickup_status IS NULL
        OR driver_pickup_status IN ('ON_THE_WAY', 'ARRIVED')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_requests_driver_eta_minutes_check'
  ) THEN
    ALTER TABLE public.booking_requests
      ADD CONSTRAINT booking_requests_driver_eta_minutes_check
      CHECK (
        driver_eta_minutes IS NULL
        OR (driver_eta_minutes >= 0 AND driver_eta_minutes <= 24 * 60)
      );
  END IF;
END $$;

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
  ELSIF p_booking_request_id IS NOT NULL THEN
    SELECT * INTO v_booking FROM public.booking_requests WHERE id = p_booking_request_id;
    IF FOUND THEN
      SELECT * INTO v_rescue
      FROM public.rescue_requests
      WHERE booking_request_id = v_booking.id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  END IF;

  IF NOT FOUND OR v_booking.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
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

  -- Cancelled / expired rescue must not allow progress from a winner that lost passenger
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
      -- Idempotent; allow ETA refresh if provided
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

-- Extend winner_details booking payload with pickup progress + coords (Rescue Active Trips).
CREATE OR REPLACE FUNCTION public.get_rescue_booking_details(p_rescue_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_rescue public.rescue_requests%ROWTYPE;
  v_booking public.booking_requests%ROWTYPE;
  v_is_origin boolean;
  v_is_winner boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_rescue FROM public.rescue_requests WHERE id = p_rescue_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  v_is_origin := public.taxio_user_can_act_as_company(v_rescue.original_company_id);
  v_is_winner :=
    v_rescue.status = 'ACCEPTED'
    AND v_rescue.accepted_by_company_id IS NOT NULL
    AND public.taxio_user_can_act_as_company(v_rescue.accepted_by_company_id);

  IF NOT (public.is_platform_admin() OR v_is_origin OR v_is_winner) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF v_is_winner
     AND NOT v_is_origin
     AND NOT public.is_platform_admin()
     AND COALESCE(v_rescue.passenger_confirm_status, '') <> 'CONFIRMED' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'PII_LOCKED_UNTIL_PASSENGER_CONFIRM',
      'passenger_confirm_status', v_rescue.passenger_confirm_status,
      'passenger_confirm_deadline_at', v_rescue.passenger_confirm_deadline_at,
      'preview_estimated_price', v_rescue.preview_estimated_price,
      'preview_pickup_label', v_rescue.preview_pickup_label,
      'preview_dropoff_label', v_rescue.preview_dropoff_label,
      'preview_ride_datetime', v_rescue.preview_ride_datetime
    );
  END IF;

  IF v_rescue.status <> 'ACCEPTED'
     AND NOT public.is_platform_admin()
     AND NOT v_is_origin THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PII_LOCKED_UNTIL_ACCEPT');
  END IF;

  SELECT * INTO v_booking FROM public.booking_requests WHERE id = v_rescue.booking_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BOOKING_NOT_FOUND');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'OK',
    'rescue_status', v_rescue.status,
    'passenger_confirm_status', v_rescue.passenger_confirm_status,
    'passenger_confirm_deadline_at', v_rescue.passenger_confirm_deadline_at,
    'original_company_id', v_rescue.original_company_id,
    'accepted_by_company_id', v_rescue.accepted_by_company_id,
    'preview_estimated_price', v_rescue.preview_estimated_price,
    'booking', jsonb_build_object(
      'id', v_booking.id,
      'company_id', v_booking.company_id,
      'customer_name', v_booking.customer_name,
      'customer_phone', v_booking.customer_phone,
      'customer_email', v_booking.customer_email,
      'pickup_address', v_booking.pickup_address,
      'dropoff_address', v_booking.dropoff_address,
      'ride_datetime', v_booking.ride_datetime,
      'notes', v_booking.notes,
      'car_type', v_booking.car_type,
      'service_type', v_booking.service_type,
      'status', v_booking.status,
      'created_at', v_booking.created_at,
      'estimated_price_eur', v_booking.estimated_price_eur,
      'price_currency', v_booking.price_currency,
      'completed_at', v_booking.completed_at,
      'booking_reference', v_booking.booking_reference,
      'pickup_lat', v_booking.pickup_lat,
      'pickup_lng', v_booking.pickup_lng,
      'driver_pickup_status', v_booking.driver_pickup_status,
      'driver_on_way_at', v_booking.driver_on_way_at,
      'driver_arrived_at', v_booking.driver_arrived_at,
      'driver_eta_minutes', v_booking.driver_eta_minutes,
      'driver_eta_updated_at', v_booking.driver_eta_updated_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rescue_booking_details(uuid) TO authenticated, service_role;

-- Verify (manual):
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='booking_requests' AND column_name LIKE 'driver_%';
--   SELECT proname FROM pg_proc WHERE proname='taxio_company_set_pickup_progress';
