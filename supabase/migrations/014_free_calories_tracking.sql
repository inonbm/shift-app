-- Migration: 014_free_calories_tracking.sql
-- Description: Add free_entries column to daily_tracking table.

ALTER TABLE public.daily_tracking 
ADD COLUMN IF NOT EXISTS free_entries JSONB NOT NULL DEFAULT '[]'::jsonb;
