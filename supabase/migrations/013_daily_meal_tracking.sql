-- TABLE: daily_tracking
-- Description: Tracks daily completed meals for trainees.

CREATE TABLE public.daily_tracking (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  trainee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  completed_meals text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT daily_tracking_trainee_id_date_key UNIQUE (trainee_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_tracking ENABLE ROW LEVEL SECURITY;

-- Policies

-- Trainees can view their own tracking
CREATE POLICY "Trainees can view their own tracking"
  ON public.daily_tracking FOR SELECT
  USING (trainee_id = auth.uid());

-- Trainees can insert their own tracking
CREATE POLICY "Trainees can insert their own tracking"
  ON public.daily_tracking FOR INSERT
  WITH CHECK (trainee_id = auth.uid());

-- Trainees can update their own tracking
CREATE POLICY "Trainees can update their own tracking"
  ON public.daily_tracking FOR UPDATE
  USING (trainee_id = auth.uid())
  WITH CHECK (trainee_id = auth.uid());

-- Trainers can view their trainees' tracking
CREATE POLICY "Trainers can view their trainees tracking"
  ON public.daily_tracking FOR SELECT
  USING (public.manages_trainee(trainee_id));

-- Admins can view all tracking
CREATE POLICY "Admins can view all tracking"
  ON public.daily_tracking FOR SELECT
  USING (public.is_admin());

-- Index for quick lookups
CREATE INDEX idx_daily_tracking_trainee_date ON public.daily_tracking(trainee_id, date);
