-- Migration: Add allow_multi_select to trainee_data
-- Allows trainers to toggle per-trainee whether multi-source selection is enabled
ALTER TABLE trainee_data
  ADD COLUMN IF NOT EXISTS allow_multi_select BOOLEAN DEFAULT false;
