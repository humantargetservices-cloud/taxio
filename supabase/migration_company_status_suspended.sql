-- Add suspended company status without changing other onboarding behavior.
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname
    INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.companies'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status IN%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.companies DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_status_check
  CHECK (status IN ('pending', 'approved', 'suspended', 'rejected'));
