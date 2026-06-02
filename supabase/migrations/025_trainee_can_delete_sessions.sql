-- ============================================================
-- Migration 025: Add can_delete_sessions flag to trainee_data
-- Allows trainers to grant individual trainees permission to
-- delete their own workout session logs via the UI.
-- Note: RLS already permits trainees to DELETE their own sessions
-- (policy "Trainees can delete their own sessions"), so no policy
-- changes are required — this column is purely a UI-level gate.
-- ============================================================

ALTER TABLE public.trainee_data
  ADD COLUMN IF NOT EXISTS can_delete_sessions BOOLEAN NOT NULL DEFAULT false;
