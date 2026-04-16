-- ============================================================
-- Hotfix: Profiles RLS — Allow Trainers to delete their trainees
-- ============================================================

CREATE POLICY "Trainers can delete their trainees profiles"
  ON public.profiles FOR DELETE
  USING (public.is_trainer() AND trainer_id = auth.uid());
