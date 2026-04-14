-- ============================================================
-- SHIFT App — Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if the current authenticated user is a trainer
CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'trainer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current authenticated user (trainer) manages a specific trainee
CREATE OR REPLACE FUNCTION public.manages_trainee(trainee_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = trainee_uuid AND trainer_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- TABLE: profiles
-- Extends Supabase Auth with application-level user data.
-- ============================================================
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'trainee' CHECK (role IN ('trainer', 'trainee')),
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-create profile row on new auth user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'trainee'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies: profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Trainers can view their trainees profiles"
  ON public.profiles FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Trainers can update their trainees profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_trainer() AND trainer_id = auth.uid())
  WITH CHECK (public.is_trainer() AND trainer_id = auth.uid());

CREATE POLICY "Trainers can insert trainee profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_trainer());

-- ============================================================
-- TABLE: trainee_data
-- Physical measurements and calculated nutritional targets.
-- ============================================================
CREATE TABLE public.trainee_data (
  id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  gender          TEXT CHECK (gender IN ('male', 'female')),
  age             INT CHECK (age > 0 AND age < 120),
  weight_kg       DECIMAL CHECK (weight_kg > 0),
  height_cm       DECIMAL CHECK (height_cm > 0),
  activity_level  TEXT CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal            TEXT CHECK (goal IN ('cut', 'bulk', 'maintenance')),
  bmr             DECIMAL,
  tdee            DECIMAL,
  goal_calories   DECIMAL,
  protein_grams   DECIMAL,
  carbs_grams     DECIMAL,
  fat_grams       DECIMAL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trainee_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies: trainee_data
CREATE POLICY "Trainees can view their own data"
  ON public.trainee_data FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Trainers can view their trainees data"
  ON public.trainee_data FOR SELECT
  USING (public.manages_trainee(id));

CREATE POLICY "Trainers can insert trainee data"
  ON public.trainee_data FOR INSERT
  WITH CHECK (public.manages_trainee(id));

CREATE POLICY "Trainers can update their trainees data"
  ON public.trainee_data FOR UPDATE
  USING (public.manages_trainee(id))
  WITH CHECK (public.manages_trainee(id));

-- ============================================================
-- TABLE: foods
-- Nutritional database managed by trainers.
-- ============================================================
CREATE TABLE public.foods (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  primary_category  TEXT NOT NULL CHECK (primary_category IN ('protein', 'carb', 'fat')),
  calories_per_100g DECIMAL NOT NULL CHECK (calories_per_100g >= 0),
  protein_per_100g  DECIMAL NOT NULL CHECK (protein_per_100g >= 0),
  carbs_per_100g    DECIMAL NOT NULL CHECK (carbs_per_100g >= 0),
  fats_per_100g     DECIMAL NOT NULL CHECK (fats_per_100g >= 0),
  created_by        UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

-- RLS Policies: foods
CREATE POLICY "Anyone authenticated can view foods"
  ON public.foods FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Trainers can insert foods"
  ON public.foods FOR INSERT
  WITH CHECK (public.is_trainer());

CREATE POLICY "Trainers can update their own foods"
  ON public.foods FOR UPDATE
  USING (public.is_trainer() AND created_by = auth.uid())
  WITH CHECK (public.is_trainer() AND created_by = auth.uid());

CREATE POLICY "Trainers can delete their own foods"
  ON public.foods FOR DELETE
  USING (public.is_trainer() AND created_by = auth.uid());

-- ============================================================
-- TABLE: generated_meals
-- Cached diet plans generated by the algorithm.
-- ============================================================
CREATE TABLE public.generated_meals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_index      INT NOT NULL CHECK (meal_index >= 0 AND meal_index <= 3),
  meal_name       TEXT NOT NULL,
  protein_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  carb_options    JSONB NOT NULL DEFAULT '[]'::jsonb,
  fat_options     JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_calories DECIMAL NOT NULL,
  target_protein  DECIMAL NOT NULL,
  target_carbs    DECIMAL NOT NULL,
  target_fat      DECIMAL NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_meals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: generated_meals
CREATE POLICY "Trainees can view their own meals"
  ON public.generated_meals FOR SELECT
  USING (trainee_id = auth.uid());

CREATE POLICY "Trainers can view their trainees meals"
  ON public.generated_meals FOR SELECT
  USING (public.manages_trainee(trainee_id));

CREATE POLICY "Trainers can insert meals for their trainees"
  ON public.generated_meals FOR INSERT
  WITH CHECK (public.manages_trainee(trainee_id));

CREATE POLICY "Trainers can update their trainees meals"
  ON public.generated_meals FOR UPDATE
  USING (public.manages_trainee(trainee_id))
  WITH CHECK (public.manages_trainee(trainee_id));

CREATE POLICY "Trainers can delete their trainees meals"
  ON public.generated_meals FOR DELETE
  USING (public.manages_trainee(trainee_id));

-- ============================================================
-- TABLE: workout_templates
-- Workout plans assigned by trainers to trainees.
-- ============================================================
CREATE TABLE public.workout_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  trainer_id  UUID NOT NULL REFERENCES public.profiles(id),
  trainee_id  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workout_templates
CREATE POLICY "Trainers can view their own templates"
  ON public.workout_templates FOR SELECT
  USING (trainer_id = auth.uid());

CREATE POLICY "Trainees can view templates assigned to them"
  ON public.workout_templates FOR SELECT
  USING (trainee_id = auth.uid());

CREATE POLICY "Trainers can insert templates"
  ON public.workout_templates FOR INSERT
  WITH CHECK (public.is_trainer() AND trainer_id = auth.uid());

CREATE POLICY "Trainers can update their own templates"
  ON public.workout_templates FOR UPDATE
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete their own templates"
  ON public.workout_templates FOR DELETE
  USING (trainer_id = auth.uid());

-- ============================================================
-- TABLE: template_exercises
-- Individual exercises within a workout template.
-- ============================================================
CREATE TABLE public.template_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  target_sets   INT NOT NULL CHECK (target_sets > 0),
  target_reps   INT NOT NULL CHECK (target_reps > 0),
  order_index   INT NOT NULL
);

ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies: template_exercises (via template ownership)
CREATE POLICY "Users can view exercises of accessible templates"
  ON public.template_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id
        AND (t.trainer_id = auth.uid() OR t.trainee_id = auth.uid())
    )
  );

CREATE POLICY "Trainers can insert exercises to their templates"
  ON public.template_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update exercises in their templates"
  ON public.template_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id AND t.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id AND t.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete exercises from their templates"
  ON public.template_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates t
      WHERE t.id = template_id AND t.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: workout_sessions
-- Trainee-logged workout sessions.
-- ============================================================
CREATE TABLE public.workout_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id  UUID NOT NULL REFERENCES public.workout_templates(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes        TEXT
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workout_sessions
CREATE POLICY "Trainees can view their own sessions"
  ON public.workout_sessions FOR SELECT
  USING (trainee_id = auth.uid());

CREATE POLICY "Trainers can view their trainees sessions"
  ON public.workout_sessions FOR SELECT
  USING (public.manages_trainee(trainee_id));

CREATE POLICY "Trainees can insert their own sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (trainee_id = auth.uid());

CREATE POLICY "Trainees can update their own sessions"
  ON public.workout_sessions FOR UPDATE
  USING (trainee_id = auth.uid())
  WITH CHECK (trainee_id = auth.uid());

CREATE POLICY "Trainees can delete their own sessions"
  ON public.workout_sessions FOR DELETE
  USING (trainee_id = auth.uid());

-- ============================================================
-- TABLE: session_sets
-- Individual sets logged within a workout session.
-- ============================================================
CREATE TABLE public.session_sets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.template_exercises(id),
  set_number  INT NOT NULL CHECK (set_number > 0),
  reps_done   INT NOT NULL CHECK (reps_done >= 0),
  weight_kg   DECIMAL NOT NULL CHECK (weight_kg >= 0)
);

ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: session_sets (via session ownership)
CREATE POLICY "Trainees can view their own session sets"
  ON public.session_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_id AND s.trainee_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can view their trainees session sets"
  ON public.session_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_id AND public.manages_trainee(s.trainee_id)
    )
  );

CREATE POLICY "Trainees can insert their own session sets"
  ON public.session_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_id AND s.trainee_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can update their own session sets"
  ON public.session_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_id AND s.trainee_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_id AND s.trainee_id = auth.uid()
    )
  );

CREATE POLICY "Trainees can delete their own session sets"
  ON public.session_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions s
      WHERE s.id = session_id AND s.trainee_id = auth.uid()
    )
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_profiles_trainer_id ON public.profiles(trainer_id);
CREATE INDEX idx_trainee_data_id ON public.trainee_data(id);
CREATE INDEX idx_foods_category ON public.foods(primary_category);
CREATE INDEX idx_foods_created_by ON public.foods(created_by);
CREATE INDEX idx_generated_meals_trainee ON public.generated_meals(trainee_id);
CREATE INDEX idx_workout_templates_trainer ON public.workout_templates(trainer_id);
CREATE INDEX idx_workout_templates_trainee ON public.workout_templates(trainee_id);
CREATE INDEX idx_template_exercises_template ON public.template_exercises(template_id);
CREATE INDEX idx_workout_sessions_trainee ON public.workout_sessions(trainee_id);
CREATE INDEX idx_workout_sessions_template ON public.workout_sessions(template_id);
CREATE INDEX idx_session_sets_session ON public.session_sets(session_id);
