-- Optional hardening for duplicate registration protection.
-- This migration is SAFE: it preserves data and only creates unique indexes
-- when no duplicates exist for the normalized key.

-- Speed up backend duplicate checks.
CREATE INDEX IF NOT EXISTS companies_email_idx ON public.companies (lower(trim(email)));
CREATE INDEX IF NOT EXISTS companies_vat_norm_idx
  ON public.companies ((regexp_replace(upper(coalesce(vat_number, '')), '[^A-Z0-9]', '', 'g')));
CREATE INDEX IF NOT EXISTS companies_phone_digits_idx
  ON public.companies ((regexp_replace(coalesce(phone, ''), '\\D', '', 'g')));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT lower(trim(email)) AS k
      FROM public.companies
      WHERE coalesce(trim(email), '') <> ''
      GROUP BY 1
      HAVING count(*) > 1
    ) t
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS companies_email_unique_norm_idx
      ON public.companies (lower(trim(email)));
  ELSE
    RAISE NOTICE 'Skipped unique email index: duplicate company emails exist.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT regexp_replace(upper(coalesce(vat_number, '')), '[^A-Z0-9]', '', 'g') AS k
      FROM public.companies
      WHERE coalesce(vat_number, '') <> ''
      GROUP BY 1
      HAVING count(*) > 1
    ) t
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS companies_vat_unique_norm_idx
      ON public.companies ((regexp_replace(upper(coalesce(vat_number, '')), '[^A-Z0-9]', '', 'g')))
      WHERE coalesce(vat_number, '') <> '';
  ELSE
    RAISE NOTICE 'Skipped unique VAT index: duplicate VAT values exist.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT regexp_replace(coalesce(phone, ''), '\\D', '', 'g') AS k
      FROM public.companies
      WHERE coalesce(phone, '') <> ''
      GROUP BY 1
      HAVING count(*) > 1
    ) t
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS companies_phone_unique_digits_idx
      ON public.companies ((regexp_replace(coalesce(phone, ''), '\\D', '', 'g')))
      WHERE coalesce(phone, '') <> '';
  ELSE
    RAISE NOTICE 'Skipped unique phone index: duplicate phone values exist.';
  END IF;
END $$;
