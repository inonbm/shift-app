-- Migration: 027_meal_item_selections.sql
-- Description: Add meal_selections JSONB column to daily_tracking table.
-- Stores per-item food selections for granular meal progress tracking.
-- Structure: { "meal_id": { "carb": {...}, "protein": {...}, "fat": {...} } }

ALTER TABLE public.daily_tracking 
ADD COLUMN IF NOT EXISTS meal_selections JSONB NOT NULL DEFAULT '{}'::jsonb;
