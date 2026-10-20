-- STAGING ONLY — passenger live trip page token
-- Minted at booking activate; used by /trip/:token (Batch 1).
-- Does not change Rescue timers, Accept, or WhatsApp inbound.

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS passenger_trip_token text;

CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_passenger_trip_token_uidx
  ON public.booking_requests (passenger_trip_token)
  WHERE passenger_trip_token IS NOT NULL;

COMMENT ON COLUMN public.booking_requests.passenger_trip_token IS
  'High-entropy opaque token for passenger /trip/:token page. Minted at activate. Not the booking UUID.';
