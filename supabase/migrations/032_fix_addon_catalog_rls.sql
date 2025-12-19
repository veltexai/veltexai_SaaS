-- ==============================================
-- Fix RLS Policies for Add-On Catalog
-- ==============================================
-- Align with project standard: use is_admin() helper function
-- This matches the pattern used in migration 020 for profiles
-- and ensures consistency across admin access controls

-- Drop the old policy that incorrectly uses JWT claim
DROP POLICY IF EXISTS admin_all_catalog ON public.additional_service_catalog;

-- Create admin policy using is_admin() helper (defined in migration 020)
-- This function checks profiles.role = 'admin' with SECURITY DEFINER
CREATE POLICY "Admins can manage add-on catalog"
ON public.additional_service_catalog
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure the public read policy exists for authenticated users
-- This allows all authenticated users to browse the catalog
DROP POLICY IF EXISTS catalog_read ON public.additional_service_catalog;
CREATE POLICY "Authenticated users can read add-on catalog"
ON public.additional_service_catalog
FOR SELECT
TO authenticated
USING (true);

-- Fix proposal_additional_services policy for consistency
DROP POLICY IF EXISTS admin_all_pas ON public.proposal_additional_services;
CREATE POLICY "Admins can manage proposal add-ons"
ON public.proposal_additional_services
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure existing owner policies remain intact
-- These allow users to manage their own proposal add-ons
-- (Already defined in migration 030, just documenting here)

-- ==============================================
-- Comments for future developers
-- ==============================================

COMMENT ON POLICY "Admins can manage add-on catalog" ON public.additional_service_catalog IS
  'Allows admin users to create, read, update, and delete add-on services in the catalog. Uses is_admin() helper from migration 020.';

COMMENT ON POLICY "Authenticated users can read add-on catalog" ON public.additional_service_catalog IS
  'Allows all authenticated users to browse the add-on catalog for proposal building. Write access is admin-only.';

COMMENT ON POLICY "Admins can manage proposal add-ons" ON public.proposal_additional_services IS
  'Allows admin users full access to all proposal add-ons. Regular users can manage their own via owner_pas_* policies.';
