-- =============================================================================
-- STAGING ONLY — lyjicuuyrvblbsqlduqg / staging.taxio.be
-- DRIVER PUSH STEP 1: database foundation (subscriptions + outbox + triggers)
--
-- DO NOT APPLY AUTOMATICALLY — review then run in staging SQL Editor.
-- Does NOT configure webhooks, VAPID, service worker, or Vercel env.
-- Does NOT change Rescue business logic / RPCs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) company_push_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz NULL,
  last_error text NULL,
  CONSTRAINT company_push_subscriptions_endpoint_uidx UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS company_push_subscriptions_company_enabled_idx
  ON public.company_push_subscriptions (company_id, enabled);

COMMENT ON TABLE public.company_push_subscriptions IS
  'Web Push subscriptions for company PWA devices. Multiple devices per company. No VAPID secrets.';

CREATE OR REPLACE FUNCTION public.taxio_company_push_subscriptions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_push_subscriptions_updated_at
  ON public.company_push_subscriptions;
CREATE TRIGGER trg_company_push_subscriptions_updated_at
  BEFORE UPDATE ON public.company_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.taxio_company_push_subscriptions_set_updated_at();

ALTER TABLE public.company_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_push_subscriptions_select_own ON public.company_push_subscriptions;
CREATE POLICY company_push_subscriptions_select_own
  ON public.company_push_subscriptions
  FOR SELECT
  TO authenticated
  USING (public.taxio_user_can_act_as_company(company_id));

DROP POLICY IF EXISTS company_push_subscriptions_insert_own ON public.company_push_subscriptions;
CREATE POLICY company_push_subscriptions_insert_own
  ON public.company_push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.taxio_user_can_act_as_company(company_id));

DROP POLICY IF EXISTS company_push_subscriptions_update_own ON public.company_push_subscriptions;
CREATE POLICY company_push_subscriptions_update_own
  ON public.company_push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (public.taxio_user_can_act_as_company(company_id))
  WITH CHECK (public.taxio_user_can_act_as_company(company_id));

DROP POLICY IF EXISTS company_push_subscriptions_delete_own ON public.company_push_subscriptions;
CREATE POLICY company_push_subscriptions_delete_own
  ON public.company_push_subscriptions
  FOR DELETE
  TO authenticated
  USING (public.taxio_user_can_act_as_company(company_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_push_subscriptions
  TO authenticated;
GRANT ALL ON TABLE public.company_push_subscriptions TO service_role;
REVOKE ALL ON TABLE public.company_push_subscriptions FROM anon;

-- ---------------------------------------------------------------------------
-- 2) company_push_outbox (routing IDs only — no passenger PII, no secrets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  booking_id uuid NULL REFERENCES public.booking_requests (id) ON DELETE SET NULL,
  rescue_request_id uuid NULL REFERENCES public.rescue_requests (id) ON DELETE SET NULL,
  rescue_opportunity_id uuid NULL REFERENCES public.rescue_opportunities (id) ON DELETE SET NULL,
  dedupe_key text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processing_at timestamptz NULL,
  sent_at timestamptz NULL,
  last_error text NULL,
  CONSTRAINT company_push_outbox_dedupe_key_uidx UNIQUE (dedupe_key),
  CONSTRAINT company_push_outbox_event_type_check CHECK (
    event_type IN (
      'COMPANY_BOOKING_NEW',
      'RESCUE_OPPORTUNITY_NEW',
      'PASSENGER_CONFIRMED',
      'PASSENGER_CANCELLED'
    )
  ),
  CONSTRAINT company_push_outbox_status_check CHECK (
    status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')
  )
);

CREATE INDEX IF NOT EXISTS company_push_outbox_status_created_idx
  ON public.company_push_outbox (status, created_at ASC);

CREATE INDEX IF NOT EXISTS company_push_outbox_company_created_idx
  ON public.company_push_outbox (company_id, created_at DESC);

COMMENT ON TABLE public.company_push_outbox IS
  'Server-owned push dispatch queue. Identifiers only — no passenger PII, no VAPID/JWT secrets.';

ALTER TABLE public.company_push_outbox ENABLE ROW LEVEL SECURITY;

-- No authenticated policies: company users cannot manufacture push events.
DROP POLICY IF EXISTS company_push_outbox_select_admin ON public.company_push_outbox;
CREATE POLICY company_push_outbox_select_admin
  ON public.company_push_outbox
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

REVOKE ALL ON TABLE public.company_push_outbox FROM anon, authenticated;
GRANT SELECT ON TABLE public.company_push_outbox TO authenticated;
GRANT ALL ON TABLE public.company_push_outbox TO service_role;

-- ---------------------------------------------------------------------------
-- 3) SECURITY DEFINER enqueue helper (triggers + service_role only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_company_push_enqueue(
  p_company_id uuid,
  p_event_type text,
  p_dedupe_key text,
  p_booking_id uuid DEFAULT NULL,
  p_rescue_request_id uuid DEFAULT NULL,
  p_rescue_opportunity_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_company_id IS NULL
     OR p_event_type IS NULL
     OR p_dedupe_key IS NULL
     OR length(trim(p_dedupe_key)) = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.company_push_outbox (
    company_id,
    event_type,
    booking_id,
    rescue_request_id,
    rescue_opportunity_id,
    dedupe_key,
    status
  ) VALUES (
    p_company_id,
    p_event_type,
    p_booking_id,
    p_rescue_request_id,
    p_rescue_opportunity_id,
    trim(p_dedupe_key),
    'PENDING'
  )
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.taxio_company_push_enqueue(uuid, text, text, uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.taxio_company_push_enqueue(uuid, text, text, uuid, uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Company A: booking draft/other → new (with decision deadline)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_company_push_on_booking_new()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.status, '') = 'new' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'new' THEN
    RETURN NEW;
  END IF;

  IF NEW.decision_deadline_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.taxio_company_push_enqueue(
    NEW.company_id,
    'COMPANY_BOOKING_NEW',
    'booking-new:' || NEW.id::text,
    NEW.id,
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_push_booking_new ON public.booking_requests;
CREATE TRIGGER trg_company_push_booking_new
  AFTER UPDATE OF status, decision_deadline_at ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.taxio_company_push_on_booking_new();

-- ---------------------------------------------------------------------------
-- 5) Rescue opportunity OFFERED (manual decline + pg_cron auto-activate)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_company_push_on_rescue_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM 'OFFERED' THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL OR NEW.id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.taxio_company_push_enqueue(
    NEW.company_id,
    'RESCUE_OPPORTUNITY_NEW',
    'rescue-opportunity:' || NEW.id::text,
    NULL,
    NEW.rescue_request_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_push_rescue_opportunity ON public.rescue_opportunities;
CREATE TRIGGER trg_company_push_rescue_opportunity
  AFTER INSERT ON public.rescue_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.taxio_company_push_on_rescue_opportunity();

-- ---------------------------------------------------------------------------
-- 6) Passenger CONFIRMED / CANCELLED_BY_PASSENGER (winner only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxio_company_push_on_passenger_confirm_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.passenger_confirm_status IS NOT DISTINCT FROM NEW.passenger_confirm_status THEN
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.passenger_confirm_status, '') <> 'WAITING_PASSENGER_CONFIRMATION' THEN
    RETURN NEW;
  END IF;

  IF NEW.accepted_by_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.passenger_confirm_status = 'CONFIRMED' THEN
    PERFORM public.taxio_company_push_enqueue(
      NEW.accepted_by_company_id,
      'PASSENGER_CONFIRMED',
      'passenger-confirmed:' || NEW.id::text,
      NEW.booking_request_id,
      NEW.id,
      NULL
    );
  ELSIF NEW.passenger_confirm_status = 'CANCELLED_BY_PASSENGER' THEN
    PERFORM public.taxio_company_push_enqueue(
      NEW.accepted_by_company_id,
      'PASSENGER_CANCELLED',
      'passenger-cancelled:' || NEW.id::text,
      NEW.booking_request_id,
      NEW.id,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_company_push_passenger_confirm_status ON public.rescue_requests;
CREATE TRIGGER trg_company_push_passenger_confirm_status
  AFTER UPDATE OF passenger_confirm_status ON public.rescue_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.taxio_company_push_on_passenger_confirm_status();

-- =============================================================================
-- OPTIONAL STAGING PROOF (run AFTER apply; rolls back synthetic rows)
-- Proves A–H without leaving permanent test data.
-- =============================================================================

DO $$
DECLARE
  v_co_a uuid := gen_random_uuid();
  v_co_b uuid := gen_random_uuid();
  v_booking uuid := gen_random_uuid();
  v_booking2 uuid := gen_random_uuid();
  v_rescue uuid := gen_random_uuid();
  v_rescue2 uuid := gen_random_uuid();
  v_opp uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_token2 text := encode(gen_random_bytes(24), 'hex');
  v_n int;
  v_can_insert boolean;
  v_has_phone_col boolean;
  v_has_name_col boolean;
BEGIN
  -- H: authenticated must not have INSERT privilege on outbox
  SELECT has_table_privilege('authenticated', 'public.company_push_outbox', 'INSERT')
  INTO v_can_insert;
  IF v_can_insert THEN
    RAISE EXCEPTION 'FAIL H: authenticated can INSERT company_push_outbox';
  END IF;

  -- G: outbox must not have passenger PII columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_push_outbox'
      AND column_name IN ('customer_phone', 'passenger_phone', 'phone')
  ) INTO v_has_phone_col;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'company_push_outbox'
      AND column_name IN ('customer_name', 'passenger_name', 'name')
  ) INTO v_has_name_col;
  IF v_has_phone_col OR v_has_name_col THEN
    RAISE EXCEPTION 'FAIL G: outbox has passenger PII columns';
  END IF;

  INSERT INTO public.companies (id, name, slug, email, status, rescue_enabled)
  VALUES
    (v_co_a, 'Push Test A', 'push-test-a-' || substr(v_co_a::text, 1, 8), 'push-a@example.test', 'approved', true),
    (v_co_b, 'Push Test B', 'push-test-b-' || substr(v_co_b::text, 1, 8), 'push-b@example.test', 'approved', true);

  -- A: draft → new with deadline → exactly 1 COMPANY_BOOKING_NEW
  INSERT INTO public.booking_requests (
    id, company_id, customer_name, customer_phone,
    pickup_address, dropoff_address, ride_datetime, status, decision_deadline_at
  ) VALUES (
    v_booking, v_co_a, 'Proof Rider', '+32470000001',
    'Street 1, 9000 Gent', 'Station, 9000 Gent', now() + interval '2 hours',
    'draft', NULL
  );

  UPDATE public.booking_requests
  SET status = 'new', decision_deadline_at = now() + interval '25 seconds'
  WHERE id = v_booking;

  SELECT count(*) INTO v_n
  FROM public.company_push_outbox
  WHERE dedupe_key = 'booking-new:' || v_booking::text
    AND event_type = 'COMPANY_BOOKING_NEW'
    AND company_id = v_co_a;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL A: expected 1 COMPANY_BOOKING_NEW, got %', v_n;
  END IF;

  -- B: unrelated update → still exactly 1
  UPDATE public.booking_requests
  SET notes = 'unrelated proof note'
  WHERE id = v_booking;

  SELECT count(*) INTO v_n
  FROM public.company_push_outbox
  WHERE dedupe_key = 'booking-new:' || v_booking::text;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL B: expected still 1 booking-new row, got %', v_n;
  END IF;

  -- C: OFFERED opportunity → exactly 1 RESCUE_OPPORTUNITY_NEW (cron-compatible path)
  INSERT INTO public.rescue_requests (
    id, booking_request_id, original_company_id, status, activated_at,
    preview_pickup_label, preview_dropoff_label, preview_ride_datetime, preview_estimated_price
  ) VALUES (
    v_rescue, v_booking, v_co_a, 'OPEN', now(),
    'Gent', 'Gent', now() + interval '2 hours', 'EUR 25.00'
  );

  INSERT INTO public.rescue_opportunities (
    id, rescue_request_id, company_id, status, expires_at
  ) VALUES (
    v_opp, v_rescue, v_co_b, 'OFFERED', now() + interval '30 seconds'
  );

  SELECT count(*) INTO v_n
  FROM public.company_push_outbox
  WHERE dedupe_key = 'rescue-opportunity:' || v_opp::text
    AND event_type = 'RESCUE_OPPORTUNITY_NEW'
    AND company_id = v_co_b;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL C: expected 1 RESCUE_OPPORTUNITY_NEW, got %', v_n;
  END IF;

  -- Prepare winner waiting state (simulate accept without changing Rescue RPC logic)
  UPDATE public.rescue_opportunities
  SET status = 'ACCEPTED', responded_at = now()
  WHERE id = v_opp;

  UPDATE public.rescue_requests
  SET
    status = 'ACCEPTED',
    accepted_by_company_id = v_co_b,
    accepted_at = now(),
    passenger_confirm_status = 'WAITING_PASSENGER_CONFIRMATION',
    passenger_confirm_token = v_token
  WHERE id = v_rescue;

  -- D: confirm → exactly 1 PASSENGER_CONFIRMED
  UPDATE public.rescue_requests
  SET passenger_confirm_status = 'CONFIRMED', passenger_confirmed_at = now()
  WHERE id = v_rescue;

  SELECT count(*) INTO v_n
  FROM public.company_push_outbox
  WHERE dedupe_key = 'passenger-confirmed:' || v_rescue::text
    AND event_type = 'PASSENGER_CONFIRMED'
    AND company_id = v_co_b;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL D: expected 1 PASSENGER_CONFIRMED, got %', v_n;
  END IF;

  -- E: idempotent re-confirm UPDATE → no duplicate
  UPDATE public.rescue_requests
  SET passenger_confirm_status = 'CONFIRMED', passenger_confirmed_at = now()
  WHERE id = v_rescue;

  SELECT count(*) INTO v_n
  FROM public.company_push_outbox
  WHERE dedupe_key = 'passenger-confirmed:' || v_rescue::text;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL E: expected still 1 passenger-confirmed, got %', v_n;
  END IF;

  -- F: fresh waiting rescue → CANCELLED → exactly 1 PASSENGER_CANCELLED
  INSERT INTO public.booking_requests (
    id, company_id, customer_name, customer_phone,
    pickup_address, dropoff_address, ride_datetime, status
  ) VALUES (
    v_booking2, v_co_a, 'Proof Rider 2', '+32470000002',
    'A', 'B', now() + interval '3 hours', 'rejected'
  );

  INSERT INTO public.rescue_requests (
    id, booking_request_id, original_company_id, status,
    accepted_by_company_id, accepted_at,
    passenger_confirm_status, passenger_confirm_token, activated_at
  ) VALUES (
    v_rescue2, v_booking2, v_co_a, 'ACCEPTED',
    v_co_b, now(),
    'WAITING_PASSENGER_CONFIRMATION', v_token2, now()
  );

  UPDATE public.rescue_requests
  SET passenger_confirm_status = 'CANCELLED_BY_PASSENGER', closed_at = now()
  WHERE id = v_rescue2;

  SELECT count(*) INTO v_n
  FROM public.company_push_outbox
  WHERE dedupe_key = 'passenger-cancelled:' || v_rescue2::text
    AND event_type = 'PASSENGER_CANCELLED'
    AND company_id = v_co_b;
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FAIL F: expected 1 PASSENGER_CANCELLED, got %', v_n;
  END IF;

  -- Cleanup synthetic fixtures
  DELETE FROM public.company_push_outbox WHERE company_id IN (v_co_a, v_co_b);
  DELETE FROM public.rescue_opportunities WHERE rescue_request_id IN (v_rescue, v_rescue2);
  DELETE FROM public.rescue_requests WHERE id IN (v_rescue, v_rescue2);
  DELETE FROM public.booking_requests WHERE id IN (v_booking, v_booking2);
  DELETE FROM public.companies WHERE id IN (v_co_a, v_co_b);

  RAISE NOTICE 'PUSH DATABASE FOUNDATION PROOF: PASS (A-H)';
EXCEPTION
  WHEN OTHERS THEN
    DELETE FROM public.company_push_outbox WHERE company_id IN (v_co_a, v_co_b);
    DELETE FROM public.rescue_opportunities WHERE company_id IN (v_co_a, v_co_b)
      OR rescue_request_id IN (v_rescue, v_rescue2);
    DELETE FROM public.rescue_requests WHERE id IN (v_rescue, v_rescue2)
      OR original_company_id IN (v_co_a, v_co_b)
      OR accepted_by_company_id IN (v_co_a, v_co_b);
    DELETE FROM public.booking_requests WHERE id IN (v_booking, v_booking2)
      OR company_id IN (v_co_a, v_co_b);
    DELETE FROM public.companies WHERE id IN (v_co_a, v_co_b);
    RAISE;
END
$$;
