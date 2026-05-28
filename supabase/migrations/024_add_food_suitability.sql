-- Migration: 020_add_food_suitability.sql
-- Description: Add suitable_for column to foods for intelligent meal generation.

ALTER TABLE public.foods
ADD COLUMN IF NOT EXISTS suitable_for TEXT[] NOT NULL DEFAULT '{breakfast,main_meal,snack}';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
