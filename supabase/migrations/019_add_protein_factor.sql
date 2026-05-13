-- Migration: 019_add_protein_factor.sql
-- Description: Add protein_factor column to trainee_data for customizable macros.

ALTER TABLE public.trainee_data
ADD COLUMN IF NOT EXISTS protein_factor FLOAT NOT NULL DEFAULT 2.0;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
