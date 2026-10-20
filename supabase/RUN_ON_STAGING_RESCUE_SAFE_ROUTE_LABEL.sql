-- STAGING ONLY — improve Rescue preview route labels (skip trailing country).
-- Does not change winner selection, confirm RPC, or booking logic.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.taxio_rescue_safe_address_label(p_address text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := trim(both FROM coalesce(p_address, ''));
  parts text[];
  last_idx int;
  cand text;
BEGIN
  IF s = '' THEN
    RETURN NULL;
  END IF;
  parts := regexp_split_to_array(s, '\s*,\s*');
  last_idx := array_length(parts, 1);
  IF last_idx IS NULL OR last_idx < 1 THEN
    RETURN left(s, 80);
  END IF;
  -- Walk back past bare country names (BE/FR/NL/LU/DE) so we keep city/postal.
  WHILE last_idx > 1 LOOP
    cand := lower(trim(both FROM parts[last_idx]));
    IF cand IN (
      'belgium', 'belgique', 'belgië', 'belgie',
      'france', 'netherlands', 'nederland',
      'luxembourg', 'luxemburg',
      'germany', 'deutschland', 'duitsland'
    ) THEN
      last_idx := last_idx - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN left(trim(both FROM parts[last_idx]), 120);
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_rescue_safe_address_label(text) TO authenticated, service_role;

-- Backfill collapsed country-only preview labels from booking addresses.
UPDATE public.rescue_requests rr
SET
  preview_pickup_label = public.taxio_rescue_safe_address_label(br.pickup_address),
  preview_dropoff_label = public.taxio_rescue_safe_address_label(br.dropoff_address)
FROM public.booking_requests br
WHERE rr.booking_request_id = br.id
  AND (
    lower(trim(both FROM coalesce(rr.preview_pickup_label, ''))) IN (
      'belgium', 'belgique', 'belgië', 'belgie', 'france', 'netherlands', 'nederland',
      'luxembourg', 'luxemburg', 'germany', 'deutschland', 'duitsland'
    )
    OR lower(trim(both FROM coalesce(rr.preview_dropoff_label, ''))) IN (
      'belgium', 'belgique', 'belgië', 'belgie', 'france', 'netherlands', 'nederland',
      'luxembourg', 'luxemburg', 'germany', 'deutschland', 'duitsland'
    )
  );
