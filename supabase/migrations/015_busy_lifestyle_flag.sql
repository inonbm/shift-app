-- Migration: 015_busy_lifestyle_flag.sql
-- Description: Add is_busy_lifestyle flag to trainee_data.

ALTER TABLE public.trainee_data
ADD COLUMN IF NOT EXISTS is_busy_lifestyle BOOLEAN NOT NULL DEFAULT false;
