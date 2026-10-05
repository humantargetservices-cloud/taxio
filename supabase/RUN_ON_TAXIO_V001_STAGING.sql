-- ============================================================
-- TAXIO V001 STAGING DATABASE BOOTSTRAP
-- TARGET: taxio-v001-staging ONLY
-- DO NOT RUN ON TAXIO PRODUCTION
-- RUN ONCE ON A NEW/EMPTY STAGING PROJECT
-- ============================================================
-- =============================================================================
-- =============================================================================
--
--   TAXIO V001 STAGING ONLY
--   DO NOT RUN AGAINST PRODUCTION
--
--   Project:     taxio-v001-staging  (empty Supabase project)
--   Purpose:     recreate CURRENT production TAXIO DATABASE STRUCTURE only
--   Data:        NONE — no companies, bookings, auth users, or production rows
--   Branch:      taxio-v001 @ 752b65d6e2be083967e473ef89ada486b2e3f319
--
--   Run once in the SQL Editor of taxio-v001-staging.
--   If tables already exist, this script is designed to FAIL, not mutate.
--
-- =============================================================================
-- =============================================================================
--
-- Source map (inspected on taxio-v001; folded into this single bootstrap)
--
--   INCORPORATED (structure only, final shape — not a 1:1 replay of ALTERs):
--     1.  schema.sql
--     2.  migration_add_vat_number.sql
--     3.  migration_structure_v2.sql
--     4.  migration_onboarding_admin_approval.sql
--     5.  migration_onboarding_company_trigger.sql
--     6.  migration_fix_companies_guard_service_role_bypass.sql
--     7.  migration_company_status_suspended.sql
--     8.  migration_cars_select_public_booking.sql
--     9.  migration_registration_uniqueness_hardening.sql
--     10. migration_company_logo.sql
--     11. migration_profiles_company_onboarding.sql
--     12. migration_companies_dev_fixture.sql          (COLUMN + index only)
--     13. migration_legal_acceptance.sql
--     14. migration_company_preferred_locale.sql
--     15. migration_preferred_locale_default_nl_alter.sql
--     16. migration_abuse_rate_events.sql
--     17. migration_abuse_protection_metadata.sql
--     18. migration_abuse_rate_events_retention.sql
--     19. migration_company_hourly_service.sql
--     20. migration_company_analytics_events.sql
--
--   EXCLUDED:
--     - migration_company_commercial_tier.sql
--       Not on taxio-v001. Intentionally later.
--     - Any INSERT/UPDATE of companies, profiles, bookings, cars, analytics
--     - schema.sql commented platform-admin INSERT (Auth is dashboard work)
--
--   SUPERSEDED (not replayed as separate steps; final version used once):
--     - taxio_companies_update_guard() defined in structure_v2, then replaced
--       by onboarding_company_trigger and fix_companies_guard_service_role_bypass.
--       Those three function bodies are identical on this branch; the final
--       service_role JWT bypass version is created once below.
--     - vat_number, first_login_required, nullable owner_user_id, and
--       status IN (..., 'suspended') already appear in schema.sql on this
--       commit; the matching later ALTERs are folded into CREATE TABLE.
--     - preferred_locale default 'nl' (preferred_locale + default_nl_alter).
--
--   EMPTY-PROJECT SIMPLIFICATIONS:
--     - Unique registration indexes are created directly (no duplicate-row
--       existence checks — staging is empty).
--     - No IF NOT EXISTS on CREATE TABLE (fail loudly if the wrong project
--       already has TAXIO tables).
--
--   AFTER THIS FILE (manual, not SQL):
--     - Supabase Auth: create staging-only users in the dashboard
--     - Promote one staging profile to platform_admin (see footer)
--     - Confirm Storage bucket company-logos is public
--     - Configure Auth redirect URLs to the staging origin only
--
-- Requires: gen_random_uuid() (pgcrypto — default on Supabase)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Core tables (final production-compatible columns)
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN (
      'platform_admin',
      'company_owner',
      'company_staff',
      'customer'
    )),
  first_login_required boolean NOT NULL DEFAULT false,
  company_onboarding_completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.profiles.company_onboarding_completed IS
  'When false, company owner is redirected to /onboarding/company after login.';

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  vat_number text,
  email text NOT NULL,
  phone text,
  city text,
  country text,
  status text NOT NULL DEFAULT 'pending',
  owner_user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  slogan text,
  availability_status text NOT NULL DEFAULT 'available',
  subscription_plan text NOT NULL DEFAULT 'basic',
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  dev_fixture boolean NOT NULL DEFAULT false,
  company_terms_accepted boolean NOT NULL DEFAULT false,
  company_terms_accepted_at timestamptz,
  company_terms_version text,
  preferred_locale text NOT NULL DEFAULT 'nl',
  ip_address text,
  user_agent text,
  turnstile_passed boolean,
  turnstile_error text,
  hourly_enabled boolean NOT NULL DEFAULT false,
  hourly_rate_eur numeric NOT NULL DEFAULT 60,
  hourly_min_hours integer NOT NULL DEFAULT 3,
  CONSTRAINT companies_status_check
    CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  CONSTRAINT companies_availability_status_check
    CHECK (availability_status IN ('available', 'busy', 'offline')),
  CONSTRAINT companies_subscription_plan_check
    CHECK (subscription_plan IN ('basic', 'premium')),
  CONSTRAINT companies_preferred_locale_check
    CHECK (preferred_locale IN ('en', 'fr', 'nl'))
);

COMMENT ON COLUMN public.companies.logo_url IS
  'Public HTTPS URL of company logo (Supabase Storage); shown on booking page and dashboard.';
COMMENT ON COLUMN public.companies.dev_fixture IS
  'When true, company may be removed by platform_admin via dev cleanup API (TAXIO_DEV_CLEANUP_ENABLED only).';
COMMENT ON COLUMN public.companies.company_terms_accepted IS
  'User accepted Terms of Use + Company Terms + Privacy at registration.';
COMMENT ON COLUMN public.companies.company_terms_accepted_at IS
  'ISO timestamp when terms were accepted.';
COMMENT ON COLUMN public.companies.company_terms_version IS
  'Version string from client (e.g. legalVersions bundle).';
COMMENT ON COLUMN public.companies.preferred_locale IS
  'Language used at registration; drives company-facing emails and default dashboard copy.';
COMMENT ON COLUMN public.companies.hourly_enabled IS
  'When true, public booking page offers by-hour / chauffeur hire.';
COMMENT ON COLUMN public.companies.hourly_rate_eur IS
  'Reference hourly rate (EUR) shown to riders; final price is negotiated.';
COMMENT ON COLUMN public.companies.hourly_min_hours IS
  'Minimum duration (hours) for by-hour bookings.';

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'driver'
    CHECK (role IN ('owner', 'admin', 'dispatcher', 'driver')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  customer_name text,
  customer_phone text,
  customer_email text,
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  ride_datetime timestamptz,
  notes text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  car_type text,
  rider_terms_accepted boolean NOT NULL DEFAULT false,
  rider_terms_accepted_at timestamptz,
  rider_terms_version text,
  ip_address text,
  user_agent text,
  turnstile_passed boolean,
  turnstile_error text,
  service_type text NOT NULL DEFAULT 'standard',
  duration_hours numeric,
  hourly_rate_eur numeric,
  hourly_min_hours integer,
  CONSTRAINT booking_requests_service_type_check
    CHECK (service_type IN ('standard', 'hourly'))
);

COMMENT ON COLUMN public.booking_requests.rider_terms_accepted IS
  'Rider accepted Terms of Use + Company Terms + Privacy before quick-book action.';
COMMENT ON COLUMN public.booking_requests.rider_terms_accepted_at IS
  'ISO timestamp when rider terms were accepted.';
COMMENT ON COLUMN public.booking_requests.rider_terms_version IS
  'Version string from client for rider-facing terms.';
COMMENT ON COLUMN public.booking_requests.service_type IS
  'standard = point-to-point; hourly = by-hour / mise à disposition.';
COMMENT ON COLUMN public.booking_requests.duration_hours IS
  'Requested duration in hours (hourly service only).';
COMMENT ON COLUMN public.booking_requests.hourly_rate_eur IS
  'Company reference hourly rate at time of booking.';
COMMENT ON COLUMN public.booking_requests.hourly_min_hours IS
  'Company minimum hours at time of booking.';

CREATE TABLE public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  model text NOT NULL,
  license_plate text NOT NULL,
  year int,
  car_type text NOT NULL DEFAULT 'Standard',
  driver_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.abuse_rate_events (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  ip_address text,
  company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  contact_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.company_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  source text NULL,
  path text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_analytics_events_event_type_check CHECK (
    event_type IN (
      'page_visit',
      'qr_scan',
      'share_visit',
      'whatsapp_click',
      'call_click',
      'email_click'
    )
  )
);

COMMENT ON TABLE public.company_analytics_events IS
  'Anonymous company-level booking funnel events (no customer PII).';

-- ---------------------------------------------------------------------------
-- 2) Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX companies_slug_idx ON public.companies (slug);
CREATE INDEX companies_status_idx ON public.companies (status);
CREATE INDEX companies_owner_idx ON public.companies (owner_user_id);
CREATE INDEX companies_dev_fixture_idx ON public.companies (dev_fixture) WHERE dev_fixture = true;
CREATE INDEX companies_email_idx ON public.companies (lower(trim(email)));
CREATE INDEX companies_vat_norm_idx
  ON public.companies ((regexp_replace(upper(coalesce(vat_number, '')), '[^A-Z0-9]', '', 'g')));
CREATE INDEX companies_phone_digits_idx
  ON public.companies ((regexp_replace(coalesce(phone, ''), '\\D', '', 'g')));
CREATE INDEX companies_ip_created_idx ON public.companies (ip_address, created_at DESC);

CREATE UNIQUE INDEX companies_email_unique_norm_idx
  ON public.companies (lower(trim(email)));
CREATE UNIQUE INDEX companies_vat_unique_norm_idx
  ON public.companies ((regexp_replace(upper(coalesce(vat_number, '')), '[^A-Z0-9]', '', 'g')))
  WHERE coalesce(vat_number, '') <> '';
CREATE UNIQUE INDEX companies_phone_unique_digits_idx
  ON public.companies ((regexp_replace(coalesce(phone, ''), '\\D', '', 'g')))
  WHERE coalesce(phone, '') <> '';

CREATE INDEX company_members_user_idx ON public.company_members (user_id);
CREATE INDEX company_members_company_idx ON public.company_members (company_id);

CREATE INDEX booking_requests_company_idx ON public.booking_requests (company_id);
CREATE INDEX booking_requests_created_idx ON public.booking_requests (created_at DESC);
CREATE INDEX booking_requests_ip_created_idx ON public.booking_requests (ip_address, created_at DESC);
CREATE INDEX booking_requests_contact_created_idx
  ON public.booking_requests (customer_phone, customer_email, created_at DESC);

CREATE INDEX cars_company_idx ON public.cars (company_id);

CREATE INDEX profiles_first_login_idx ON public.profiles (first_login_required);

CREATE INDEX abuse_rate_events_action_created_idx
  ON public.abuse_rate_events (action, created_at DESC);
CREATE INDEX abuse_rate_events_action_ip_created_idx
  ON public.abuse_rate_events (action, ip_address, created_at DESC);
CREATE INDEX abuse_rate_events_action_company_created_idx
  ON public.abuse_rate_events (action, company_id, created_at DESC);
CREATE INDEX abuse_rate_events_action_contact_created_idx
  ON public.abuse_rate_events (action, contact_key, created_at DESC);

CREATE INDEX company_analytics_events_company_id_idx
  ON public.company_analytics_events (company_id);
CREATE INDEX company_analytics_events_event_type_idx
  ON public.company_analytics_events (event_type);
CREATE INDEX company_analytics_events_created_at_idx
  ON public.company_analytics_events (created_at DESC);
CREATE INDEX company_analytics_events_company_created_idx
  ON public.company_analytics_events (company_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3) Helper functions (SECURITY DEFINER — avoid RLS recursion)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'platform_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.companies c
  WHERE c.owner_user_id = auth.uid()
  UNION
  SELECT cm.company_id
  FROM public.company_members cm
  WHERE cm.user_id = auth.uid();
$$;

-- Final owner-update guard (service_role JWT claim + auth.role() bypass).
-- Locks status, slug, owner, approved_at, subscription_plan, created_at, VAT, phone.
CREATE OR REPLACE FUNCTION public.taxio_companies_update_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
  setting_role text;
BEGIN
  jwt_role := nullif(trim(coalesce(auth.jwt() ->> 'role', '')), '');
  BEGIN
    setting_role := nullif(trim(coalesce(current_setting('request.jwt.claim.role', true), '')), '');
  EXCEPTION
    WHEN OTHERS THEN
      setting_role := NULL;
  END;

  IF jwt_role = 'service_role'
     OR setting_role = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.slug := OLD.slug;
  NEW.owner_user_id := OLD.owner_user_id;
  NEW.approved_at := OLD.approved_at;
  NEW.subscription_plan := OLD.subscription_plan;
  NEW.created_at := OLD.created_at;
  NEW.vat_number := OLD.vat_number;
  NEW.phone := OLD.phone;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_taxio_companies_guard
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE PROCEDURE public.taxio_companies_update_guard();

CREATE OR REPLACE FUNCTION public.cleanup_abuse_rate_events(retention_days integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  IF retention_days IS NULL OR retention_days < 1 THEN
    retention_days := 60;
  END IF;

  DELETE FROM public.abuse_rate_events
  WHERE created_at < now() - make_interval(days => retention_days);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_abuse_rate_events(integer)
  IS 'Deletes old rows from abuse_rate_events. Default retention: 60 days.';

-- Staging omits automatic pg_cron scheduling (taxio-abuse-events-cleanup-daily).
-- Manual later if needed: SELECT public.cleanup_abuse_rate_events(60);

-- ---------------------------------------------------------------------------
-- 4) Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_rate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_analytics_events ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_platform_admin());

-- companies
CREATE POLICY "companies_select_public_approved"
  ON public.companies FOR SELECT
  USING (status = 'approved');

CREATE POLICY "companies_select_owner_or_member"
  ON public.companies FOR SELECT
  USING (
    owner_user_id = auth.uid()
    OR id IN (SELECT public.user_company_ids())
    OR public.is_platform_admin()
  );

CREATE POLICY "companies_insert_owner"
  ON public.companies FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND owner_user_id = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "companies_update_admin"
  ON public.companies FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "companies_update_owner_member"
  ON public.companies FOR UPDATE
  USING (owner_user_id = auth.uid());

-- company_members
CREATE POLICY "company_members_select"
  ON public.company_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR company_id IN (SELECT public.user_company_ids())
    OR public.is_platform_admin()
  );

CREATE POLICY "company_members_insert_owner_self"
  ON public.company_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = company_id
          AND c.owner_user_id = auth.uid()
      )
      OR public.is_platform_admin()
    )
  );

-- booking_requests
CREATE POLICY "booking_requests_select_company_scope"
  ON public.booking_requests FOR SELECT
  USING (
    company_id IN (SELECT public.user_company_ids())
    OR public.is_platform_admin()
  );

CREATE POLICY "booking_requests_insert_public_approved_tenant"
  ON public.booking_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_id
        AND c.status = 'approved'
    )
  );

CREATE POLICY "booking_requests_update_company_staff"
  ON public.booking_requests FOR UPDATE
  USING (
    company_id IN (SELECT public.user_company_ids())
    OR public.is_platform_admin()
  );

-- cars
CREATE POLICY "cars_select_scope"
  ON public.cars FOR SELECT
  USING (
    company_id IN (SELECT public.user_company_ids())
    OR public.is_platform_admin()
  );

CREATE POLICY "cars_insert_company"
  ON public.cars FOR INSERT
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

CREATE POLICY "cars_update_company"
  ON public.cars FOR UPDATE
  USING (
    company_id IN (SELECT public.user_company_ids())
    OR public.is_platform_admin()
  );

CREATE POLICY "cars_delete_company"
  ON public.cars FOR DELETE
  USING (company_id IN (SELECT public.user_company_ids()));

CREATE POLICY "cars_select_public_approved_company"
  ON public.cars FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = cars.company_id
        AND c.status = 'approved'
    )
  );

-- abuse_rate_events: admin SELECT only; inserts via service role
CREATE POLICY abuse_rate_events_select_admin
  ON public.abuse_rate_events
  FOR SELECT
  USING (public.is_platform_admin());

-- analytics: admin SELECT only; inserts via service role
CREATE POLICY company_analytics_events_select_admin
  ON public.company_analytics_events
  FOR SELECT
  USING (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 5) Grants (match typical Supabase public-schema defaults, then tighten analytics)
-- ---------------------------------------------------------------------------

GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.companies TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.company_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.booking_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cars TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.abuse_rate_events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.company_analytics_events TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE public.abuse_rate_events_id_seq TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_company_ids() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_abuse_rate_events(integer) TO service_role;

REVOKE ALL ON TABLE public.company_analytics_events FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Storage: public company-logos bucket + RLS on storage.objects
--    Object path: {company_id}/logo.jpg
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

CREATE POLICY "company_logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

CREATE POLICY "company_logos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND split_part(name, '/', 1) IN (
      SELECT c.id::text FROM public.companies c WHERE c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "company_logos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND split_part(name, '/', 1) IN (
      SELECT c.id::text FROM public.companies c WHERE c.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "company_logos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND split_part(name, '/', 1) IN (
      SELECT c.id::text FROM public.companies c WHERE c.owner_user_id = auth.uid()
    )
  );

-- =============================================================================
-- MANUAL AFTER THIS SCRIPT (do not run production Auth / production emails)
-- =============================================================================
-- 1) Authentication → create a STAGING-ONLY admin user.
-- 2) Then:
--      INSERT INTO public.profiles (id, full_name, email, role)
--      VALUES ('<staging-auth-user-uuid>', 'Staging Admin', '<your-test-email>', 'platform_admin');
--    or:
--      UPDATE public.profiles SET role = 'platform_admin' WHERE email = '<your-test-email>';
-- 3) Auth URL config: staging origin only — never taxio.be.
-- 4) Storage → confirm bucket company-logos exists and is public.
-- 5) If pg_cron was not installed, optional later:
--      SELECT public.cleanup_abuse_rate_events(60);
-- =============================================================================
