-- ============================================================
-- SHIFT App — Phase 13: Admin Infrastructure
-- ============================================================

-- 1. Update the role constraint in profiles table to allow 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('trainer', 'trainee', 'admin'));

-- 2. Create the admin helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Universal Admin Override Policies
-- By creating an overriding ALL policy for admins, we grant them full read/write
-- access to all rows across all major tables without modifying the complex
-- trainer/trainee policies established previously.

-- Profiles
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trainee Data
CREATE POLICY "Admins have full access to trainee_data"
  ON public.trainee_data FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Foods
CREATE POLICY "Admins have full access to foods"
  ON public.foods FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Generated Meals
CREATE POLICY "Admins have full access to generated_meals"
  ON public.generated_meals FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Workout Templates
CREATE POLICY "Admins have full access to workout_templates"
  ON public.workout_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Template Exercises
CREATE POLICY "Admins have full access to template_exercises"
  ON public.template_exercises FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Workout Sessions
CREATE POLICY "Admins have full access to workout_sessions"
  ON public.workout_sessions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Session Sets
CREATE POLICY "Admins have full access to session_sets"
  ON public.session_sets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Initial Admin Seed (Optional)
-- You can manually convert a user to admin by running:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your_email@example.com';
