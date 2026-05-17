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
 * DYNAMIC MACRO REFERENCE DENOMINATOR
 * ------------------------------------
 * The DB stores nutritional values relative to food.serving_size:
 *   - Weight-based foods (measurement_unit = 'g' | 'ml'):
 *       serving_size is typically 100; values are per 100 g/ml.
 *       → rawUnits output = grams needed ✓
 *   - Unit-based foods (measurement_unit = 'unit' | 'slice' | 'scoop' | 'cup' | 'tbsp' | 'tsp'):
 *       serving_size = 1; values are per ONE unit/slice/scoop.
 *       → rawUnits output = number of units needed ✓
 *
 * Formula:  rawUnits = targetGrams × serving_size / macroPer[serving_size]g
 *
 * After building options, two post-processing steps are applied:
 *   1. Fallback  – guarantee ≥1 item so columns are never empty.
 *   2. Anchor normalization – all alternatives deliver the exact same primary
 *      macro as options[0], enabling safe item swapping by the trainee.
 *      Works correctly across mixed unit/weight alternatives because each food
 *      uses its own macroRef for the back-calculation.
 */
function resolveOptions(
  foods: Food[],
  targetGrams: number,
  primaryKey: 'carbs_per_100g' | 'protein_per_100g' | 'fats_per_100g',
  primaryOutputKey: 'carbs_g' | 'protein_g' | 'fat_g'
): MealFoodOption[] {
  const options: MealFoodOption[] = [];
  if (targetGrams <= 1) return options;

  /** Unit types whose macros are stored per 100 of that unit (i.e. per 100 g/ml). */
  const WEIGHT_BASED_UNITS: ReadonlySet<string> = new Set(['g', 'ml']);
  const isWeightBased = (food: Food) => WEIGHT_BASED_UNITS.has(food.measurement_unit);

  /**
   * The macro reference denominator for a food.
   * Weight-based: serving_size (usually 100) — macros stored per that many grams.
   * Unit-based:   serving_size (usually 1)   — macros stored per that many units.
   * Falls back gracefully if serving_size is missing.
   */
  const macroRef = (food: Food): number =>
    food.serving_size > 0 ? food.serving_size : (isWeightBased(food) ? 100 : 1);

  const buildOption = (food: Food, unitsNeeded: number): MealFoodOption => {
    const ref = macroRef(food);
    const protein = (food.protein_per_100g / ref) * unitsNeeded;
    const carbs   = (food.carbs_per_100g   / ref) * unitsNeeded;
    const fat     = (food.fats_per_100g    / ref) * unitsNeeded;
    const kcal    = (food.calories_per_100g / ref) * unitsNeeded;
    return {
      food_id:   food.id,
      food_name: food.name,
      grams:     Math.round(unitsNeeded * 10) / 10, // quantity in g for weight, count for unit
      protein_g: Math.round(protein * 10) / 10,
      carbs_g:   Math.round(carbs   * 10) / 10,
      fat_g:     Math.round(fat     * 10) / 10,
      calories:  Math.round(kcal),
      unit:      food.measurement_unit,
    };
  };

  for (const food of foods) {
    const macroPer = food[primaryKey];
    if (macroPer <= 0) continue;

    const ref = macroRef(food);
    // Units (grams OR item-count) of this food needed to supply targetGrams of macro
    const rawUnits = (targetGrams * ref) / macroPer;

    // Safety cap — skip unrealistic portions
    // Weight-based: cap at 1200 g; Unit-based: cap at 20 units
    const cap = isWeightBased(food) ? 1200 : 20;
    if (rawUnits > cap) continue;

    // Round to clean, user-friendly numbers
    let unitsNeeded: number;
    if (!isWeightBased(food)) {
      // Nearest half-unit (1.5 slices of bread is perfectly meaningful)
      unitsNeeded = Math.round(rawUnits * 2) / 2;
    } else if (rawUnits < 20) {
      unitsNeeded = Math.round(rawUnits);
    } else if (food.primary_category === 'fat') {
      unitsNeeded = Math.round(rawUnits / 5) * 5;
    } else {
      unitsNeeded = Math.round(rawUnits / 10) * 10;
    }

    if (unitsNeeded <= 0) continue;
    options.push(buildOption(food, unitsNeeded));
  }

  // ── FALLBACK: guarantee at least one item ──────────────────────────────────
  if (options.length === 0 && foods.length > 0) {
    const bestFood = foods
      .filter(f => f[primaryKey] > 0)
      .sort((a, b) => b[primaryKey] - a[primaryKey])[0];
    if (bestFood) {
      const ref = macroRef(bestFood);
      const rawUnits = (targetGrams * ref) / bestFood[primaryKey];
      const unitsNeeded = isWeightBased(bestFood)
        ? Math.max(30, Math.round(rawUnits / 10) * 10)
        : Math.max(1, Math.round(rawUnits * 2) / 2);
      options.push(buildOption(bestFood, unitsNeeded));
    }
  }

  // ── ANCHOR NORMALIZATION: macro equivalency across all alternatives ─────────
  // Back-calculate units for each non-anchor option so it delivers exactly the
  // same primary-macro amount as options[0]. Mixed weight/unit columns work
  // correctly because each food uses its own macroRef.
  if (options.length > 1) {
    const anchorMacroAmount = options[0][primaryOutputKey];

    for (let i = 1; i < options.length; i++) {
      const food = foods.find(f => f.id === options[i].food_id);
      if (!food || food[primaryKey] <= 0) continue;

      const ref = macroRef(food);
      const exactUnits = (anchorMacroAmount * ref) / food[primaryKey];

      let normalizedUnits: number;
      if (!isWeightBased(food)) {
        normalizedUnits = Math.round(exactUnits * 2) / 2;
      } else if (exactUnits < 20) {
        normalizedUnits = Math.round(exactUnits);
      } else if (food.primary_category === 'fat') {
        normalizedUnits = Math.round(exactUnits / 5) * 5;
      } else {
        normalizedUnits = Math.round(exactUnits / 10) * 10;
      }
      if (normalizedUnits <= 0) continue;

      options[i] = buildOption(food, normalizedUnits);
      // Pin to anchor to eliminate floating-point drift
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
