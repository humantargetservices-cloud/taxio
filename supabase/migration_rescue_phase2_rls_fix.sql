-- TAXIO Rescue Phase 2 — fix RLS infinite recursion
-- TARGET: taxio-v001-staging ONLY (lyjicuuyrvblbsqlduqg)
--
-- Phase 1 policies cross-referenced rescue_requests ↔ rescue_opportunities,
-- which recurses under authenticated JWT (service_role bypass hid the bug).
-- Fix: SECURITY DEFINER helpers that read without RLS re-entry.

CREATE OR REPLACE FUNCTION public.taxio_user_has_rescue_opportunity(p_rescue_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rescue_opportunities o
    WHERE o.rescue_request_id = p_rescue_request_id
      AND o.company_id IN (SELECT public.user_company_ids())
  );
$$;

CREATE OR REPLACE FUNCTION public.taxio_user_is_rescue_origin_or_winner(p_rescue_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rescue_requests r
    WHERE r.id = p_rescue_request_id
      AND (
        r.original_company_id IN (SELECT public.user_company_ids())
        OR r.accepted_by_company_id IN (SELECT public.user_company_ids())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.taxio_user_has_rescue_opportunity(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.taxio_user_is_rescue_origin_or_winner(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS rescue_requests_select_scope ON public.rescue_requests;
CREATE POLICY rescue_requests_select_scope
  ON public.rescue_requests
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR original_company_id IN (SELECT public.user_company_ids())
    OR accepted_by_company_id IN (SELECT public.user_company_ids())
    OR public.taxio_user_has_rescue_opportunity(id)
  );

DROP POLICY IF EXISTS rescue_opportunities_select_scope ON public.rescue_opportunities;
CREATE POLICY rescue_opportunities_select_scope
  ON public.rescue_opportunities
  FOR SELECT
  TO authenticated
  USING (
    public.is_platform_admin()
    OR company_id IN (SELECT public.user_company_ids())
    OR public.taxio_user_is_rescue_origin_or_winner(rescue_request_id)
  );
