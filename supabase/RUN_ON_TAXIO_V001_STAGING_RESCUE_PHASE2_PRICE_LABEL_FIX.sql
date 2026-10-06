-- TAXIO V001 staging ONLY — cosmetic fix for preview price label (€35. → €35
-- Does not change booking_requests.estimated_price_eur numeric values.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.taxio_format_trip_price_label(
  p_amount numeric,
  p_currency text DEFAULT 'EUR'
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cur text := upper(nullif(trim(coalesce(p_currency, 'EUR')), ''));
  amt text;
BEGIN
  IF p_amount IS NULL THEN
    RETURN NULL;
  END IF;
  amt := trim(both from to_char(p_amount, 'FM999999990.99'));
  IF right(amt, 1) = '.' THEN
    amt := left(amt, length(amt) - 1);
  END IF;
  IF cur IS NULL OR cur = 'EUR' THEN
    RETURN '€' || amt;
  END IF;
  RETURN amt || ' ' || cur;
END;
$$;

GRANT EXECUTE ON FUNCTION public.taxio_format_trip_price_label(numeric, text) TO authenticated, service_role;
