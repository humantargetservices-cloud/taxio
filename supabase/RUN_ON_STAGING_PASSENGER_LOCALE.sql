-- =============================================================================
-- TAXIO STAGING ONLY — RUN_ON_STAGING_PASSENGER_LOCALE.sql
-- =============================================================================
-- Persist passenger booking UI language (en|nl|fr) for later WhatsApp template
-- language selection on production. Existing rows stay NULL (no backfill).
-- Does not change Rescue timers, Accept, or WhatsApp message body content.
-- =============================================================================

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS passenger_locale text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'booking_requests_passenger_locale_check'
  ) THEN
    ALTER TABLE public.booking_requests
      ADD CONSTRAINT booking_requests_passenger_locale_check
      CHECK (
        passenger_locale IS NULL
        OR passenger_locale IN ('en', 'nl', 'fr')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.booking_requests.passenger_locale IS
  'Passenger booking UI language (en|nl|fr). Set at draft/activate from getLocale(). Not companies.preferred_locale.';
