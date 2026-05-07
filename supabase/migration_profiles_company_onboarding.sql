-- Company setup wizard: show once for newly approved owners after first password change.
-- DEFAULT true: existing profiles skip the wizard when the column is added.
-- New approvals set company_onboarding_completed = false via api/admin-approve-company.js.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_onboarding_completed boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.company_onboarding_completed IS
  'When false, company owner is redirected to /onboarding/company after login.';
