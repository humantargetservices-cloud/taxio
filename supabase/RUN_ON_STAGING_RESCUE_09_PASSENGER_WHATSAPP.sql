-- =============================================================================
-- STAGING ONLY — lyjicuuyrvblbsqlduqg
-- Passenger WhatsApp confirm notify — duplicate-send guard column.
-- DO NOT APPLY AUTOMATICALLY — review then run in staging SQL editor.
-- No schema wipe. Does not touch production.
-- =============================================================================

ALTER TABLE public.rescue_requests
  ADD COLUMN IF NOT EXISTS passenger_confirm_whatsapp_sent_at timestamptz;

COMMENT ON COLUMN public.rescue_requests.passenger_confirm_whatsapp_sent_at IS
  'Set when TAXIO successfully claims/sends the one passenger confirm WhatsApp after Rescue win. Prevents duplicate sends.';

-- Manual verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'rescue_requests' AND column_name = 'passenger_confirm_whatsapp_sent_at';
