-- TAXIO Rescue Phase 1 — data model + atomic acceptance
-- TARGET: taxio-v001-staging ONLY (never production taxio.be / prod Supabase)
-- Branch: taxio-v001
--
-- APPLY: Supabase Dashboard → project taxio-v001-staging (ref lyjicuuyrvblbsqlduqg)
--        → SQL → New query → paste this entire file → Run
-- DO NOT run on production.
--
-- Does NOT alter booking_requests columns or normal booking status semantics.
-- Rescue references the original booking and preserves original_company_id.

-- ---------------------------------------------------------------------------
-- 1) Platform emergency kill switch (single-row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.taxio_platform_flags (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rescue_globally_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.taxio_platform_flags IS
  'Singleton platform flags. rescue_globally_enabled=false kills all Rescue without affecting normal bookings.';

INSERT INTO public.taxio_platform_flags (id, rescue_globally_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.taxio_platform_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS taxio_platform_flags_select_authenticated ON public.taxio_platform_flags;
CREATE POLICY taxio_platform_flags_select_authenticated
  ON public.taxio_platform_flags
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS taxio_platform_flags_update_admin ON public.taxio_platform_flags;
CREATE POLICY taxio_platform_flags_update_admin
  ON public.taxio_platform_flags
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

GRANT SELECT ON TABLE public.taxio_platform_flags TO anon, authenticated, service_role;
GRANT UPDATE ON TABLE public.taxio_platform_flags TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Per-company Rescue enable (independent of normal booking)
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS rescue_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companies.rescue_enabled IS
  'When true (and platform rescue_globally_enabled), company may activate Rescue on own bookings and accept opportunities.';

-- ---------------------------------------------------------------------------
-- 3) rescue_requests — one Rescue case per original booking (Phase 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rescue_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid NOT NULL REFERENCES public.booking_requests (id) ON DELETE RESTRICT,
  original_company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  accepted_by_company_id uuid REFERENCES public.companies (id) ON DELETE RESTRICT,
  activated_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  activated_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Safe preview snapshot (no passenger PII). Copied at activation.
  preview_pickup_label text,
  preview_dropoff_label text,
  preview_ride_datetime timestamptz,
  preview_car_type text,
  preview_service_type text,
  CONSTRAINT rescue_requests_accepted_fields_check CHECK (
    (status = 'ACCEPTED' AND accepted_by_company_id IS NOT NULL AND accepted_at IS NOT NULL)
    OR (status <> 'ACCEPTED' AND accepted_by_company_id IS NULL)
  ),
  CONSTRAINT rescue_requests_not_self_accept_check CHECK (
    accepted_by_company_id IS NULL OR accepted_by_company_id <> original_company_id
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS rescue_requests_booking_uidx
  ON public.rescue_requests (booking_request_id);

CREATE INDEX IF NOT EXISTS rescue_requests_status_idx
  ON public.rescue_requests (status, activated_at DESC);

CREATE INDEX IF NOT EXISTS rescue_requests_original_company_idx
  ON public.rescue_requests (original_company_id);

CREATE INDEX IF NOT EXISTS rescue_requests_accepted_by_idx
  ON public.rescue_requests (accepted_by_company_id)
  WHERE accepted_by_company_id IS NOT NULL;

COMMENT ON TABLE public.rescue_requests IS
  'Rescue case for an original booking_requests row. original_company_id is immutable history; winner is accepted_by_company_id.';

-- ---------------------------------------------------------------------------
-- 4) rescue_opportunities — per eligible company offer
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rescue_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rescue_request_id uuid NOT NULL REFERENCES public.rescue_requests (id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'OFFERED'
    CHECK (status IN ('OFFERED', 'ACCEPTED', 'MISSED', 'WITHDRAWN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (rescue_request_id, company_id)
);

CREATE INDEX IF NOT EXISTS rescue_opportunities_company_status_idx
  ON public.rescue_opportunities (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS rescue_opportunities_rescue_idx
  ON public.rescue_opportunities (rescue_request_id);

COMMENT ON TABLE public.rescue_opportunities IS
  'Per-company offer for a Rescue request. Multiple may be OFFERED; only one may become ACCEPTED.';

-- ---------------------------------------------------------------------------
-- 5) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_rescue_globally_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rescue_globally_enabled FROM public.taxio_platform_flags WHERE id = 1),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_globally_enabled() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.taxio_user_can_act_as_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_company_id IS NOT NULL
    AND (
      public.is_platform_admin()
      OR p_company_id IN (SELECT public.user_company_ids())
    );
$$;

GRANT EXECUTE ON FUNCTION public.taxio_user_can_act_as_company(uuid) TO authenticated, service_role;

-- Strip house number / keep city-ish label for pre-accept preview (best-effort, NL/BE addresses).
CREATE OR REPLACE FUNCTION public.taxio_rescue_safe_address_label(p_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := trim(both FROM coalesce(p_address, ''));
  parts text[];
BEGIN
  IF s = '' THEN
    RETURN NULL;
  END IF;
  -- Prefer last comma-separated segment (often "9000 Gent")
  parts := regexp_split_to_array(s, '\s*,\s*');
  IF array_length(parts, 1) >= 2 THEN
    RETURN left(trim(both FROM parts[array_length(parts, 1)]), 120);
  END IF;
  RETURN left(s, 80);
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_safe_address_label(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Activate Rescue (Company A) — creates opportunities for eligible companies
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
    preview_service_type
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
    v_booking.service_type
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
    'opportunities_offered', v_offered
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_rescue_request(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Atomic accept — only one winner (FOR UPDATE + conditional UPDATE)
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
  v_rescue public.rescue_requests%ROWTYPE;
  v_company public.companies%ROWTYPE;
  v_updated int := 0;
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

  IF v_rescue.original_company_id = p_company_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CANNOT_RESCUE_OWN');
  END IF;

  IF v_rescue.status = 'ACCEPTED' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_TAKEN',
      'accepted_by_company_id', v_rescue.accepted_by_company_id,
      'accepted_at', v_rescue.accepted_at
    );
  END IF;

  IF v_rescue.status <> 'OPEN' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_OPEN', 'status', v_rescue.status);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rescue_opportunities o
    WHERE o.rescue_request_id = p_rescue_request_id
      AND o.company_id = p_company_id
      AND o.status = 'OFFERED'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NO_OPPORTUNITY');
  END IF;

  UPDATE public.rescue_requests
  SET
    status = 'ACCEPTED',
    accepted_by_company_id = p_company_id,
    accepted_at = now(),
    closed_at = now()
  WHERE id = p_rescue_request_id
    AND status = 'OPEN';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    SELECT * INTO v_rescue FROM public.rescue_requests WHERE id = p_rescue_request_id;
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_TAKEN',
      'accepted_by_company_id', v_rescue.accepted_by_company_id
    );
  END IF;

  UPDATE public.rescue_opportunities
  SET status = 'ACCEPTED', responded_at = now()
  WHERE rescue_request_id = p_rescue_request_id
    AND company_id = p_company_id
    AND status = 'OFFERED';

  UPDATE public.rescue_opportunities
  SET status = 'MISSED', responded_at = now()
  WHERE rescue_request_id = p_rescue_request_id
    AND company_id <> p_company_id
    AND status = 'OFFERED';

  RETURN jsonb_build_object(
    'ok', true,
    'code', 'ACCEPTED',
    'rescue_request_id', p_rescue_request_id,
    'accepted_by_company_id', p_company_id,
    'original_company_id', v_rescue.original_company_id,
    'booking_request_id', v_rescue.booking_request_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_rescue_request(uuid, uuid) TO authenticated, service_role;

-- Winner (or original company / admin) may read full booking details after accept.
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

  -- Before accept: original company / admin only get full PII; opportunity companies use preview columns.
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
      'created_at', v_booking.created_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rescue_booking_details(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.rescue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_opportunities ENABLE ROW LEVEL SECURITY;

-- Visibility helpers avoid RLS recursion between rescue_requests ↔ opportunities.
CREATE OR REPLACE FUNCTION public.taxio_user_has_rescue_opportunity(p_rescue_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rescue_opportunities o
    WHERE o.rescue_request_id = p_rescue_request_id
      AND o.company_id IN (SELECT public.user_company_ids())
  );
$$;

CREATE OR REPLACE FUNCTION public.taxio_user_is_rescue_origin_or_winner(p_rescue_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rescue_requests r
    WHERE r.id = p_rescue_request_id
      AND (
        r.original_company_id IN (SELECT public.user_company_ids())
        OR r.accepted_by_company_id IN (SELECT public.user_company_ids())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.taxio_user_has_rescue_opportunity(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.taxio_user_is_rescue_origin_or_winner(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS rescue_requests_select_scope ON public.rescue_requests;
CREATE POLICY rescue_requests_select_scope
  ON public.rescue_requests
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR original_company_id IN (SELECT public.user_company_ids())
    OR accepted_by_company_id IN (SELECT public.user_company_ids())
    OR public.taxio_user_has_rescue_opportunity(id)
  );

-- No direct INSERT/UPDATE/DELETE for clients — use RPCs (SECURITY DEFINER).

DROP POLICY IF EXISTS rescue_opportunities_select_scope ON public.rescue_opportunities;
CREATE POLICY rescue_opportunities_select_scope
  ON public.rescue_opportunities
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR company_id IN (SELECT public.user_company_ids())
    OR public.taxio_user_is_rescue_origin_or_winner(rescue_request_id)
  );

GRANT SELECT ON TABLE public.rescue_requests TO authenticated, service_role;
GRANT SELECT ON TABLE public.rescue_opportunities TO authenticated, service_role;
GRANT ALL ON TABLE public.rescue_requests TO service_role;
GRANT ALL ON TABLE public.rescue_opportunities TO service_role;
