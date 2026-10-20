-- =============================================================================
-- STAGING ONLY — lyjicuuyrvblbsqlduqg
-- Booking reference + Company WhatsApp inbound mapping / capture metadata.
-- DO NOT APPLY AUTOMATICALLY — review then run in staging SQL editor.
-- No schema wipe. No company deletion. Production untouched.
-- =============================================================================

-- 1) Human-readable booking reference (e.g. TX-7K3P9Q)
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS booking_reference text;

CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_booking_reference_uidx
  ON public.booking_requests (booking_reference)
  WHERE booking_reference IS NOT NULL;

COMMENT ON COLUMN public.booking_requests.booking_reference IS
  'Passenger-facing unique booking reference (TX-XXXXXX) included in Company A WhatsApp deep-link message.';

-- 2) Minimal capture metadata (contact still stored in customer_phone)
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS customer_phone_captured_at timestamptz;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS customer_phone_source text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booking_requests_customer_phone_source_check'
  ) THEN
    ALTER TABLE public.booking_requests
      ADD CONSTRAINT booking_requests_customer_phone_source_check
      CHECK (
        customer_phone_source IS NULL
        OR customer_phone_source IN ('whatsapp', 'manual', 'form')
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.booking_requests.customer_phone_captured_at IS
  'When passenger WhatsApp contact was captured from inbound Meta webhook.';
COMMENT ON COLUMN public.booking_requests.customer_phone_source IS
  'Source of customer_phone capture (whatsapp = Meta inbound).';

-- 3) Meta phone_number_id → TAXIO company (manual staging mapping for MVP)
CREATE TABLE IF NOT EXISTS public.company_whatsapp_waba (
  phone_number_id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  display_phone_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS company_whatsapp_waba_company_uidx
  ON public.company_whatsapp_waba (company_id);

COMMENT ON TABLE public.company_whatsapp_waba IS
  'Maps Meta WhatsApp Cloud phone_number_id to a TAXIO company. Manual staging rows for MVP; no company UI yet.';

ALTER TABLE public.company_whatsapp_waba ENABLE ROW LEVEL SECURITY;

-- Service role / backend only for MVP (no public policies)

-- Example staging mapping (edit phone_number_id after Meta app setup):
-- INSERT INTO public.company_whatsapp_waba (phone_number_id, company_id, display_phone_number)
-- SELECT 'YOUR_META_PHONE_NUMBER_ID', id, '3247xxxxxxx'
-- FROM public.companies WHERE name ILIKE '%StagingT%' LIMIT 1
-- ON CONFLICT (phone_number_id) DO UPDATE
--   SET company_id = EXCLUDED.company_id, updated_at = now();

-- Manual verify:
--   SELECT booking_reference FROM booking_requests WHERE booking_reference IS NOT NULL LIMIT 5;
--   SELECT * FROM company_whatsapp_waba;
