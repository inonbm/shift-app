-- ============================================================
-- SHIFT App — Phase 13.7: Fix Deletion Foreign Key Constraints
-- ============================================================

-- 1. workout_templates: trainer_id and trainee_id
ALTER TABLE public.workout_templates DROP CONSTRAINT IF EXISTS workout_templates_trainer_id_fkey;
ALTER TABLE public.workout_templates DROP CONSTRAINT IF EXISTS workout_templates_trainee_id_fkey;
ALTER TABLE public.workout_templates 
  ADD CONSTRAINT workout_templates_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT workout_templates_trainee_id_fkey FOREIGN KEY (trainee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. foods: created_by
ALTER TABLE public.foods DROP CONSTRAINT IF EXISTS foods_created_by_fkey;
ALTER TABLE public.foods 
  ADD CONSTRAINT foods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. workout_sessions: template_id (Cascade so if template is deleted, session is deleted)
ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_template_id_fkey;
ALTER TABLE public.workout_sessions 
  ADD CONSTRAINT workout_sessions_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.workout_templates(id) ON DELETE CASCADE;

-- 4. session_sets: exercise_id (Cascade so if exercise is deleted, set is deleted)
ALTER TABLE public.session_sets DROP CONSTRAINT IF EXISTS session_sets_exercise_id_fkey;
ALTER TABLE public.session_sets 
  ADD CONSTRAINT session_sets_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.template_exercises(id) ON DELETE CASCADE;

-- 5. Redefine the existing ON DELETE CASCADE just in case they were missing or named differently
ALTER TABLE public.trainee_data DROP CONSTRAINT IF EXISTS trainee_data_id_fkey;
ALTER TABLE public.trainee_data ADD CONSTRAINT trainee_data_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.generated_meals DROP CONSTRAINT IF EXISTS generated_meals_trainee_id_fkey;
ALTER TABLE public.generated_meals ADD CONSTRAINT generated_meals_trainee_id_fkey FOREIGN KEY (trainee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_trainee_id_fkey;
ALTER TABLE public.workout_sessions ADD CONSTRAINT workout_sessions_trainee_id_fkey FOREIGN KEY (trainee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
