// ============================================================
// SHIFT App — Shared TypeScript Type Definitions
// ============================================================

// --- Enums / Union Types ---

export type UserRole = 'trainer' | 'trainee' | 'admin';

export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type Goal = 'cut' | 'bulk' | 'maintenance';

export type FoodCategory = 'protein' | 'carb' | 'fat' | 'vegetable' | 'other';

export type MeasurementUnit = 'g' | 'ml' | 'unit' | 'slice' | 'scoop' | 'cup' | 'tbsp' | 'tsp';

export type DietaryPreference = 'vegetarian' | 'vegan' | 'lactose_free' | 'gluten_free' | 'no_fish' | 'no_eggs' | 'no_red_meat';

// --- Database Row Types ---

export interface Profile {
  id: string;
  email: string;
  phone_number?: string | null;
  full_name: string;
  role: UserRole;
  trainer_id: string | null;
  created_at: string;
}

export interface TraineeData {
  id: string;
  gender: Gender;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  goal: Goal;
  bmr: number;
  tdee: number;
  goal_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  is_busy_lifestyle: boolean;
  is_advanced: boolean;
  is_available_4_plus_days: boolean;
  protein_factor?: number;
  fat_percentage?: number;
  can_delete_sessions?: boolean;
  num_meals?: number;
  dietary_preferences?: DietaryPreference[];
  updated_at: string;
}

/** Combined profile + trainee data for convenience */
export interface TraineeWithData extends Profile {
  trainee_data: TraineeData | null;
}

export type MealSuitability = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface Food {
  id: string;
  name: string;
  primary_category: FoodCategory;
  measurement_unit: MeasurementUnit;
  serving_size: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  suitable_for?: MealSuitability[];
  tags?: string[];
  created_by: string;
  created_at: string;
}

/** A single food option within a generated meal (stored as JSONB) */
export interface MealFoodOption {
  food_id: string;
  food_name: string;
  unit?: MeasurementUnit;
  grams: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

export interface GeneratedMeal {
  id: string;
  trainee_id: string;
  meal_index: number;
  meal_name: string;
  protein_options: MealFoodOption[];
  carb_options: MealFoodOption[];
  fat_options: MealFoodOption[];
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  generated_at: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  trainer_id: string;
  trainee_id: string;
  created_at: string;
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: number;
  order_index: number;
  focus_area?: string;
}

/** Template with its exercises pre-loaded */
export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  exercises: TemplateExercise[];
}

export interface WorkoutSession {
  id: string;
  trainee_id: string;
  template_id: string;
  performed_at: string;
  notes: string | null;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_done: number;
  weight_kg: number;
  exercise?: {
    exercise_name: string;
  };
}

/** Full session with all logged sets */
export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: SessionSet[];
}

export interface FreeEntry {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

/** A single food item selection within a meal category */
export interface MealItemSelection {
  food_id: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  grams: number;
  /** Optional: what percentage of the category target this item represents */
  portion_percent?: number;
}

/**
 * Per-meal selection state: which items were picked for each macro category.
 * Supports multiple sources per category (e.g. tuna + eggs for protein).
 * BACKWARD COMPAT: legacy data may have a single MealItemSelection instead of
 * an array — consumers must normalise via `normaliseSelections()`.
 */
export interface MealCategorySelections {
  carb?: MealItemSelection[] | MealItemSelection | null;
  protein?: MealItemSelection[] | MealItemSelection | null;
  fat?: MealItemSelection[] | MealItemSelection | null;
}

/** Map of meal_id → category selections */
export type MealSelections = Record<string, MealCategorySelections>;

/** Normalise a category value to always be an array (handles legacy single-item data) */
export function normaliseSelectionArray(
  val: MealItemSelection[] | MealItemSelection | null | undefined
): MealItemSelection[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export interface DailyTracking {
  id: string;
  trainee_id: string;
  date: string;
  completed_meals: string[];
  meal_selections: MealSelections;
  free_entries: FreeEntry[];
  created_at: string;
  updated_at: string;
}

// --- Form / Input Types ---

export interface CreateTraineeInput {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  gender: Gender;
  age: number;
  weight_kg: number;
  height_cm: number;
  activity_level: ActivityLevel;
  goal: Goal;
  is_busy_lifestyle?: boolean;
  is_advanced?: boolean;
  is_available_4_plus_days?: boolean;
  protein_factor?: number;
  fat_percentage?: number;
  num_meals?: number;
  dietary_preferences?: DietaryPreference[];
}

export interface CreateFoodInput {
  name: string;
  primary_category: FoodCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  suitable_for?: MealSuitability[];
}

export interface CreateTemplateInput {
  name: string;
  trainee_id: string;
  exercises: Omit<TemplateExercise, 'id' | 'template_id'>[];
}

export interface LogSessionInput {
  template_id: string;
  notes?: string;
  sets: Omit<SessionSet, 'id' | 'session_id'>[];
}

// --- Nutrition Constants ---

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const GOAL_CALORIE_ADJUSTMENTS: Record<Goal, number> = {
  cut: -500,
  bulk: 300,
  maintenance: 0,
};

export interface MealDistributionConfig {
  index: number;
  name: string;
  percentage: number;
}

/** Meal distribution as percentage of daily calories based on total number of meals */
export function getMealDistribution(numMeals: number = 4): MealDistributionConfig[] {
  if (numMeals === 3) {
    return [
      { index: 0, name: 'ארוחה 1', percentage: 0.30 },
      { index: 1, name: 'ארוחה 2', percentage: 0.40 },
      { index: 2, name: 'ארוחה 3', percentage: 0.30 },
    ];
  }
  if (numMeals === 5) {
    return [
      { index: 0, name: 'ארוחה 1', percentage: 0.20 },
      { index: 1, name: 'ארוחה 2', percentage: 0.25 },
      { index: 2, name: 'ארוחה 3', percentage: 0.15 },
      { index: 3, name: 'ארוחה 4', percentage: 0.25 },
      { index: 4, name: 'ארוחה 5', percentage: 0.15 },
    ];
  }
  if (numMeals === 6) {
    return [
      { index: 0, name: 'ארוחה 1', percentage: 0.15 },
      { index: 1, name: 'ארוחה 2', percentage: 0.20 },
      { index: 2, name: 'ארוחה 3', percentage: 0.15 },
      { index: 3, name: 'ארוחה 4', percentage: 0.20 },
      { index: 4, name: 'ארוחה 5', percentage: 0.15 },
      { index: 5, name: 'ארוחה 6', percentage: 0.15 },
    ];
  }
  
  // Default: 4 meals
  return [
    { index: 0, name: 'ארוחה 1', percentage: 0.20 },
    { index: 1, name: 'ארוחה 2', percentage: 0.30 },
    { index: 2, name: 'ארוחה 3', percentage: 0.15 },
    { index: 3, name: 'ארוחה 4', percentage: 0.35 },
  ];
}

// --- Hebrew Labels ---

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'יושבני',
  light: 'פעילות קלה',
  moderate: 'פעילות בינונית',
  active: 'פעילות גבוהה',
  very_active: 'פעילות גבוהה מאד',
};

export const GOAL_LABELS: Record<Goal, string> = {
  cut: 'חיטוב',
  bulk: 'מסה',
  maintenance: 'תחזוקה',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'זכר',
  female: 'נקבה',
};

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'חלבון',
  carb: 'פחמימה',
  fat: 'שומן',
  vegetable: 'ירקות',
  other: 'אחר'
};

export const MEASUREMENT_UNIT_LABELS: Record<MeasurementUnit, string> = {
  g: 'גרם',
  ml: 'מ״ל',
  unit: 'יחידה',
  slice: 'פרוסה',
  scoop: 'כף מדידה',
  cup: 'כוס',
  tbsp: 'כף',
  tsp: 'כפית',
};
