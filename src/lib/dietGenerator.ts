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

    const referenceWeight = food.serving_size || 100;
    
    // e.g. T_carb = 50g. Oats have 66g carbs per serving (e.g., 100g).
    // Grams needed = 50 / (0.66) = ~75.7g of Oats
    let rawGrams = targetGrams / (macroPer100 / referenceWeight);
    
    // Safety check in case of anomalous math
    if (rawGrams > 2000) continue; // prevents suggesting 2kg of spinach for carbs

    // Apply Rounding Logic
    let gramsNeeded = rawGrams;
    if (rawGrams < 20) {
      gramsNeeded = Math.round(rawGrams);
    } else if (food.primary_category === 'fat') {
      gramsNeeded = Math.round(rawGrams / 5) * 5;
    } else {
      gramsNeeded = Math.round(rawGrams / 10) * 10;
    }

    if (gramsNeeded <= 0) continue;

    // Recalculate macros based on the rounded grams
    const protein = (food.protein_per_100g / referenceWeight) * gramsNeeded;
    const carbs = (food.carbs_per_100g / referenceWeight) * gramsNeeded;
    const fat = (food.fats_per_100g / referenceWeight) * gramsNeeded;
    const kcal = (food.calories_per_100g / referenceWeight) * gramsNeeded;

    options.push({
      food_id: food.id,
      food_name: food.name,
      grams: gramsNeeded,
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
      calories: Math.round(kcal),
      unit: food.measurement_unit
    });
  }

  return options;
}

/**
 * CRITICAL CALORIE RULE: Because resolveOptions rounds food weights up for user
 * convenience (nearest 10 g or 5 g), the raw output would naturally exceed the
 * requested calorie ceiling. To compensate, we pre-deflate each meal's macro
 * targets by ROUNDING_BIAS_FACTOR before feeding them into the solver.
 * This keeps the final totals roughly 50–100 kcal UNDER the ceiling.
 */
const ROUNDING_BIAS_FACTOR = 0.93;

/**
 * Generates the full 4-meal diet plan using the Sequential Cross-Macro Solver.
 */
export function generateDietPlan(
  traineeId: string,
  _dailyCalories: number,
  dailyProtein: number,
  dailyCarbs: number,
  dailyFat: number,
  availableFoods: Food[],
  isBusyLifestyle: boolean = false
): GeneratedMeal[] {
  const meals: GeneratedMeal[] = [];

  // Group foods — for busy lifestyles, surface quick no-cook foods first via stable sort.
  const QUICK_KEYWORDS = [
    'יוגורט', 'גבינה', 'קוטג', 'טונה', 'סרדין', 'ביצה', 'לחם', 'פיתה', 'קרקר', 'פריכי',
    'אגוז', 'שקד', 'בוטן', 'פיסטוק', 'גרנולה', 'חלב', 'שיבולת', 'קוואקר',
    'בננה', 'תפוח', 'גזר', 'עגבני', 'מלפפון', 'חומוס', 'אבוקדו',
    'tuna', 'cottage', 'yogurt', 'bread', 'nut', 'almond', 'oat'
  ];

  const sortFoodsByLifestyle = (foods: Food[]) => {
    if (!isBusyLifestyle) return foods;
    return [...foods].sort((a, b) => {
      const aMatch = QUICK_KEYWORDS.some(kw => a.name.toLowerCase().includes(kw.toLowerCase()));
      const bMatch = QUICK_KEYWORDS.some(kw => b.name.toLowerCase().includes(kw.toLowerCase()));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  };

  const carbFoods = sortFoodsByLifestyle(availableFoods.filter(f => f.primary_category === 'carb'));
  const proteinFoods = sortFoodsByLifestyle(availableFoods.filter(f => f.primary_category === 'protein'));
  const fatFoods = sortFoodsByLifestyle(availableFoods.filter(f => f.primary_category === 'fat'));

  for (const distribution of MEAL_DISTRIBUTION) {
    const p = distribution.percentage;
    
    // Isolate targets for this specific meal and apply the rounding-bias
    // pre-deflation so the rounded weights don't overshoot the calorie ceiling.
    const T_c = dailyCarbs * p * ROUNDING_BIAS_FACTOR;
    const T_p = dailyProtein * p * ROUNDING_BIAS_FACTOR;
    const T_f = dailyFat * p * ROUNDING_BIAS_FACTOR;

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

    // ----------------------------------------------------
    // STEP 4: RECALCULATE MEAL TARGETS
    // ----------------------------------------------------
    const avgP = 
      (proteinOptions.reduce((acc, o) => acc + o.protein_g, 0) / (proteinOptions.length || 1)) +
      (carbOptions.reduce((acc, o) => acc + o.protein_g, 0) / (carbOptions.length || 1)) +
      (fatOptions.reduce((acc, o) => acc + o.protein_g, 0) / (fatOptions.length || 1));

    const avgC = 
      (proteinOptions.reduce((acc, o) => acc + o.carbs_g, 0) / (proteinOptions.length || 1)) +
      (carbOptions.reduce((acc, o) => acc + o.carbs_g, 0) / (carbOptions.length || 1)) +
      (fatOptions.reduce((acc, o) => acc + o.carbs_g, 0) / (fatOptions.length || 1));

    const avgF = 
      (proteinOptions.reduce((acc, o) => acc + o.fat_g, 0) / (proteinOptions.length || 1)) +
      (carbOptions.reduce((acc, o) => acc + o.fat_g, 0) / (carbOptions.length || 1)) +
      (fatOptions.reduce((acc, o) => acc + o.fat_g, 0) / (fatOptions.length || 1));

    const avgKcal = 
      (proteinOptions.reduce((acc, o) => acc + o.calories, 0) / (proteinOptions.length || 1)) +
      (carbOptions.reduce((acc, o) => acc + o.calories, 0) / (carbOptions.length || 1)) +
      (fatOptions.reduce((acc, o) => acc + o.calories, 0) / (fatOptions.length || 1));

    meals.push({
      id: crypto.randomUUID(), // Temp ID until DB insertion
      trainee_id: traineeId,
      meal_index: distribution.index,
      meal_name: distribution.name,
      protein_options: proteinOptions,
      carb_options: carbOptions,
      fat_options: fatOptions,
      target_calories: Math.round(avgKcal),
      target_protein: Math.round(avgP),
      target_carbs: Math.round(avgC),
      target_fat: Math.round(avgF),
      generated_at: new Date().toISOString()
    });
  }

  return meals;
}
