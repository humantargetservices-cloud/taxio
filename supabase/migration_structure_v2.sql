-- TAXIO — structure v2: company profile fields, cars fleet, booking car_type, owner-safe company updates
-- Run in Supabase SQL Editor after base schema.sql (or merge into fresh installs).

-- ---------------------------------------------------------------------------
-- Companies: branding & billing fields (admin sets subscription_plan)
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS slogan text,
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'busy', 'offline')),
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'basic'
    CHECK (subscription_plan IN ('basic', 'premium')),
  ADD COLUMN IF NOT EXISTS pricing jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Booking: quick-book flow (WhatsApp) — optional passenger / time
-- ---------------------------------------------------------------------------
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS car_type text;

ALTER TABLE public.booking_requests
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_phone DROP NOT NULL,
  ALTER COLUMN ride_datetime DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- Fleet vehicles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  model text NOT NULL,
  license_plate text NOT NULL,
  year int,
  car_type text NOT NULL DEFAULT 'Standard',
  driver_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cars_company_idx ON public.cars (company_id);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

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

-- ---------------------------------------------------------------------------
-- Company owners may update profile fields; trigger locks admin-only columns
-- ---------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_taxio_companies_guard ON public.companies;
CREATE TRIGGER trg_taxio_companies_guard
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE PROCEDURE public.taxio_companies_update_guard();

DROP POLICY IF EXISTS "companies_update_owner_member" ON public.companies;
CREATE POLICY "companies_update_owner_member"
  ON public.companies FOR UPDATE
  USING (owner_user_id = auth.uid());
