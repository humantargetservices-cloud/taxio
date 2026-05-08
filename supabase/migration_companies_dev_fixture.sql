-- Optional: mark rows as dev/test fixtures for admin bulk cleanup (safe with server-side guards).
-- Eligible for /api/admin-dev-cleanup-test-companies when dev_fixture = true OR slug LIKE 'test%'.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS dev_fixture boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companies.dev_fixture IS
  'When true, company may be removed by platform_admin via dev cleanup API (TAXIO_DEV_CLEANUP_ENABLED only).';

CREATE INDEX IF NOT EXISTS companies_dev_fixture_idx
  ON public.companies (dev_fixture)
  WHERE dev_fixture = true;
