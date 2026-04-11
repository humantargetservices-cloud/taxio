-- Align DB default with app default (Dutch) for new company rows.
-- Safe if column already defaults to nl.
ALTER TABLE public.companies
  ALTER COLUMN preferred_locale SET DEFAULT 'nl';
