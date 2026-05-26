-- Migration: Add fat_percentage to trainee_data
ALTER TABLE public.trainee_data 
ADD COLUMN IF NOT EXISTS fat_percentage NUMERIC NOT NULL DEFAULT 25;
