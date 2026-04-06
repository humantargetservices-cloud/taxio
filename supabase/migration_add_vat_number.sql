-- Run once on existing projects that already applied schema.sql without vat_number.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vat_number text;
