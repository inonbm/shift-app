-- Add num_meals to trainee_data
ALTER TABLE trainee_data ADD COLUMN IF NOT EXISTS num_meals integer DEFAULT 4;

-- Add dietary_preferences to trainee_data
ALTER TABLE trainee_data ADD COLUMN IF NOT EXISTS dietary_preferences text[] DEFAULT '{}'::text[];

-- Add tags to foods
ALTER TABLE foods ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
