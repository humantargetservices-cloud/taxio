-- =============================================================================
-- STAGING ONLY — Active Trip lifecycle
-- Project: lyjicuuyrvblbsqlduqg (staging.taxio.be)
-- DO NOT run on production / taxio.be
--
-- 1) Passenger confirm window: accepted_at + 30 minutes (server deadline)
-- 2) WAITING_PASSENGER_CONFIRMATION → EXPIRED via taxio_rescue_process_timeouts
-- 3) booking_requests.completed_at for driver Complete trip
-- Does NOT change Company A 25s or Rescue opportunity 30s windows.
-- Does NOT change atomic Accept winner selection (only sets deadline on win).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.rescue_requests
  ADD COLUMN IF NOT EXISTS passenger_confirm_deadline_at timestamptz;

COMMENT ON COLUMN public.rescue_requests.passenger_confirm_deadline_at IS
  'Server-authoritative passenger Confirm/Cancel deadline = accepted_at + 30 minutes. Browser timers are display-only.';

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

COMMENT ON COLUMN public.booking_requests.completed_at IS
  'Set when the responsible company marks the trip complete. Null = not completed (legacy rows use ride-time heuristic).';

CREATE INDEX IF NOT EXISTS booking_requests_completed_at_idx
  ON public.booking_requests (completed_at)
  WHERE completed_at IS NOT NULL;

-- Allow EXPIRED as a terminal passenger_confirm_status
ALTER TABLE public.rescue_requests
  DROP CONSTRAINT IF EXISTS rescue_requests_passenger_confirm_status_check;

ALTER TABLE public.rescue_requests
  ADD CONSTRAINT rescue_requests_passenger_confirm_status_check
  CHECK (
    passenger_confirm_status IS NULL
    OR passenger_confirm_status IN (
      'WAITING_PASSENGER_CONFIRMATION',
      'CONFIRMED',
      'CANCELLED_BY_PASSENGER',
      'EXPIRED'
    )
  );

-- ---------------------------------------------------------------------------
-- B) 30-minute confirm window helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_rescue_passenger_confirm_seconds()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 1800;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_passenger_confirm_seconds() TO anon, authenticated, service_role;

-- Backfill open waiting winners (accepted_at + 30m)
UPDATE public.rescue_requests
SET passenger_confirm_deadline_at =
  COALESCE(accepted_at, now()) + make_interval(secs => public.taxio_rescue_passenger_confirm_seconds())
WHERE passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION'
  AND passenger_confirm_deadline_at IS NULL
  AND status = 'ACCEPTED';

-- ---------------------------------------------------------------------------
-- C) Accept — same atomic winner claim; also set confirm deadline
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_rescue_request(
  p_rescue_request_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_company public.companies%ROWTYPE;
  v_rescue public.rescue_requests%ROWTYPE;
  v_opp public.rescue_opportunities%ROWTYPE;
  v_updated int;
  v_token text;
  v_deadline timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  IF NOT public.taxio_user_can_act_as_company(p_company_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF NOT public.taxio_rescue_globally_enabled() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'RESCUE_GLOBALLY_DISABLED');
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = p_company_id;
  IF NOT FOUND OR v_company.status <> 'approved' OR NOT COALESCE(v_company.rescue_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'COMPANY_RESCUE_DISABLED');
  END IF;

  SELECT * INTO v_rescue
  FROM public.rescue_requests
  WHERE id = p_rescue_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_rescue.status = 'ACCEPTED' OR v_rescue.accepted_by_company_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_ASSIGNED',
      'accepted_by_company_id', v_rescue.accepted_by_company_id
    );
  END IF;

  IF v_rescue.status <> 'OPEN' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_OPEN', 'status', v_rescue.status);
  END IF;

  SELECT * INTO v_opp
  FROM public.rescue_opportunities
  WHERE rescue_request_id = p_rescue_request_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND OR v_opp.status <> 'OFFERED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NO_OPPORTUNITY');
  END IF;

  IF v_opp.expires_at IS NOT NULL AND v_opp.expires_at < now() THEN
    UPDATE public.rescue_opportunities
    SET status = 'WITHDRAWN', responded_at = now()
    WHERE id = v_opp.id AND status = 'OFFERED';
    RETURN jsonb_build_object('ok', false, 'code', 'OPPORTUNITY_EXPIRED');
  END IF;

  v_deadline := now() + make_interval(secs => public.taxio_rescue_passenger_confirm_seconds());

  UPDATE public.rescue_requests
  SET
    status = 'ACCEPTED',
    accepted_by_company_id = p_company_id,
    accepted_at = now(),
    passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION',
    passenger_confirm_token = public.taxio_rescue_new_confirm_token(),
    passenger_confirmed_at = NULL,
    passenger_confirm_deadline_at = v_deadline,
    closed_at = NULL
  WHERE id = p_rescue_request_id
    AND status = 'OPEN'
    AND accepted_by_company_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_ASSIGNED');
  END IF;

  UPDATE public.rescue_opportunities
  SET status = 'ACCEPTED', responded_at = now()
  WHERE id = v_opp.id;

  UPDATE public.rescue_opportunities
  SET status = 'MISSED', responded_at = now()
  WHERE rescue_request_id = p_rescue_request_id
    AND id <> v_opp.id
    AND status = 'OFFERED';

  SELECT passenger_confirm_token INTO v_token
  FROM public.rescue_requests
  WHERE id = p_rescue_request_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'COMPANY_FOUND',
    'rescue_request_id', p_rescue_request_id,
    'accepted_by_company_id', p_company_id,
    'original_company_id', v_rescue.original_company_id,
    'booking_request_id', v_rescue.booking_request_id,
    'passenger_confirm_status', 'WAITING_PASSENGER_CONFIRMATION',
    'passenger_confirm_deadline_at', v_deadline,
    'passenger_confirm_token', v_token,
    'pii_locked', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_rescue_request(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- D) Passenger confirm / cancel — race-safe vs EXPIRED
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_rescue_passenger_confirm(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rescue public.rescue_requests%ROWTYPE;
  v_company_name text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;

  SELECT * INTO v_rescue
  FROM public.rescue_requests
  WHERE passenger_confirm_token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;

  IF v_rescue.status <> 'ACCEPTED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_WAITING', 'status', v_rescue.status);
  END IF;

  IF v_rescue.passenger_confirm_status = 'CONFIRMED' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_CONFIRMED');
  END IF;

  IF v_rescue.passenger_confirm_status = 'CANCELLED_BY_PASSENGER' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_CANCELLED');
  END IF;

  IF v_rescue.passenger_confirm_status = 'EXPIRED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  IF v_rescue.passenger_confirm_status IS DISTINCT FROM 'WAITING_PASSENGER_CONFIRMATION' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_WAITING');
  END IF;

  -- Lazy expire if deadline already passed (exactly one terminal wins)
  IF v_rescue.passenger_confirm_deadline_at IS NOT NULL
     AND v_rescue.passenger_confirm_deadline_at <= now() THEN
    UPDATE public.rescue_requests
    SET
      passenger_confirm_status = 'EXPIRED',
      closed_at = coalesce(closed_at, now())
    WHERE id = v_rescue.id
      AND passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION';
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  UPDATE public.rescue_requests
  SET
    passenger_confirm_status = 'CONFIRMED',
    passenger_confirmed_at = now()
  WHERE id = v_rescue.id
    AND passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  SELECT name INTO v_company_name
  FROM public.companies
  WHERE id = v_rescue.accepted_by_company_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'CONFIRMED',
    'rescue_request_id', v_rescue.id,
    'accepted_by_company_id', v_rescue.accepted_by_company_id,
    'accepted_by_company_name', v_company_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.taxio_rescue_passenger_cancel(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rescue public.rescue_requests%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;

  SELECT * INTO v_rescue
  FROM public.rescue_requests
  WHERE passenger_confirm_token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;

  IF v_rescue.passenger_confirm_status = 'CANCELLED_BY_PASSENGER' THEN
    RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_CANCELLED');
  END IF;

  IF v_rescue.passenger_confirm_status = 'CONFIRMED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_CONFIRMED');
  END IF;

  IF v_rescue.passenger_confirm_status = 'EXPIRED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  IF v_rescue.status <> 'ACCEPTED'
     OR v_rescue.passenger_confirm_status IS DISTINCT FROM 'WAITING_PASSENGER_CONFIRMATION' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_WAITING');
  END IF;

  IF v_rescue.passenger_confirm_deadline_at IS NOT NULL
     AND v_rescue.passenger_confirm_deadline_at <= now() THEN
    UPDATE public.rescue_requests
    SET
      passenger_confirm_status = 'EXPIRED',
      closed_at = coalesce(closed_at, now())
    WHERE id = v_rescue.id
      AND passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION';
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  UPDATE public.rescue_requests
  SET
    passenger_confirm_status = 'CANCELLED_BY_PASSENGER',
    closed_at = now()
  WHERE id = v_rescue.id
    AND passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  RETURN jsonb_build_object('ok', true, 'code', 'CANCELLED_BY_PASSENGER', 'rescue_request_id', v_rescue.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.taxio_rescue_passenger_preview(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rescue public.rescue_requests%ROWTYPE;
  v_name text;
  v_pcs text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 20 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;

  SELECT * INTO v_rescue
  FROM public.rescue_requests
  WHERE passenger_confirm_token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;

  v_pcs := v_rescue.passenger_confirm_status;

  -- Soft-read lazy expire for display (authoritative write still via process_timeouts / confirm)
  IF v_pcs = 'WAITING_PASSENGER_CONFIRMATION'
     AND v_rescue.passenger_confirm_deadline_at IS NOT NULL
     AND v_rescue.passenger_confirm_deadline_at <= now() THEN
    v_pcs := 'EXPIRED';
  END IF;

  SELECT name INTO v_name FROM public.companies WHERE id = v_rescue.accepted_by_company_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'OK',
    'passenger_confirm_status', v_pcs,
    'passenger_confirm_deadline_at', v_rescue.passenger_confirm_deadline_at,
    'rescue_status', v_rescue.status,
    'accepted_by_company_name', v_name,
    'preview_pickup_label', v_rescue.preview_pickup_label,
    'preview_dropoff_label', v_rescue.preview_dropoff_label,
    'preview_ride_datetime', v_rescue.preview_ride_datetime,
    'preview_estimated_price', v_rescue.preview_estimated_price,
    'preview_car_type', v_rescue.preview_car_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_passenger_confirm(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.taxio_rescue_passenger_cancel(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.taxio_rescue_passenger_preview(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- E) Timeout processor — add passenger confirm expiry (keep A/B/C intact)
-- ---------------------------------------------------------------------------
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

  -- D) Passenger confirm window expired (WAITING → EXPIRED only; never overwrite CONFIRMED/CANCELLED)
  UPDATE public.rescue_requests
  SET
    passenger_confirm_status = 'EXPIRED',
    closed_at = coalesce(closed_at, now())
  WHERE status = 'ACCEPTED'
    AND passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION'
    AND passenger_confirm_deadline_at IS NOT NULL
    AND passenger_confirm_deadline_at <= now();
  GET DIAGNOSTICS v_passenger_expired = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'auto_activated', v_auto_activated,
    'opportunities_withdrawn', v_opp_withdrawn,
    'rescues_expired', v_rescues_expired,
    'passenger_confirms_expired', v_passenger_expired,
    'decision_seconds', public.taxio_rescue_decision_seconds(),
    'opportunity_seconds', public.taxio_rescue_opportunity_seconds(),
    'passenger_confirm_seconds', public.taxio_rescue_passenger_confirm_seconds(),
    'server_now', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_process_timeouts() TO authenticated, service_role, anon;

-- ---------------------------------------------------------------------------
-- F) Winner details — include completed_at
-- ---------------------------------------------------------------------------
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
      'completed_at', v_booking.completed_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rescue_booking_details(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- G) Complete trip — responsible company only
-- ---------------------------------------------------------------------------
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
    RETURN jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_COMPLETED',
      'booking_request_id', v_booking.id,
      'completed_at', v_booking.completed_at
    );
  END IF;

  -- Responsible company: Rescue winner (CONFIRMED) wins over Company A
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
--   SELECT public.taxio_rescue_passenger_confirm_seconds();  -- 1800
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='rescue_requests' AND column_name='passenger_confirm_deadline_at';
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name='booking_requests' AND column_name='completed_at';
