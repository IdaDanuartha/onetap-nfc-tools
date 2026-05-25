-- ============================================================
-- Migration: 010_admin_update_keychain_rls.sql
-- Description: Add RLS policy to allow admin users to update any keychain
-- ============================================================

DROP POLICY IF EXISTS "Admins can update any keychain" ON public.user_keychains;

CREATE POLICY "Admins can update any keychain" ON public.user_keychains
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
