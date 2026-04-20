-- ============================================================
-- SHIFT App — Phase 19.1: Food Manager Serving Size
-- ============================================================

ALTER TABLE public.foods ADD COLUMN serving_size DECIMAL NOT NULL DEFAULT 100 CHECK (serving_size > 0);
