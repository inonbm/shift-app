-- Migration: 017_workout_assignment_flags.sql
-- Description: Add is_advanced and is_available_4_plus_days flags to trainee_data for workout assignment logic.

ALTER TABLE public.trainee_data
ADD COLUMN IF NOT EXISTS is_advanced BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_available_4_plus_days BOOLEAN NOT NULL DEFAULT false;
