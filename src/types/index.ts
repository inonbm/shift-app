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
  updated_at: string;
}

/** Combined profile + trainee data for convenience */
export interface TraineeWithData extends Profile {
  trainee_data: TraineeData | null;
}

export interface Food {
  id: string;
  name: string;
  primary_category: FoodCategory;
  serving_size: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
  created_by: string;
  created_at: string;
}

/** A single food option within a generated meal (stored as JSONB) */
export interface MealFoodOption {
  food_id: string;
  food_name: string;
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
}

/** Full session with all logged sets */
export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: SessionSet[];
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
}

export interface CreateFoodInput {
  name: string;
  primary_category: FoodCategory;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fats_per_100g: number;
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

/** Meal distribution as percentage of daily calories */
export const MEAL_DISTRIBUTION = [
  { index: 0, name: 'ארוחת בוקר', percentage: 0.20 },
  { index: 1, name: 'ארוחת צהריים', percentage: 0.30 },
  { index: 2, name: 'ארוחת ביניים', percentage: 0.15 },
  { index: 3, name: 'ארוחת ערב', percentage: 0.35 },
] as const;

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
