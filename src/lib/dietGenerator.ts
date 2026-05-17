import type { Food, GeneratedMeal, MealFoodOption, MealSuitability } from '../types';
import { MEAL_DISTRIBUTION } from '../types';

const MEAL_SUITABILITY_MAP: Record<number, MealSuitability[]> = {
  0: ['breakfast', 'snack'],
  1: ['lunch'],
  2: ['snack'],
  3: ['dinner']
};

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
 * Creates up to 4 randomized food options for a specific macronutrient target.
 *
 * IMPORTANT – nutritional values (protein_per_100g, carbs_per_100g, fats_per_100g,
 * calories_per_100g) are ALWAYS stored as grams/kcal per 100 g of food in the
 * database, regardless of the food's serving_size. We therefore ALWAYS divide by 100
 * to get the per-gram ratio. Using serving_size here previously caused extreme
 * quantities (e.g. 1660 g of Quinoa) for unit-based foods (serving_size = 1).
 *
 * After building the raw options list the function applies two post-processing steps:
 *   1. Fallback  – if no options were produced but a real target exists, insert the
 *      most macro-dense food at a minimum 30 g portion so the column is never empty.
 *   2. Anchor normalization (Issue 4) – the first option acts as the "anchor". All
 *      other options are recalculated so they deliver the EXACT same amount of the
 *      primary macro as the anchor (before display rounding).
 */
function resolveOptions(
  foods: Food[],
  targetGrams: number,
  primaryKey: 'carbs_per_100g' | 'protein_per_100g' | 'fats_per_100g',
  // Map primaryKey → the corresponding MealFoodOption output field for normalization
  primaryOutputKey: 'carbs_g' | 'protein_g' | 'fat_g'
): MealFoodOption[] {
  const options: MealFoodOption[] = [];
  // Ensure we don't return entirely zeroed options unless target is basically zero
  if (targetGrams <= 1) return options;

  // ── MACRO REFERENCE is always 100 g regardless of serving_size ────────────
  // The DB columns are named *_per_100g and store values for 100 g of food.
  const MACRO_REF = 100;

  const buildOption = (food: Food, gramsNeeded: number): MealFoodOption => {
    const protein = (food.protein_per_100g / MACRO_REF) * gramsNeeded;
    const carbs   = (food.carbs_per_100g   / MACRO_REF) * gramsNeeded;
    const fat     = (food.fats_per_100g    / MACRO_REF) * gramsNeeded;
    const kcal    = (food.calories_per_100g / MACRO_REF) * gramsNeeded;
    return {
      food_id:   food.id,
      food_name: food.name,
      grams:     Math.round(gramsNeeded),
      protein_g: Math.round(protein * 10) / 10,
      carbs_g:   Math.round(carbs   * 10) / 10,
      fat_g:     Math.round(fat     * 10) / 10,
      calories:  Math.round(kcal),
      unit:      food.measurement_unit,
    };
  };

  for (const food of foods) {
    const macroPer100 = food[primaryKey];
    if (macroPer100 <= 0) continue;

    // Grams of this food needed to supply targetGrams of the primary macro
    const rawGrams = (targetGrams * MACRO_REF) / macroPer100;

    // Safety cap – skip foods that would require unrealistic portions
    if (rawGrams > 1200) continue;

    // Apply rounding for usability
    let gramsNeeded: number;
    if (rawGrams < 20) {
      gramsNeeded = Math.round(rawGrams);
    } else if (food.primary_category === 'fat') {
      gramsNeeded = Math.round(rawGrams / 5) * 5;
    } else {
      gramsNeeded = Math.round(rawGrams / 10) * 10;
    }

    if (gramsNeeded <= 0) continue;

    options.push(buildOption(food, gramsNeeded));
  }

  // ── FALLBACK: guarantee at least one item ──────────────────────────────────
  if (options.length === 0 && foods.length > 0) {
    // Pick the food with the highest density for the primary macro
    const bestFood = foods
      .filter(f => f[primaryKey] > 0)
      .sort((a, b) => b[primaryKey] - a[primaryKey])[0];
    if (bestFood) {
      const rawGrams = (targetGrams * MACRO_REF) / bestFood[primaryKey];
      const gramsNeeded = Math.max(30, Math.round(rawGrams / 10) * 10);
      options.push(buildOption(bestFood, gramsNeeded));
    }
  }

  // ── ANCHOR NORMALIZATION (Issue 4): macro equivalency across alternatives ──
  // All alternatives must deliver the exact same primary-macro grams as the
  // anchor (options[0]) so a trainee can freely swap items without changing
  // their macro targets.
  if (options.length > 1) {
    const anchorMacroAmount = options[0][primaryOutputKey]; // e.g. 25.0 g protein

    for (let i = 1; i < options.length; i++) {
      const opt = options[i];
      const food = foods.find(f => f.id === opt.food_id);
      if (!food || food[primaryKey] <= 0) continue;

      // Exact grams needed to match anchor's primary macro
      const exactGrams = (anchorMacroAmount * MACRO_REF) / food[primaryKey];

      // Apply same rounding logic for a clean number
      let normalizedGrams: number;
      if (exactGrams < 20) {
        normalizedGrams = Math.round(exactGrams);
      } else if (food.primary_category === 'fat') {
        normalizedGrams = Math.round(exactGrams / 5) * 5;
      } else {
        normalizedGrams = Math.round(exactGrams / 10) * 10;
      }
      if (normalizedGrams <= 0) continue;

      options[i] = buildOption(food, normalizedGrams);
      // Force exact primary macro to match anchor (eliminate floating-point drift)
      options[i][primaryOutputKey] = anchorMacroAmount;
    }
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

  let previousMealFoodIds: string[] = [];

  for (const distribution of MEAL_DISTRIBUTION) {
    const p = distribution.percentage;
    
    // Isolate targets for this specific meal and apply the rounding-bias
    // pre-deflation so the rounded weights don't overshoot the calorie ceiling.
    const T_c = dailyCarbs * p * ROUNDING_BIAS_FACTOR;
    const T_p = dailyProtein * p * ROUNDING_BIAS_FACTOR;
    const T_f = dailyFat * p * ROUNDING_BIAS_FACTOR;

    // Filter by Category Suitability
    const allowedTags = MEAL_SUITABILITY_MAP[distribution.index] || [];
    
    const filterSuitability = (foods: Food[]) => foods.filter(f => 
      !f.suitable_for || f.suitable_for.length === 0 || f.suitable_for.some(tag => allowedTags.includes(tag))
    );

    const filterNoRepetition = (foods: Food[]) => foods.filter(f => !previousMealFoodIds.includes(f.id));

    const getFoodsForMeal = (categoryFoods: Food[]) => {
      // 1. Double filter: category + no repetition
      let filtered = filterNoRepetition(filterSuitability(categoryFoods));
      if (filtered.length >= 4) return filtered;

      // 2. Fallback 1: category only (drop anti-repetition)
      filtered = filterSuitability(categoryFoods);
      if (filtered.length >= 4) return filtered;

      // 3. Fallback 2: all foods in category (drop both constraints)
      return categoryFoods;
    };

    // Pick exactly 4 random foods per category for this meal
    const selectedCarbFoods = selectRandomUnique(getFoodsForMeal(carbFoods), 4);
    const selectedProteinFoods = selectRandomUnique(getFoodsForMeal(proteinFoods), 4);
    const selectedFatFoods = selectRandomUnique(getFoodsForMeal(fatFoods), 4);

    // Update history buffer for the next meal
    previousMealFoodIds = [
      ...selectedCarbFoods.map(f => f.id),
      ...selectedProteinFoods.map(f => f.id),
      ...selectedFatFoods.map(f => f.id)
    ];

    // ----------------------------------------------------
    // STEP 1: CARBS
    // ----------------------------------------------------
    const carbOptions = resolveOptions(selectedCarbFoods, T_c, 'carbs_per_100g', 'carbs_g');
    
    // Get median cross-macros from carb options to predict deduction
    // (We average it out because the UI lets the user pick ANY carb option, 
    // so we build the rest of the meal around the typical incidental macros of these choices)
    const avgCarbProtein = carbOptions.reduce((acc, obj) => acc + obj.protein_g, 0) / (carbOptions.length || 1);
    const avgCarbFat = carbOptions.reduce((acc, obj) => acc + obj.fat_g, 0) / (carbOptions.length || 1);

    // ----------------------------------------------------
    // STEP 2: PROTEIN
    // ----------------------------------------------------
    const R_p = clamp(T_p - avgCarbProtein); // Remaining protein after carbs
    const proteinOptions = resolveOptions(selectedProteinFoods, R_p, 'protein_per_100g', 'protein_g');

    const avgProteinFat = proteinOptions.reduce((acc, obj) => acc + obj.fat_g, 0) / (proteinOptions.length || 1);

    // ----------------------------------------------------
    // STEP 3: FATS
    // ----------------------------------------------------
    const R_f = clamp(T_f - avgCarbFat - avgProteinFat); // Remaining fat after carbs & protein
    const fatOptions = resolveOptions(selectedFatFoods, R_f, 'fats_per_100g', 'fat_g');

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

/**
 * Recalculates the target macros and calories for an array of meals.
 * It maps over the meals, sums up the macros from all options (protein, carb, fat),
 * and updates the target fields accordingly.
 */
export function recalculateDietTotals<T extends { 
  protein_options: MealFoodOption[];
  carb_options: MealFoodOption[];
  fat_options: MealFoodOption[];
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
}>(meals: T[]): T[] {
  return meals.map(meal => {
    // The option arrays (protein_options, carb_options, fat_options) are
    // mutually-exclusive "OR" choices: a trainee picks ONE item per category.
    // We use index [0] from each array as the representative sample
    // instead of summing every alternative, which would massively overcount.
    const representative = [
      meal.protein_options?.[0],
      meal.carb_options?.[0],
      meal.fat_options?.[0]
    ].filter((o): o is MealFoodOption => o !== undefined);
    
    return {
      ...meal,
      target_calories: Math.round(representative.reduce((sum, o) => sum + o.calories, 0)),
      target_protein: Math.round(representative.reduce((sum, o) => sum + o.protein_g, 0) * 10) / 10,
      target_carbs: Math.round(representative.reduce((sum, o) => sum + o.carbs_g, 0) * 10) / 10,
      target_fat: Math.round(representative.reduce((sum, o) => sum + o.fat_g, 0) * 10) / 10,
    };
  });
}
