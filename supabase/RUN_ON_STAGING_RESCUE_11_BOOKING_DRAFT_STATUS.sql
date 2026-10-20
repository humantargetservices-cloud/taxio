-- =============================================================================
-- STAGING ONLY — booking_requests status: allow draft (completion UX)
-- Project: lyjicuuyrvblbsqlduqg (staging.taxio.be)
-- DO NOT run on production / taxio.be
--
-- Inspected live constraint (probe 2026-10-10):
--   booking_requests_status_check allowed:
--     'new', 'reviewed', 'accepted', 'rejected'
--   'draft' was REJECTED → completion BOOK draft insert failed.
--
-- This migration ADDS 'draft' and PRESERVES every existing allowed value.
-- =============================================================================

ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_status_check
  CHECK (status IN ('draft', 'new', 'reviewed', 'accepted', 'rejected'));

COMMENT ON CONSTRAINT booking_requests_status_check ON public.booking_requests IS
  'draft = passenger completion prep (no 25s / no NEW TRIP); new = live Company A request.';

-- Draft rows must not carry a decision deadline (Company A timer starts on activate → new).
-- Defensive: clear any accidental deadline on draft (should already be NULL).
UPDATE public.booking_requests
SET decision_deadline_at = NULL
WHERE status = 'draft'
  AND decision_deadline_at IS NOT NULL;

-- Verify:
--   SELECT pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conname = 'booking_requests_status_check';
