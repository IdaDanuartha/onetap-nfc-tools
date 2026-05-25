-- ============================================================
-- Migration: 009_admin_delete_keychain_rls.sql
-- Description: Add RLS policy to allow admin users to delete any keychain
-- ============================================================

DROP POLICY IF EXISTS "Admins can delete any keychain" ON public.user_keychains;

CREATE POLICY "Admins can delete any keychain" ON public.user_keychains
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
