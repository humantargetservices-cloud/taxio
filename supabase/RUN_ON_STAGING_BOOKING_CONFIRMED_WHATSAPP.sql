-- STAGING ONLY — Company A booking-confirmed WhatsApp send-once marker
-- Required before live notifyBookingConfirmedWhatsApp sends.
--
-- Template (Meta, separate approval):
--   WHATSAPP_BOOKING_CONFIRMED_TEMPLATE_NAME=taxio_booking_confirmed_staging
--   Body {{1}} = company name, {{2}} = booking reference
--   URL button → /trip/{{1}} = passenger_trip_token

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS booking_confirmed_whatsapp_sent_at timestamptz;

COMMENT ON COLUMN public.booking_requests.booking_confirmed_whatsapp_sent_at IS
  'Send-once marker for Company A booking-confirmed WhatsApp (View trip). NULL = not sent.';

-- Verify:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'booking_requests' AND column_name = 'booking_confirmed_whatsapp_sent_at';
