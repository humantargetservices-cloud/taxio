-- Staging only. Native TAXIO Operator device tokens.
-- Rollback: DROP TABLE IF EXISTS public.operator_push_tokens;
-- Do not run against the production project gdiamipqrhxbmrcsnqdk.

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

CREATE INDEX IF NOT EXISTS operator_push_tokens_company_active_idx
  ON public.operator_push_tokens (company_id)
  WHERE revoked_at IS NULL;

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
