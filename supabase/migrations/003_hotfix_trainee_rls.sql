-- ============================================================
-- Hotfix: Trainee Data RLS — Allow Trainer UPSERT
-- ============================================================
-- The existing INSERT policy uses manages_trainee(id), which relies on
-- profiles.trainer_id being set. In edge cases where the profile trigger
-- and trainer_id assignment haven't fully propagated, the INSERT can fail.
--
-- This migration adds a fallback policy that also allows trainers to insert
-- trainee_data when they are authenticated trainers and the trainee profile
-- exists with their trainer_id set (double-checking via a direct join).
-- ============================================================

-- Drop and recreate the INSERT policy with a more resilient check
DROP POLICY IF EXISTS "Trainers can insert trainee data" ON public.trainee_data;

CREATE POLICY "Trainers can insert trainee data"
  ON public.trainee_data FOR INSERT
  WITH CHECK (
    public.is_trainer()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = trainee_data.id
        AND profiles.trainer_id = auth.uid()
    )
  );

-- Also ensure UPSERT (INSERT ON CONFLICT → UPDATE) works:
-- The UPDATE policy already uses manages_trainee() which should be fine
-- since by the time an UPSERT hits the UPDATE path, the row already exists.
