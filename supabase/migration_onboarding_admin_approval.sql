-- TAXIO onboarding alignment (safe + idempotent):
-- 1) Registration creates PENDING company only (no auth user yet).
-- 2) Admin approval later creates/links owner auth user and sends credentials.
-- 3) First approved login must force password change.
--
-- This migration is intentionally safe to run multiple times.
-- It preserves existing data and only relaxes/extends structure.
--
-- After this file, run:
--   - migration_onboarding_company_trigger.sql  (locks VAT/phone for company owners)
--   - migration_company_status_suspended.sql    (if you use suspended status)

-- Ensure companies.owner_user_id is nullable (required for pending registration).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'owner_user_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.companies
      ALTER COLUMN owner_user_id DROP NOT NULL;
  END IF;
END $$;

-- Ensure profiles.first_login_required exists and defaults to false.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_login_required boolean NOT NULL DEFAULT false;

-- Helpful index for login checks / admin filtering.
CREATE INDEX IF NOT EXISTS profiles_first_login_idx
  ON public.profiles (first_login_required);
