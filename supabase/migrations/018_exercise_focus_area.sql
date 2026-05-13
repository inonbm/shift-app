-- Migration: 018_exercise_focus_area.sql
-- Description: Add focus_area column to template_exercises for grouping.

ALTER TABLE public.template_exercises
ADD COLUMN IF NOT EXISTS focus_area TEXT;
