-- Fix company update guard for onboarding + admin approval:
-- 1) Service-role updates (API) must not be overwritten (approval sets status / owner).
-- 2) Company owners cannot change VAT or phone after registration (locked at DB level).

CREATE OR REPLACE FUNCTION public.taxio_companies_update_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role text;
  setting_role text;
BEGIN
  jwt_role := nullif(trim(coalesce(auth.jwt() ->> 'role', '')), '');
  BEGIN
    setting_role := nullif(trim(coalesce(current_setting('request.jwt.claim.role', true), '')), '');
  EXCEPTION
    WHEN OTHERS THEN
      setting_role := NULL;
  END;

  IF jwt_role = 'service_role'
     OR setting_role = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  NEW.status := OLD.status;
  NEW.slug := OLD.slug;
  NEW.owner_user_id := OLD.owner_user_id;
  NEW.approved_at := OLD.approved_at;
  NEW.subscription_plan := OLD.subscription_plan;
  NEW.created_at := OLD.created_at;
  NEW.vat_number := OLD.vat_number;
  NEW.phone := OLD.phone;
  RETURN NEW;
END;
$$;
