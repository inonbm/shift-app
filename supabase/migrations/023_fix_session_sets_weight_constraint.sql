-- Fix check constraint on session_sets to allow 0 weight (bodyweight exercises)
ALTER TABLE public.session_sets DROP CONSTRAINT IF EXISTS session_sets_weight_kg_check;
ALTER TABLE public.session_sets ADD CONSTRAINT session_sets_weight_kg_check CHECK (weight_kg >= 0);
