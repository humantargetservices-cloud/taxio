-- TAXIO persistent abuse/rate-limit tracking (Cloudflare-independent)
-- Safe migration: only IF NOT EXISTS operations.

CREATE TABLE IF NOT EXISTS public.abuse_rate_events (
  id bigserial PRIMARY KEY,
  action text NOT NULL,
  ip_address text,
  company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  contact_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS abuse_rate_events_action_created_idx
  ON public.abuse_rate_events (action, created_at DESC);

CREATE INDEX IF NOT EXISTS abuse_rate_events_action_ip_created_idx
  ON public.abuse_rate_events (action, ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS abuse_rate_events_action_company_created_idx
  ON public.abuse_rate_events (action, company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS abuse_rate_events_action_contact_created_idx
  ON public.abuse_rate_events (action, contact_key, created_at DESC);
