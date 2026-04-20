-- ============================================================
-- SHIFT App — Phase 19: Food Manager Updates
-- ============================================================

-- 1. Modify the check constraint to allow more categories (vegetable, other)
ALTER TABLE public.foods DROP CONSTRAINT IF EXISTS foods_primary_category_check;
ALTER TABLE public.foods ADD CONSTRAINT foods_primary_category_check CHECK (primary_category IN ('protein', 'carb', 'fat', 'vegetable', 'other'));
