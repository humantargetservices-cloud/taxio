-- TAXIO Rescue MVP simplified core
-- TARGET: taxio-v001-staging ONLY (lyjicuuyrvblbsqlduqg)
-- DO NOT run on production (taxio.be)
--
-- Adds:
--   - configurable decision/opportunity timers
--   - booking decision_deadline_at (Company A 25s)
--   - opportunity expires_at (B/C/D 10s)
--   - passenger confirmation token/state (PII locked until confirm)
--   - taxio_rescue_process_timeouts() lazy server-authoritative timeout processor
--
-- Timer method: deadline timestamps + process_timeouts() called from API/dashboard.
-- No pg_cron required for 10–25s granularity.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Platform timing config
-- ---------------------------------------------------------------------------
ALTER TABLE public.taxio_platform_flags
  ADD COLUMN IF NOT EXISTS original_company_decision_seconds integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS rescue_opportunity_seconds integer NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.taxio_platform_flags.original_company_decision_seconds IS
  'Seconds Company A has to Accept/Decline a new booking before Rescue auto-activates. UX countdown mirrors this; server deadline is authoritative.';
COMMENT ON COLUMN public.taxio_platform_flags.rescue_opportunity_seconds IS
  'Seconds each Rescue opportunity stays OFFERED before WITHDRAWN.';

UPDATE public.taxio_platform_flags
SET
  original_company_decision_seconds = COALESCE(original_company_decision_seconds, 25),
  rescue_opportunity_seconds = COALESCE(rescue_opportunity_seconds, 10),
  updated_at = now()
WHERE id = 1;

-- ---------------------------------------------------------------------------
-- 2) Company A decision deadline on booking
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS decision_deadline_at timestamptz;

COMMENT ON COLUMN public.booking_requests.decision_deadline_at IS
  'When set on a new booking, Rescue may auto-activate after this timestamp if still undecided. Cleared on accept/refuse/activate.';

-- ---------------------------------------------------------------------------
-- 3) Opportunity expiry
-- ---------------------------------------------------------------------------
ALTER TABLE public.rescue_opportunities
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS rescue_opportunities_expires_idx
  ON public.rescue_opportunities (expires_at)
  WHERE status = 'OFFERED' AND expires_at IS NOT NULL;

COMMENT ON COLUMN public.rescue_opportunities.expires_at IS
  'Server-authoritative end of the opportunity window. Browser countdown is display-only.';

-- ---------------------------------------------------------------------------
-- 4) Passenger confirmation (after company wins)
-- ---------------------------------------------------------------------------
ALTER TABLE public.rescue_requests
  ADD COLUMN IF NOT EXISTS passenger_confirm_status text,
  ADD COLUMN IF NOT EXISTS passenger_confirm_token text,
  ADD COLUMN IF NOT EXISTS passenger_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS preview_estimated_price text;

-- Backfill constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rescue_requests_passenger_confirm_status_check'
  ) THEN
    ALTER TABLE public.rescue_requests
      ADD CONSTRAINT rescue_requests_passenger_confirm_status_check
      CHECK (
        passenger_confirm_status IS NULL
        OR passenger_confirm_status IN (
          'WAITING_PASSENGER_CONFIRMATION',
          'CONFIRMED',
          'CANCELLED_BY_PASSENGER'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS rescue_requests_passenger_confirm_token_uidx
  ON public.rescue_requests (passenger_confirm_token)
  WHERE passenger_confirm_token IS NOT NULL;

COMMENT ON COLUMN public.rescue_requests.passenger_confirm_status IS
  'After a company wins: WAITING_PASSENGER_CONFIRMATION → CONFIRMED or CANCELLED_BY_PASSENGER. PII unlock only when CONFIRMED.';
COMMENT ON COLUMN public.rescue_requests.passenger_confirm_token IS
  'Unguessable token for passenger confirm/cancel page (future WhatsApp link).';

-- ---------------------------------------------------------------------------
-- 5) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_rescue_decision_seconds()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT original_company_decision_seconds FROM public.taxio_platform_flags WHERE id = 1),
    25
  );
$$;

CREATE OR REPLACE FUNCTION public.taxio_rescue_opportunity_seconds()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rescue_opportunity_seconds FROM public.taxio_platform_flags WHERE id = 1),
    10
  );
$$;

CREATE OR REPLACE FUNCTION public.taxio_rescue_new_confirm_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_decision_seconds() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.taxio_rescue_opportunity_seconds() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.taxio_booking_set_decision_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'new' AND NEW.decision_deadline_at IS NULL THEN
    NEW.decision_deadline_at :=
      now() + make_interval(secs => public.taxio_rescue_decision_seconds());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_decision_deadline ON public.booking_requests;
CREATE TRIGGER trg_booking_decision_deadline
  BEFORE INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.taxio_booking_set_decision_deadline();

-- ---------------------------------------------------------------------------
-- 6) Activate Rescue — set opportunity expires_at; clear booking deadline
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_rescue_request(
  p_booking_request_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_booking public.booking_requests%ROWTYPE;
  v_company public.companies%ROWTYPE;
  v_rescue public.rescue_requests%ROWTYPE;
  v_existing_id uuid;
  v_offered int := 0;
  v_price_label text;
  v_opp_secs int := public.taxio_rescue_opportunity_seconds();
  v_expires timestamptz;
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
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'COMPANY_NOT_FOUND');
  END IF;
  IF v_company.status <> 'approved' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'COMPANY_NOT_APPROVED');
  END IF;
  IF NOT COALESCE(v_company.rescue_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'COMPANY_RESCUE_DISABLED');
  END IF;

  SELECT * INTO v_booking
  FROM public.booking_requests
  WHERE id = p_booking_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_booking.company_id <> p_company_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_BOOKING_OWNER');
  END IF;

  SELECT id INTO v_existing_id
  FROM public.rescue_requests
  WHERE booking_request_id = p_booking_request_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'RESCUE_ALREADY_EXISTS', 'rescue_request_id', v_existing_id);
  END IF;

  v_price_label := public.taxio_booking_trip_price_label(
    v_booking.estimated_price_eur,
    v_booking.price_currency,
    v_booking.notes
  );
  v_expires := now() + make_interval(secs => v_opp_secs);

  INSERT INTO public.rescue_requests (
    booking_request_id,
    original_company_id,
    status,
    activated_by_user_id,
    activated_at,
    preview_pickup_label,
    preview_dropoff_label,
    preview_ride_datetime,
    preview_car_type,
    preview_service_type,
    preview_estimated_price
  ) VALUES (
    v_booking.id,
    p_company_id,
    'OPEN',
    v_uid,
    now(),
    public.taxio_rescue_safe_address_label(v_booking.pickup_address),
    public.taxio_rescue_safe_address_label(v_booking.dropoff_address),
    v_booking.ride_datetime,
    v_booking.car_type,
    v_booking.service_type,
    v_price_label
  )
  RETURNING * INTO v_rescue;

  INSERT INTO public.rescue_opportunities (rescue_request_id, company_id, status, expires_at)
  SELECT v_rescue.id, c.id, 'OFFERED', v_expires
  FROM public.companies c
  WHERE c.status = 'approved'
    AND COALESCE(c.rescue_enabled, false) = true
    AND c.id <> p_company_id;

  GET DIAGNOSTICS v_offered = ROW_COUNT;

  UPDATE public.booking_requests
  SET
    status = CASE WHEN status = 'new' THEN 'rejected' ELSE status END,
    decision_deadline_at = NULL
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'OPEN',
    'rescue_request_id', v_rescue.id,
    'booking_request_id', v_booking.id,
    'original_company_id', p_company_id,
    'status', 'OPEN',
    'opportunities_offered', v_offered,
    'preview_estimated_price', v_rescue.preview_estimated_price,
    'estimated_price_eur', v_booking.estimated_price_eur,
    'price_currency', v_booking.price_currency,
    'opportunity_expires_at', v_expires,
    'opportunity_seconds', v_opp_secs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_rescue_request(uuid, uuid) TO authenticated, service_role;

-- Service-role / SECURITY DEFINER path for auto-timeout activate (no acting user)
CREATE OR REPLACE FUNCTION public.taxio_rescue_auto_activate_booking(p_booking_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.booking_requests%ROWTYPE;
  v_company public.companies%ROWTYPE;
  v_rescue public.rescue_requests%ROWTYPE;
  v_existing_id uuid;
  v_offered int := 0;
  v_price_label text;
  v_opp_secs int := public.taxio_rescue_opportunity_seconds();
  v_expires timestamptz;
BEGIN
  IF NOT public.taxio_rescue_globally_enabled() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'RESCUE_GLOBALLY_DISABLED');
  END IF;

  SELECT * INTO v_booking
  FROM public.booking_requests
  WHERE id = p_booking_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_booking.status <> 'new' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_PENDING');
  END IF;

  SELECT id INTO v_existing_id
  FROM public.rescue_requests
  WHERE booking_request_id = p_booking_request_id;
  IF v_existing_id IS NOT NULL THEN
    UPDATE public.booking_requests SET decision_deadline_at = NULL WHERE id = v_booking.id;
    RETURN jsonb_build_object('ok', false, 'code', 'RESCUE_ALREADY_EXISTS', 'rescue_request_id', v_existing_id);
  END IF;

  SELECT * INTO v_company FROM public.companies WHERE id = v_booking.company_id;
  IF NOT FOUND OR v_company.status <> 'approved' OR NOT COALESCE(v_company.rescue_enabled, false) THEN
    UPDATE public.booking_requests SET decision_deadline_at = NULL WHERE id = v_booking.id;
    RETURN jsonb_build_object('ok', false, 'code', 'COMPANY_RESCUE_DISABLED');
  END IF;

  v_price_label := public.taxio_booking_trip_price_label(
    v_booking.estimated_price_eur,
    v_booking.price_currency,
    v_booking.notes
  );
  v_expires := now() + make_interval(secs => v_opp_secs);

  INSERT INTO public.rescue_requests (
    booking_request_id,
    original_company_id,
    status,
    activated_by_user_id,
    activated_at,
    preview_pickup_label,
    preview_dropoff_label,
    preview_ride_datetime,
    preview_car_type,
    preview_service_type,
    preview_estimated_price
  ) VALUES (
    v_booking.id,
    v_booking.company_id,
    'OPEN',
    NULL,
    now(),
    public.taxio_rescue_safe_address_label(v_booking.pickup_address),
    public.taxio_rescue_safe_address_label(v_booking.dropoff_address),
    v_booking.ride_datetime,
    v_booking.car_type,
    v_booking.service_type,
    v_price_label
  )
  RETURNING * INTO v_rescue;

  INSERT INTO public.rescue_opportunities (rescue_request_id, company_id, status, expires_at)
  SELECT v_rescue.id, c.id, 'OFFERED', v_expires
  FROM public.companies c
  WHERE c.status = 'approved'
    AND COALESCE(c.rescue_enabled, false) = true
    AND c.id <> v_booking.company_id;

  GET DIAGNOSTICS v_offered = ROW_COUNT;

  UPDATE public.booking_requests
  SET status = 'rejected', decision_deadline_at = NULL
  WHERE id = v_booking.id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'OPEN',
    'rescue_request_id', v_rescue.id,
    'booking_request_id', v_booking.id,
    'opportunities_offered', v_offered,
    'auto', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_auto_activate_booking(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 7) Accept — winner found, WAITING passenger confirmation, PII still locked
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

  IF v_rescue.status = 'ACCEPTED' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_TAKEN',
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

  UPDATE public.rescue_requests
  SET
    status = 'ACCEPTED',
    accepted_by_company_id = p_company_id,
    accepted_at = now(),
    passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION',
    passenger_confirm_token = public.taxio_rescue_new_confirm_token(),
    passenger_confirmed_at = NULL
  WHERE id = p_rescue_request_id
    AND status = 'OPEN';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_TAKEN');
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
    'passenger_confirm_token', v_token,
    'pii_locked', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_rescue_request(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) PII unlock only after passenger CONFIRMED
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

  -- Winner: PII only after passenger confirms. Origin/admin keep access to original booking context.
  IF v_is_winner
     AND NOT v_is_origin
     AND NOT public.is_platform_admin()
     AND COALESCE(v_rescue.passenger_confirm_status, '') <> 'CONFIRMED' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'PII_LOCKED_UNTIL_PASSENGER_CONFIRM',
      'passenger_confirm_status', v_rescue.passenger_confirm_status,
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
      'price_currency', v_booking.price_currency
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rescue_booking_details(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) Passenger confirm / cancel by token (service_role / anon via API)
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

  IF v_rescue.passenger_confirm_status IS DISTINCT FROM 'WAITING_PASSENGER_CONFIRMATION' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_WAITING');
  END IF;

  UPDATE public.rescue_requests
  SET
    passenger_confirm_status = 'CONFIRMED',
    passenger_confirmed_at = now()
  WHERE id = v_rescue.id;

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

  IF v_rescue.status <> 'ACCEPTED'
     OR v_rescue.passenger_confirm_status IS DISTINCT FROM 'WAITING_PASSENGER_CONFIRMATION' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_WAITING');
  END IF;

  UPDATE public.rescue_requests
  SET
    passenger_confirm_status = 'CANCELLED_BY_PASSENGER',
    closed_at = now()
  WHERE id = v_rescue.id;

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

  SELECT name INTO v_name FROM public.companies WHERE id = v_rescue.accepted_by_company_id;

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'OK',
    'passenger_confirm_status', v_rescue.passenger_confirm_status,
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
-- 10) Server-authoritative timeout processor (lazy; call from API / dashboard)
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

  RETURN jsonb_build_object(
    'ok', true,
    'auto_activated', v_auto_activated,
    'opportunities_withdrawn', v_opp_withdrawn,
    'rescues_expired', v_rescues_expired,
    'decision_seconds', public.taxio_rescue_decision_seconds(),
    'opportunity_seconds', public.taxio_rescue_opportunity_seconds(),
    'server_now', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_process_timeouts() TO authenticated, service_role, anon;
