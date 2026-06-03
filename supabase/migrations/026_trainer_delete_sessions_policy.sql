-- ============================================================
-- Migration 026: Allow trainers to delete their trainees' workout sessions
-- 
-- Bug: workout_sessions and session_sets had DELETE policies only for
-- trainees (trainee_id = auth.uid()). Trainers had no DELETE policy,
-- so RLS silently blocked all trainer-side deletions.
-- ============================================================

-- Allow trainers to delete workout sessions belonging to their trainees
CREATE POLICY "Trainers can delete their trainees sessions"
  ON public.workout_sessions FOR DELETE
  USING (public.manages_trainee(trainee_id));

-- Allow trainers to delete session sets that belong to their trainees' sessions
CREATE POLICY "Trainers can delete their trainees session sets"
  ON public.session_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_id
        AND public.manages_trainee(s.trainee_id)
    )
  );
