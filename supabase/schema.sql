-- TAXIO — initial schema + RLS (run in Supabase SQL Editor)
-- Requires: extensions pgcrypto (gen_random_uuid) — enabled by default on Supabase
--
-- ---------------------------------------------------------------------------
-- Bootstrap platform admin (after user exists in Authentication)
-- ---------------------------------------------------------------------------
-- 1) Create the user in Supabase Dashboard → Authentication (or sign up elsewhere).
-- 2) If no profile row exists yet:
--    INSERT INTO public.profiles (id, full_name, email, role)
--    VALUES ('<uuid-from-auth-users>', 'Admin', 'admin@yourdomain.com', 'platform_admin');
-- 3) Or promote an existing profile:
--    UPDATE public.profiles SET role = 'platform_admin' WHERE email = 'admin@yourdomain.com';
-- RLS for approvals uses public.is_platform_admin(), which reads profiles.role only.

-- ---------------------------------------------------------------------------
-- Types (as CHECK constraints for simple migrations)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Tables
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
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  vat_number text,
  email text NOT NULL,
  phone text,
  city text,
  country text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  owner_user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX companies_slug_idx ON public.companies (slug);
CREATE INDEX companies_status_idx ON public.companies (status);
CREATE INDEX companies_owner_idx ON public.companies (owner_user_id);

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'driver'
    CHECK (role IN ('owner', 'admin', 'dispatcher', 'driver')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE INDEX company_members_user_idx ON public.company_members (user_id);
CREATE INDEX company_members_company_idx ON public.company_members (company_id);

CREATE TABLE public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  ride_datetime timestamptz NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX booking_requests_company_idx ON public.booking_requests (company_id);
CREATE INDEX booking_requests_created_idx ON public.booking_requests (created_at DESC);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER avoids RLS recursion on profiles)
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

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

-- ---------------------------------------------------------------------------
-- RLS summary (for operators)
-- ---------------------------------------------------------------------------
-- • profiles: each user manages their row; platform_admin can read/update all.
-- • companies: everyone can read approved rows (public booking + directory).
--   Owners/members see their rows regardless of status; admins see/update all.
--   New companies are insert-only for the authenticated creator as pending.
-- • company_members: visible to members of that company + admins; first owner
--   row is inserted by the registering user while owner_user_id matches.
-- • booking_requests: inserts allowed when company_id references an APPROVED
--   company (anonymous + logged-in customers). Select/update limited to
--   members of that company and platform admins.
--
-- Fresh database: after this file, run in order:
--   supabase/migration_add_vat_number.sql (if not merged)
--   supabase/migration_structure_v2.sql
--   supabase/migration_onboarding_admin_approval.sql
--   supabase/migration_onboarding_company_trigger.sql
--   supabase/migration_fix_companies_guard_service_role_bypass.sql (if approval updates are reverted)
--   supabase/migration_company_status_suspended.sql
--   supabase/migration_cars_select_public_booking.sql
--   supabase/migration_registration_uniqueness_hardening.sql (optional but recommended)
