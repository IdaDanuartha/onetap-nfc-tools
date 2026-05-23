-- ============================================================
-- Migration: 007_admin_update_profile_rls.sql
-- Description: Create RLS policy to allow admin users to update any profile (e.g. plan/expiry activation)
-- ============================================================

-- Create RLS policy for admins to update profiles
CREATE POLICY "Admins can update any profile" ON public.users_profile
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.users_profile WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users_profile WHERE id = auth.uid()) = 'admin'
  );
