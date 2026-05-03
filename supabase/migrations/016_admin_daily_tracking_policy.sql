-- ============================================================
-- SHIFT App — Hotfix: Admin full-access policy for daily_tracking
-- ============================================================
-- The daily_tracking table was created in migration 013, AFTER the
-- global admin override policies in migration 006. As a result,
-- admins only had SELECT access (from the explicit SELECT policy
-- in 013). This migration adds the missing FOR ALL policy so admins
-- have consistent full CRUD access, matching every other table.
-- ============================================================

-- Drop the narrower admin SELECT policy and replace with full access
DROP POLICY IF EXISTS "Admins can view all tracking" ON public.daily_tracking;

CREATE POLICY "Admins have full access to daily_tracking"
  ON public.daily_tracking FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
