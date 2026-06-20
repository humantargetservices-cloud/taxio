-- TAXIO company-level anonymous analytics (MVP, no PII)
-- Inserts via service-role API only; platform admins can SELECT.

CREATE TABLE IF NOT EXISTS public.company_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  source text NULL,
  path text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_analytics_events_event_type_check CHECK (
    event_type IN (
      'page_visit',
      'qr_scan',
      'share_visit',
      'whatsapp_click',
      'call_click',
      'email_click'
    )
  )
);

CREATE INDEX IF NOT EXISTS company_analytics_events_company_id_idx
  ON public.company_analytics_events (company_id);

CREATE INDEX IF NOT EXISTS company_analytics_events_event_type_idx
  ON public.company_analytics_events (event_type);

CREATE INDEX IF NOT EXISTS company_analytics_events_created_at_idx
  ON public.company_analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS company_analytics_events_company_created_idx
  ON public.company_analytics_events (company_id, created_at DESC);

COMMENT ON TABLE public.company_analytics_events IS
  'Anonymous company-level booking funnel events (no customer PII).';

ALTER TABLE public.company_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_analytics_events_select_admin ON public.company_analytics_events;
CREATE POLICY company_analytics_events_select_admin
  ON public.company_analytics_events
  FOR SELECT
  USING (public.is_platform_admin());

-- No INSERT/UPDATE/DELETE policies for authenticated roles — API uses service role.
REVOKE ALL ON TABLE public.company_analytics_events FROM anon, authenticated;
