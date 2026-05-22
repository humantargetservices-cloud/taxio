-- Optional by-hour / mise à disposition service (companies + booking metadata).
-- Safe to run on existing databases (IF NOT EXISTS, defaults preserve current behavior).

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS hourly_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hourly_rate_eur numeric NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS hourly_min_hours integer NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.companies.hourly_enabled IS 'When true, public booking page offers by-hour / chauffeur hire.';
COMMENT ON COLUMN public.companies.hourly_rate_eur IS 'Reference hourly rate (EUR) shown to riders; final price is negotiated.';
COMMENT ON COLUMN public.companies.hourly_min_hours IS 'Minimum duration (hours) for by-hour bookings.';

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'standard'
    CHECK (service_type IN ('standard', 'hourly')),
  ADD COLUMN IF NOT EXISTS duration_hours numeric,
  ADD COLUMN IF NOT EXISTS hourly_rate_eur numeric,
  ADD COLUMN IF NOT EXISTS hourly_min_hours integer;

COMMENT ON COLUMN public.booking_requests.service_type IS 'standard = point-to-point; hourly = by-hour / mise à disposition.';
COMMENT ON COLUMN public.booking_requests.duration_hours IS 'Requested duration in hours (hourly service only).';
COMMENT ON COLUMN public.booking_requests.hourly_rate_eur IS 'Company reference hourly rate at time of booking.';
COMMENT ON COLUMN public.booking_requests.hourly_min_hours IS 'Company minimum hours at time of booking.';
