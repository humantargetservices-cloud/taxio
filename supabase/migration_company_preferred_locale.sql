-- Preferred UI / communication language chosen at registration (en | fr | nl).
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'nl';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_preferred_locale_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_preferred_locale_check
  CHECK (preferred_locale IN ('en', 'fr', 'nl'));

COMMENT ON COLUMN public.companies.preferred_locale IS 'Language used at registration; drives company-facing emails and default dashboard copy.';
