import type { Gender, ActivityLevel, Goal, Food } from '../types';
import { ACTIVITY_MULTIPLIERS, GOAL_CALORIE_ADJUSTMENTS } from '../types';

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 */
export function calculateBMR(gender: Gender, weightKg: number, heightCm: number, age: number): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0;
  
  const base = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  if (bmr <= 0) return 0;
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Calculates the daily caloric target based on the user's goal.
 */
export function calculateTargetCalories(tdee: number, goal: Goal): number {
  if (tdee <= 0) return 0;
  return tdee + GOAL_CALORIE_ADJUSTMENTS[goal];
}

export interface MacroTarget {
  proteinGrams: number;
  fatGrams: number;
  carbsGrams: number;
}

/**
 * Calculates daily macronutrient targets.
 * Protein: 2.2g per kg of bodyweight
 * Fat: 1g per kg of bodyweight
 * Carbs: The remaining calories divided by 4
 */
export function calculateMacros(weightKg: number, targetCalories: number, proteinFactor: number = 2.0, fatPercentage: number = 25): MacroTarget {
  if (weightKg <= 0 || targetCalories <= 0) {
    return { proteinGrams: 0, fatGrams: 0, carbsGrams: 0 };
  }

  const proteinGrams = Math.round(weightKg * proteinFactor);
  
  const remainingCalories = Math.max(0, targetCalories - (proteinGrams * 4));
  const fatCalories = remainingCalories * (fatPercentage / 100);
  const fatGrams = Math.round(fatCalories / 9);
  
  const carbsCalories = remainingCalories - fatCalories;
  const carbsGrams = Math.round(carbsCalories / 4);

  return {
    proteinGrams,
    fatGrams,
    carbsGrams
  };
}

// ── Swap Calculation Helpers ──────────────────────────────────────────────

export const WEIGHT_BASED_UNITS: ReadonlySet<string> = new Set(['g', 'ml']);
export const isWeightBased = (food: Food) => WEIGHT_BASED_UNITS.has(food.measurement_unit);
export const macroRef = (food: Food): number =>
  food.serving_size > 0 ? food.serving_size : (isWeightBased(food) ? 100 : 1);

export type MacroKey = 'protein_per_100g' | 'carbs_per_100g' | 'fats_per_100g';

export interface SwapCandidate {
  food: Food;
  quantity: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

// ── Portion caps ──────────────────────────────────────────────────────────
export const MAX_UNIT_ITEMS = 8;
export const MAX_WEIGHT_G = 600;

export function computeSwapCandidate(
  food: Food,
  targetMacroGrams: number,
  macroKey: MacroKey
): SwapCandidate | null {
  const macroPer = food[macroKey];
  if (macroPer <= 0) return null;

  const ref = macroRef(food);
  const rawQuantity = (targetMacroGrams * ref) / macroPer;

  // Apply portion caps
  const cap = isWeightBased(food) ? MAX_WEIGHT_G : MAX_UNIT_ITEMS;
  if (rawQuantity > cap || rawQuantity <= 0) return null;

  // Smart rounding
  let quantity: number;
  if (isWeightBased(food)) {
    quantity = rawQuantity < 20
      ? Math.round(rawQuantity)
      : food.primary_category === 'fat'
        ? Math.round(rawQuantity / 5) * 5
        : Math.round(rawQuantity / 10) * 10;
  } else {
    quantity = Math.round(rawQuantity);
    if (quantity <= 0) quantity = 1;
  }

  const protein_g = (food.protein_per_100g / ref) * quantity;
  const carbs_g = (food.carbs_per_100g / ref) * quantity;
  const fat_g = (food.fats_per_100g / ref) * quantity;
  const calories = (food.calories_per_100g / ref) * quantity;

  return {
    food,
    quantity: Math.round(quantity * 10) / 10,
    protein_g: Math.round(protein_g * 10) / 10,
    carbs_g: Math.round(carbs_g * 10) / 10,
    fat_g: Math.round(fat_g * 10) / 10,
    calories: Math.round(calories),
  };
}
