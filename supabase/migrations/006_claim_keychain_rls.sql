-- ============================================================
-- Migration: 006_claim_keychain_rls.sql
-- Description: Fix RLS policy on user_keychains to allow users to claim unclaimed keychains (user_id is NULL)
-- ============================================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can manage their own keychains" ON public.user_keychains;

-- Create the delete policy
CREATE POLICY "Users can delete their own keychains" ON public.user_keychains
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create the update policy that allows claiming keychains where user_id is NULL
CREATE POLICY "Users can update their own keychains and claim unclaimed ones" ON public.user_keychains
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);
