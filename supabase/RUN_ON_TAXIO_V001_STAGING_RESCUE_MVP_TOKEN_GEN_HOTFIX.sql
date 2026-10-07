-- =============================================================================
-- RUN ON: taxio-v001-staging ONLY (project lyjicuuyrvblbsqlduqg)
-- DO NOT run on production (taxio.be)
-- =============================================================================
-- Hotfix: accept_rescue_request failed with:
--   function gen_random_bytes(integer) does not exist
-- Cause: pgcrypto lives in extensions schema; token helper lacked search_path.
-- Uses UUID-based token (no extension dependency) as the reliable default.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.taxio_rescue_new_confirm_token()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public, extensions, pg_catalog
AS $$
  -- 64 hex chars from two UUIDs (unguessable; no pgcrypto required)
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_new_confirm_token() TO authenticated, service_role;
