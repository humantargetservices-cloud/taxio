-- Staging only. Android push delivery log for TAXIO Operator.
-- Safe to run more than once. Do not run against production gdiamipqrhxbmrcsnqdk.
-- Rollback: DROP TABLE IF EXISTS public.operator_push_deliveries;

CREATE TABLE IF NOT EXISTS public.operator_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL DEFAULT 'android',
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_push_tokens_token_uidx UNIQUE (expo_push_token),
  CONSTRAINT operator_push_tokens_platform_check CHECK (platform IN ('android', 'ios'))
);

ALTER TABLE public.operator_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operator_push_tokens_owner ON public.operator_push_tokens;
CREATE POLICY operator_push_tokens_owner
  ON public.operator_push_tokens
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = operator_push_tokens.company_id
        AND c.owner_user_id = auth.uid()
        AND c.status = 'approved'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_id
        AND c.owner_user_id = auth.uid()
        AND c.status = 'approved'
    )
  );

REVOKE ALL ON TABLE public.operator_push_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.operator_push_tokens TO authenticated;
GRANT ALL ON TABLE public.operator_push_tokens TO service_role;

CREATE TABLE IF NOT EXISTS public.operator_push_deliveries (
  delivery_key text PRIMARY KEY,
  company_id uuid NOT NULL,
  outbox_id uuid,
  test_key text,
  expo_push_token text NOT NULL,
  status text NOT NULL,
  expo_ticket_id text,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operator_push_deliveries_status_check CHECK (status IN ('SENT', 'RECEIPT_OK', 'FAILED', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS operator_push_deliveries_company_updated_idx
  ON public.operator_push_deliveries (company_id, updated_at DESC);

ALTER TABLE public.operator_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.operator_push_deliveries FROM anon, authenticated;
GRANT ALL ON TABLE public.operator_push_deliveries TO service_role;
