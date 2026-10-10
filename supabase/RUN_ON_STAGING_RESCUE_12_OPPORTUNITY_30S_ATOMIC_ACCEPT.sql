-- =============================================================================
-- STAGING ONLY — Rescue opportunity 30s + harden atomic Accept (zero-conflict)
-- Project: lyjicuuyrvblbsqlduqg (staging.taxio.be)
-- DO NOT run on production / taxio.be
--
-- Company A decision window: 25s (unchanged)
-- Rescue B/C/D/E opportunity window: 30s (was 10s)
-- Accept: row-lock + conditional UPDATE — exactly one winner
-- =============================================================================

-- 1) Platform config — authoritative opportunity seconds
ALTER TABLE public.taxio_platform_flags
  ALTER COLUMN rescue_opportunity_seconds SET DEFAULT 30;

UPDATE public.taxio_platform_flags
SET
  rescue_opportunity_seconds = 30,
  updated_at = now()
WHERE id = 1;

COMMENT ON COLUMN public.taxio_platform_flags.rescue_opportunity_seconds IS
  'Seconds each Rescue opportunity stays OFFERED (B/C/D/E). Server expires_at is authoritative; UI countdown is display-only.';

CREATE OR REPLACE FUNCTION public.taxio_rescue_opportunity_seconds()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT rescue_opportunity_seconds FROM public.taxio_platform_flags WHERE id = 1),
    30
  );
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_opportunity_seconds() TO anon, authenticated, service_role;

-- 2) Atomic Accept — FOR UPDATE + claim WHERE status=OPEN AND no winner yet
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

  -- Serialize all Accept attempts for this rescue row.
  SELECT * INTO v_rescue
  FROM public.rescue_requests
  WHERE id = p_rescue_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  -- Winner immutable: already assigned → reject (no PII in response).
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

  -- Atomic claim: first transaction that updates OPEN → ACCEPTED wins.
  UPDATE public.rescue_requests
  SET
    status = 'ACCEPTED',
    accepted_by_company_id = p_company_id,
    accepted_at = now(),
    passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION',
    passenger_confirm_token = public.taxio_rescue_new_confirm_token(),
    passenger_confirmed_at = NULL
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

  -- Close all other offers immediately (losers).
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

-- Verify:
--   SELECT public.taxio_rescue_opportunity_seconds();  -- expect 30
--   SELECT original_company_decision_seconds, rescue_opportunity_seconds
--   FROM taxio_platform_flags WHERE id = 1;
