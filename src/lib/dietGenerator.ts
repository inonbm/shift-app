import type { Food, GeneratedMeal, MealFoodOption } from '../types';
import { MEAL_DISTRIBUTION } from '../types';

/**
 * Normalizes all database values dynamically and bounds numbers logically.
 */
function clamp(val: number, min = 0): number {
  return Math.max(val, min);
}

/**
 * Select `count` random unique items from `array`.
 */
function selectRandomUnique<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Creates 4 randomized food options for a specific macronutrient target,
 * accounting for the sequential cross-macro logic.
 */
function resolveOptions(
  foods: Food[], 
  targetGrams: number, 
  primaryKey: 'carbs_per_100g' | 'protein_per_100g' | 'fats_per_100g'
): MealFoodOption[] {
  const options: MealFoodOption[] = [];
  // Ensure we don't return entirely zeroed options unless target is basically zero
  if (targetGrams <= 1) return options;

  for (const food of foods) {
    const macroPer100 = food[primaryKey];
    if (macroPer100 <= 0) continue;

    // e.g. T_carb = 50g. Oats have 66g carbs per 100g.
    // Grams needed = 50 / 0.66 = ~75.7g of Oats
    const gramsNeeded = Math.round(targetGrams / (macroPer100 / 100));
    
    // Safety check in case of anomalous math
    if (gramsNeeded > 2000) continue; // prevents suggesting 2kg of spinach for carbs

    const protein = (food.protein_per_100g / 100) * gramsNeeded;
    const carbs = (food.carbs_per_100g / 100) * gramsNeeded;
    const fat = (food.fats_per_100g / 100) * gramsNeeded;
    const kcal = (food.calories_per_100g / 100) * gramsNeeded;

    options.push({
      food_id: food.id,
      food_name: food.name,
      grams: gramsNeeded,
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
      calories: Math.round(kcal)
    });
  }

  return options;
}

/**
 * Generates the full 4-meal diet plan using the Sequential Cross-Macro Solver.
 */
export function generateDietPlan(
  traineeId: string,
  dailyCalories: number,
  dailyProtein: number,
  dailyCarbs: number,
  dailyFat: number,
  availableFoods: Food[]
): GeneratedMeal[] {
  const meals: GeneratedMeal[] = [];

  // Group foods
  const carbFoods = availableFoods.filter(f => f.primary_category === 'carb');
  const proteinFoods = availableFoods.filter(f => f.primary_category === 'protein');
  const fatFoods = availableFoods.filter(f => f.primary_category === 'fat');

  for (const distribution of MEAL_DISTRIBUTION) {
    const p = distribution.percentage;
    
    // Isolate targets for this specific meal
    const T_c = dailyCarbs * p;
    const T_p = dailyProtein * p;
    const T_f = dailyFat * p;
    const T_kcal = dailyCalories * p;

    // Pick exactly 4 random foods per category for this meal
    const selectedCarbFoods = selectRandomUnique(carbFoods, 4);
    const selectedProteinFoods = selectRandomUnique(proteinFoods, 4);
    const selectedFatFoods = selectRandomUnique(fatFoods, 4);

    // ----------------------------------------------------
    // STEP 1: CARBS
    // ----------------------------------------------------
    const carbOptions = resolveOptions(selectedCarbFoods, T_c, 'carbs_per_100g');
    
    // Get median cross-macros from carb options to predict deduction
    // (We average it out because the UI lets the user pick ANY carb option, 
    // so we build the rest of the meal around the typical incidental macros of these choices)
    const avgCarbProtein = carbOptions.reduce((acc, obj) => acc + obj.protein_g, 0) / (carbOptions.length || 1);
    const avgCarbFat = carbOptions.reduce((acc, obj) => acc + obj.fat_g, 0) / (carbOptions.length || 1);

    // ----------------------------------------------------
    // STEP 2: PROTEIN
    // ----------------------------------------------------
    const R_p = clamp(T_p - avgCarbProtein); // Remaining protein after carbs
    const proteinOptions = resolveOptions(selectedProteinFoods, R_p, 'protein_per_100g');

    const avgProteinFat = proteinOptions.reduce((acc, obj) => acc + obj.fat_g, 0) / (proteinOptions.length || 1);

    // ----------------------------------------------------
    // STEP 3: FATS
    // ----------------------------------------------------
    const R_f = clamp(T_f - avgCarbFat - avgProteinFat); // Remaining fat after carbs & protein
    const fatOptions = resolveOptions(selectedFatFoods, R_f, 'fats_per_100g');

    meals.push({
      id: crypto.randomUUID(), // Temp ID until DB insertion
      trainee_id: traineeId,
      meal_index: distribution.index,
      meal_name: distribution.name,
      protein_options: proteinOptions,
      carb_options: carbOptions,
      fat_options: fatOptions,
      target_calories: Math.round(T_kcal),
      target_protein: Math.round(T_p),
      target_carbs: Math.round(T_c),
      target_fat: Math.round(T_f),
      generated_at: new Date().toISOString()
    });
  }

  return meals;
}
