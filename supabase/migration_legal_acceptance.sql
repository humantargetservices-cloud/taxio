-- TAXIO — persist legal acceptance for company registration and rider quick-booking logs.
-- Run in Supabase SQL Editor after existing migrations.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS company_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS company_terms_version text;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS rider_terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rider_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS rider_terms_version text;

COMMENT ON COLUMN public.companies.company_terms_accepted IS 'User accepted Terms of Use + Company Terms + Privacy at registration.';
COMMENT ON COLUMN public.companies.company_terms_accepted_at IS 'ISO timestamp when terms were accepted.';
COMMENT ON COLUMN public.companies.company_terms_version IS 'Version string from client (e.g. legalVersions bundle).';

COMMENT ON COLUMN public.booking_requests.rider_terms_accepted IS 'Rider accepted Terms of Use + Company Terms + Privacy before quick-book action.';
COMMENT ON COLUMN public.booking_requests.rider_terms_accepted_at IS 'ISO timestamp when rider terms were accepted.';
COMMENT ON COLUMN public.booking_requests.rider_terms_version IS 'Version string from client for rider-facing terms.';
