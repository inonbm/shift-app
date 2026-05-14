-- Migration: 021_split_main_meal.sql
-- Description: Split main_meal into lunch and dinner in suitable_for column.

-- Change the default value for new rows
ALTER TABLE public.foods 
ALTER COLUMN suitable_for SET DEFAULT '{breakfast,lunch,snack,dinner}';

-- Update existing rows that have 'main_meal'
UPDATE public.foods
SET suitable_for = array_remove(
  array_append(
    array_append(suitable_for, 'lunch'), 
    'dinner'
  ), 
  'main_meal'
)
WHERE 'main_meal' = ANY(suitable_for);

-- In case there are duplicates added during append (which shouldn't happen unless they already existed, but we can deduplicate if needed, though postgres arrays can have duplicates, our TS logic uses includes() so duplicates won't break it).

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
