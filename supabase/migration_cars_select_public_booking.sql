-- Allow anonymous reads of cars for approved companies (public booking page car-type display).
-- If this policy is missing, booking still falls back safely to default/price-based car type behavior.
CREATE POLICY "cars_select_public_approved_company"
  ON public.cars FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = cars.company_id
        AND c.status = 'approved'
    )
  );

