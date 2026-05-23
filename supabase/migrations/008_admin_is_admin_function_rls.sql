-- ============================================================
-- Migration: 008_admin_is_admin_function_rls.sql
-- Description: Replace recursive query on users_profile with is_admin() SECURITY DEFINER function to bypass RLS recursion
-- ============================================================

-- Create SECURITY DEFINER function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users_profile
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policy using is_admin()
DROP POLICY IF EXISTS "Admins can update any profile" ON public.users_profile;

CREATE POLICY "Admins can update any profile" ON public.users_profile
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
