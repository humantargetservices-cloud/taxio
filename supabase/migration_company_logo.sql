-- TAXIO: company logo URL + public storage bucket for booking page / dashboard
-- Run in Supabase SQL Editor after existing migrations.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.companies.logo_url IS 'Public HTTPS URL of company logo (Supabase Storage); shown on booking page and dashboard.';

-- ---------------------------------------------------------------------------
-- Storage: public bucket + policies (object path = {company_id}/logo.jpg)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Anonymous + authenticated reads (public booking page)
DROP POLICY IF EXISTS "company_logos_public_read" ON storage.objects;
CREATE POLICY "company_logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

-- Company owner may write only inside their company id folder
DROP POLICY IF EXISTS "company_logos_owner_insert" ON storage.objects;
CREATE POLICY "company_logos_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND split_part(name, '/', 1) IN (
      SELECT c.id::text FROM public.companies c WHERE c.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "company_logos_owner_update" ON storage.objects;
CREATE POLICY "company_logos_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND split_part(name, '/', 1) IN (
      SELECT c.id::text FROM public.companies c WHERE c.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "company_logos_owner_delete" ON storage.objects;
CREATE POLICY "company_logos_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND split_part(name, '/', 1) IN (
      SELECT c.id::text FROM public.companies c WHERE c.owner_user_id = auth.uid()
    )
  );
