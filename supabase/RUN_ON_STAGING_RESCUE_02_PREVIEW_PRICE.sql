-- =============================================================================
-- RUN ON: permanent staging Supabase ONLY (lyjicuuyrvblbsqlduqg)
-- App: staging.taxio.be / stagingtaxio
-- DO NOT run on production (taxio.be / gdiamipqrhxbmrcsnqdk)
-- Rescue Phase 2 — frozen estimated_price_eur + preview price
-- Safe to re-run where statements are idempotent.
-- =============================================================================
-- TAXIO Rescue Phase 2 â€” immutable booking trip price + Rescue preview copy
-- TARGET: taxio-v001 / taxio-v001-staging ONLY (do not run on production)
--
-- BUSINESS RULE:
--   The passenger price quoted at booking create time belongs to THIS booking.
--   Rescue MUST NEVER recalculate or replace it using Company B pricing.
--   Receiving companies accept the trip at the displayed original price.
--
-- This migration does NOT create a second fare engine.
-- App write path (after apply): public-booking / bookCompany must persist
-- estimated_price_eur + price_currency from the passenger-facing estimate.

-- ---------------------------------------------------------------------------
-- 1) Structured price snapshot on the booking (source of truth)
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS estimated_price_eur numeric,
  ADD COLUMN IF NOT EXISTS price_currency text NOT NULL DEFAULT 'EUR';

COMMENT ON COLUMN public.booking_requests.estimated_price_eur IS
  'Immutable passenger-facing trip price (EUR) shown at booking create. Point-to-point estimate only. Never recalculated by Rescue or by a receiving company.';
COMMENT ON COLUMN public.booking_requests.price_currency IS
  'ISO-ish currency code for estimated_price_eur. TAXIO currently quotes EUR only; default EUR.';

-- ---------------------------------------------------------------------------
-- 2) Rescue safe preview display field (copied at activation)
-- ---------------------------------------------------------------------------
ALTER TABLE public.rescue_requests
  ADD COLUMN IF NOT EXISTS preview_estimated_price text;

COMMENT ON COLUMN public.rescue_requests.preview_estimated_price IS
  'Display label of the ORIGINAL booking trip price copied at Rescue activation (e.g. â‚¬35). Not recalculated.';

-- ---------------------------------------------------------------------------
-- 3) Helpers: format booking price; legacy notes fallback only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_format_trip_price_label(
  p_amount numeric,
  p_currency text DEFAULT 'EUR'
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cur text := upper(nullif(trim(coalesce(p_currency, 'EUR')), ''));
  amt text;
BEGIN
  IF p_amount IS NULL THEN
    RETURN NULL;
  END IF;
  -- Avoid trailing '.' from to_char on whole euros (35 â†’ '35' not '35.')
  amt := trim(both from to_char(p_amount, 'FM999999990.99'));
  IF right(amt, 1) = '.' THEN
    amt := left(amt, length(amt) - 1);
  END IF;
  IF cur IS NULL OR cur = 'EUR' THEN
    RETURN 'â‚¬' || amt;
  END IF;
  RETURN amt || ' ' || cur;
END;
$$;

CREATE OR REPLACE FUNCTION public.taxio_rescue_extract_estimate_label(p_notes text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := coalesce(p_notes, '');
  m text[];
BEGIN
  -- LEGACY ONLY: older bookings stored Estimate: â€¦ â‚¬N inside notes.
  -- New bookings must use booking_requests.estimated_price_eur.
  m := regexp_match(s, 'Estimate:[^\n]*â‚¬\s*([0-9]+(?:[.,][0-9]+)?)', 'i');
  IF m IS NOT NULL THEN
    RETURN 'â‚¬' || replace(m[1], ',', '.');
  END IF;
  m := regexp_match(s, 'â‚¬\s*([0-9]+(?:[.,][0-9]+)?)');
  IF m IS NOT NULL THEN
    RETURN 'â‚¬' || replace(m[1], ',', '.');
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.taxio_booking_trip_price_label(
  p_estimated_price_eur numeric,
  p_price_currency text,
  p_notes text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Prefer structured booking snapshot; notes parser is legacy fallback only.
  RETURN coalesce(
    public.taxio_format_trip_price_label(p_estimated_price_eur, p_price_currency),
    public.taxio_rescue_extract_estimate_label(p_notes)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_format_trip_price_label(numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.taxio_rescue_extract_estimate_label(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.taxio_booking_trip_price_label(numeric, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) activate_rescue_request â€” copy ORIGINAL booking price into preview
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

  -- Immutable copy: NEVER recompute from companies.pricing of A or B.
  v_price_label := public.taxio_booking_trip_price_label(
    v_booking.estimated_price_eur,
    v_booking.price_currency,
    v_booking.notes
  );

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

  INSERT INTO public.rescue_opportunities (rescue_request_id, company_id, status)
  SELECT v_rescue.id, c.id, 'OFFERED'
  FROM public.companies c
  WHERE c.status = 'approved'
    AND COALESCE(c.rescue_enabled, false) = true
    AND c.id <> p_company_id;

  GET DIAGNOSTICS v_offered = ROW_COUNT;

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
    'price_currency', v_booking.price_currency
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_rescue_request(uuid, uuid) TO authenticated, service_role;

-- Winner details must expose the frozen booking trip price (same â‚¬ as passenger saw).
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_rescue FROM public.rescue_requests WHERE id = p_rescue_request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF NOT (
    public.is_platform_admin()
    OR public.taxio_user_can_act_as_company(v_rescue.original_company_id)
    OR (
      v_rescue.status = 'ACCEPTED'
      AND v_rescue.accepted_by_company_id IS NOT NULL
      AND public.taxio_user_can_act_as_company(v_rescue.accepted_by_company_id)
    )
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF v_rescue.status <> 'ACCEPTED'
     AND NOT public.is_platform_admin()
     AND NOT public.taxio_user_can_act_as_company(v_rescue.original_company_id) THEN
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

