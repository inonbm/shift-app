import type { Gender, ActivityLevel, Goal } from '../types';
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
export function calculateMacros(weightKg: number, targetCalories: number): MacroTarget {
  if (weightKg <= 0 || targetCalories <= 0) {
    return { proteinGrams: 0, fatGrams: 0, carbsGrams: 0 };
  }

  const proteinGrams = Math.round(weightKg * 2.2);
  const fatGrams = Math.round(weightKg * 1.0);
  
  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  
  // Ensure carbs don't go negative if target calories is extremely low
  const carbsGrams = remainingCalories > 0 ? Math.round(remainingCalories / 4) : 0;

  return {
    proteinGrams,
    fatGrams,
    carbsGrams
  };
}
