-- ============================================================
-- SHIFT App — Phase 19.3: Dynamic Measurement Units
-- ============================================================

ALTER TABLE public.foods ADD COLUMN measurement_unit VARCHAR NOT NULL DEFAULT 'g' 
  CHECK (measurement_unit IN ('g', 'ml', 'unit', 'slice', 'scoop', 'cup', 'tbsp', 'tsp'));
