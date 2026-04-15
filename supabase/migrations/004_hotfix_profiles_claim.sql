-- ============================================================
-- Hotfix: Profiles RLS — Allow Trainers to claim unclaimed trainees
-- ============================================================
-- When a Trainer creates a Trainee via the secondary auth client,
-- the DB trigger inserts a profile row with trainer_id = NULL.
-- The Trainer then needs to SELECT and UPDATE that row to set
-- trainer_id = auth.uid(). But the existing RLS policies only allow
-- access when trainer_id ALREADY equals auth.uid() — a chicken-and-egg
-- problem. These policies fix that by allowing Trainers to see and
-- claim unclaimed trainee profiles.
-- ============================================================

-- Allow Trainers to SELECT unclaimed trainee profiles (trainer_id IS NULL)
CREATE POLICY "Trainers can view unclaimed trainee profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_trainer()
    AND role = 'trainee'
    AND trainer_id IS NULL
  );

-- Allow Trainers to UPDATE unclaimed trainee profiles to set trainer_id
CREATE POLICY "Trainers can claim unclaimed trainee profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.is_trainer()
    AND role = 'trainee'
    AND trainer_id IS NULL
  )
  WITH CHECK (
    public.is_trainer()
    AND role = 'trainee'
    AND trainer_id = auth.uid()
  );
