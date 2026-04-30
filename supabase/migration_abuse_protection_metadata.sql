-- TAXIO abuse-protection metadata for public forms
-- Run in Supabase SQL editor.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS turnstile_passed boolean,
  ADD COLUMN IF NOT EXISTS turnstile_error text;

ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS turnstile_passed boolean,
  ADD COLUMN IF NOT EXISTS turnstile_error text;

CREATE INDEX IF NOT EXISTS companies_ip_created_idx
  ON public.companies (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_requests_ip_created_idx
  ON public.booking_requests (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_requests_contact_created_idx
  ON public.booking_requests (customer_phone, customer_email, created_at DESC);
