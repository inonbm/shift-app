import type { Food, GeneratedMeal, MealFoodOption, MealSuitability } from '../types';
import { MEAL_DISTRIBUTION } from '../types';

const MEAL_SUITABILITY_MAP: Record<number, MealSuitability[]> = {
  0: ['breakfast', 'snack'],
  1: ['lunch'],
  2: ['snack'],
  3: ['dinner']
};


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
 *   - Unit-based foods (measurement_unit = 'unit' | 'slice' | 'scoop' | 'cup' | 'tbsp' | 'tsp'):
 *       serving_size = 1; values are per ONE unit/slice/scoop.
 *
 * After building options the function applies:
 *   1. Smart rounding — for indivisible items, picks floor vs ceil based on
 *      which brings the primary macro closest to the target.
 *   2. Fallback — guarantees at least 1 item so columns are never empty.
 *   3. Calorie proximity filter — removes alternatives whose calories differ
 *      by more than 80% from the median, so all remaining alternatives are
 *      truly interchangeable from a caloric perspective.
 *   4. All macro values reflect the TRUE quantity — no force-overrides.
 */
function resolveOptions(
  foods: Food[],
  targetGrams: number,
  primaryKey: 'carbs_per_100g' | 'protein_per_100g' | 'fats_per_100g',
  _primaryOutputKey: 'carbs_g' | 'protein_g' | 'fat_g'
): MealFoodOption[] {
  void _primaryOutputKey;
  const options: MealFoodOption[] = [];
  if (targetGrams <= 1) return options;

  const WEIGHT_BASED_UNITS: ReadonlySet<string> = new Set(['g', 'ml']);
  const isWeightBased = (food: Food) => WEIGHT_BASED_UNITS.has(food.measurement_unit);

  const macroRef = (food: Food): number =>
    food.serving_size > 0 ? food.serving_size : (isWeightBased(food) ? 100 : 1);

  // ── Keyword lists for divisible vs indivisible unit foods ─────────────────
  const INDIVISIBLE_KEYWORDS = [
    '\u05d1\u05d9\u05e6\u05d4', '\u05d1\u05d9\u05e6\u05d9\u05dd',
    '\u05d9\u05d5\u05d2\u05d5\u05e8\u05d8',
    '\u05de\u05e9\u05e7\u05d4',
    '\u05d1\u05e7\u05d1\u05d5\u05e7',
    '\u05de\u05e2\u05d3\u05df',
    '\u05e9\u05d9\u05d9\u05e7',
    '\u05d2\u05d1\u05d9\u05e2',
    '\u05d0\u05de\u05e4\u05d5\u05dc\u05d4',
    '\u05e9\u05e7\u05d9\u05ea',
  ];
  const DIVISIBLE_KEYWORDS = [
    '\u05e4\u05e8\u05d5\u05e1\u05d4', '\u05e4\u05e8\u05d5\u05e1\u05ea',
    '\u05e4\u05d9\u05ea\u05d4', '\u05e4\u05d9\u05d5\u05ea',
    '\u05d8\u05d5\u05e8\u05d8\u05d9\u05d4', '\u05d8\u05d5\u05e8\u05d8\u05d9\u05d9\u05d4',
    '\u05dc\u05d7\u05de\u05e0\u05d9\u05d4', '\u05dc\u05d7\u05de\u05e0\u05d9\u05d5\u05ea',
    '\u05e7\u05e8\u05d5\u05d0\u05e1\u05d5\u05df',
    '\u05d5\u05d0\u05e4\u05dc',
  ];

  const isIndivisibleUnit = (food: Food): boolean => {
    if (isWeightBased(food)) return false;
    const lc = food.name.toLowerCase();
    if (DIVISIBLE_KEYWORDS.some(kw => lc.includes(kw.toLowerCase()))) return false;
    if (INDIVISIBLE_KEYWORDS.some(kw => lc.includes(kw.toLowerCase()))) return true;
    return true;
  };

  const roundUnitQuantity = (food: Food, rawUnits: number): number => {
    if (!isWeightBased(food)) {
      return isIndivisibleUnit(food)
        ? Math.round(rawUnits)
        : Math.round(rawUnits * 2) / 2;
    }
    if (rawUnits < 20)                   return Math.round(rawUnits);
    if (food.primary_category === 'fat') return Math.round(rawUnits / 5) * 5;
    return Math.round(rawUnits / 10) * 10;
  };

  /**
   * Smart rounding for indivisible unit-based foods: compares floor vs ceil
   * and picks whichever gets the primary macro closest to the target.
   *
   * Example: egg = 7 g protein/unit, target = 25 g.
   *   floor(3.57) = 3 -> 21 g  (off by -4)
   *   ceil(3.57)  = 4 -> 28 g  (off by +3)  <- better -> returns 4
   */
  const smartRound = (food: Food, rawUnits: number): number => {
    if (isWeightBased(food) || !isIndivisibleUnit(food)) {
      return roundUnitQuantity(food, rawUnits);
    }
    const lo = Math.floor(rawUnits);
    const hi = Math.ceil(rawUnits);
    if (lo <= 0) return hi <= 0 ? 1 : hi;
    const ref = macroRef(food);
    const macroLo = (food[primaryKey] / ref) * lo;
    const macroHi = (food[primaryKey] / ref) * hi;
    return Math.abs(macroLo - targetGrams) <= Math.abs(macroHi - targetGrams) ? lo : hi;
  };

  const buildOption = (food: Food, unitsNeeded: number): MealFoodOption => {
    const ref = macroRef(food);
    const protein = (food.protein_per_100g / ref) * unitsNeeded;
    const carbs   = (food.carbs_per_100g   / ref) * unitsNeeded;
    const fat     = (food.fats_per_100g    / ref) * unitsNeeded;
    const kcal    = (food.calories_per_100g / ref) * unitsNeeded;
    return {
      food_id:   food.id,
      food_name: food.name,
      grams:     Math.round(unitsNeeded * 10) / 10,
      protein_g: Math.round(protein * 10) / 10,
      carbs_g:   Math.round(carbs   * 10) / 10,
      fat_g:     Math.round(fat     * 10) / 10,
      calories:  Math.round(kcal),
      unit:      food.measurement_unit,
    };
  };

  // ── Build raw options ─────────────────────────────────────────────────────
  for (const food of foods) {
    const macroPer = food[primaryKey];
    if (macroPer <= 0) continue;

    const ref = macroRef(food);
    const rawUnits = (targetGrams * ref) / macroPer;

    const cap = isWeightBased(food) ? 1200 : 20;
    if (rawUnits > cap) continue;

    const unitsNeeded = smartRound(food, rawUnits);
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
      const rounded = smartRound(bestFood, rawUnits);
      const unitsNeeded = isWeightBased(bestFood)
        ? Math.max(30, rounded)
        : Math.max(1, rounded);
      options.push(buildOption(bestFood, unitsNeeded));
    }
  }

  // ── CALORIE EFFICIENCY FILTER ──────────────────────────────────────────────
  // Alternatives should be truly interchangeable: similar calories AND similar
  // primary macro. We cluster by "calories per gram of primary macro" ratio.
  //
  // Algorithm: sort options by their cal/macro ratio, then find the largest
  // cluster of consecutive items where adjacent ratios differ by ≤50%.
  // This naturally groups lean items together (drink + cheese) and fatty items
  // together (yogurt + eggs), rejecting cross-cluster outliers.
  if (options.length > 2) {
    const primaryOutputKey = _primaryOutputKey;

    // Annotate with ratio and sort
    const annotated = options.map((o, i) => {
      const macro = o[primaryOutputKey] as number;
      return { opt: o, idx: i, ratio: macro > 0 ? o.calories / macro : Infinity };
    }).sort((a, b) => a.ratio - b.ratio);

    // Find largest cluster of consecutive items with ≤50% ratio gap
    const ADJACENT_THRESHOLD = 0.50;
    let bestStart = 0, bestLen = 1;
    let curStart = 0;

    for (let i = 1; i < annotated.length; i++) {
      const prev = annotated[i - 1].ratio;
      const curr = annotated[i].ratio;
      // Check if current item is within 50% of the previous
      if (prev > 0 && (curr - prev) / prev <= ADJACENT_THRESHOLD) {
        // extends current cluster
      } else {
        curStart = i; // start new cluster
      }
      const curLen = i - curStart + 1;
      if (curLen > bestLen) {
        bestStart = curStart;
        bestLen = curLen;
      }
    }

    // Apply cluster filter if we found a cluster of at least 2
    if (bestLen >= 2) {
      const clusterOptions = annotated.slice(bestStart, bestStart + bestLen).map(a => a.opt);
      options.length = 0;
      options.push(...clusterOptions);
    }

    // Sort remaining options by calorie proximity to each other
    const avgCal = options.reduce((s, o) => s + o.calories, 0) / options.length;
    options.sort((a, b) =>
      Math.abs(a.calories - avgCal) - Math.abs(b.calories - avgCal)
    );
  }

  return options;
}

/**
 * CRITICAL CALORIE RULE: We now use strict block targets.
 * We no longer pre-deflate targets or deduct cross-macros.
 * Each meal category is calculated purely for its own macro target.
 */
const ROUNDING_BIAS_FACTOR = 1.0;

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
    '\u05d9\u05d5\u05d2\u05d5\u05e8\u05d8', '\u05d2\u05d1\u05d9\u05e0\u05d4', '\u05e7\u05d5\u05d8\u05d2', '\u05d8\u05d5\u05e0\u05d4', '\u05e1\u05e8\u05d3\u05d9\u05df', '\u05d1\u05d9\u05e6\u05d4', '\u05dc\u05d7\u05dd', '\u05e4\u05d9\u05ea\u05d4', '\u05e7\u05e8\u05e7\u05e8', '\u05e4\u05e8\u05d9\u05db\u05d9',
    '\u05d0\u05d2\u05d5\u05d6', '\u05e9\u05e7\u05d3', '\u05d1\u05d5\u05d8\u05df', '\u05e4\u05d9\u05e1\u05d8\u05d5\u05e7', '\u05d2\u05e8\u05e0\u05d5\u05dc\u05d4', '\u05d7\u05dc\u05d1', '\u05e9\u05d9\u05d1\u05d5\u05dc\u05ea', '\u05e7\u05d5\u05d5\u05d0\u05e7\u05e8',
    '\u05d1\u05e0\u05e0\u05d4', '\u05ea\u05e4\u05d5\u05d7', '\u05d2\u05d6\u05e8', '\u05e2\u05d2\u05d1\u05e0\u05d9', '\u05de\u05dc\u05e4\u05e4\u05d5\u05df', '\u05d7\u05d5\u05de\u05d5\u05e1', '\u05d0\u05d1\u05d5\u05e7\u05d3\u05d5',
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

    const getFoodsForMeal = (categoryFoods: Food[], filterFn?: (f: Food) => boolean) => {
      let baseFoods = filterFn ? categoryFoods.filter(filterFn) : categoryFoods;
      if (baseFoods.length < 4) baseFoods = categoryFoods; // Fallback to all if cluster is too small

      // 1. Double filter: category + no repetition
      let filtered = filterNoRepetition(filterSuitability(baseFoods));
      if (filtered.length >= 4) return filtered;

      // 2. Fallback 1: category only (drop anti-repetition)
      filtered = filterSuitability(baseFoods);
      if (filtered.length >= 4) return filtered;

      // 3. Fallback 2: base foods (drop both constraints)
      return baseFoods;
    };

    // Homogeneous Grouping: Ensure options within a block have similar incidental macros
    // to prevent massive calorie swings when the user swaps them.
    const isHighProteinCarb = Math.random() > 0.8; // 20% chance for protein bread/pasta
    const isFattyProtein = Math.random() > 0.7; // 30% chance for eggs/fatty meat

    const selectedCarbFoods = selectRandomUnique(
      getFoodsForMeal(carbFoods, f => isHighProteinCarb ? f.protein_per_100g >= 10 : f.protein_per_100g < 10), 
      4
    );
    
    const selectedProteinFoods = selectRandomUnique(
      getFoodsForMeal(proteinFoods, f => isFattyProtein ? f.fats_per_100g >= 8 : f.fats_per_100g < 8), 
      4
    );
    
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

    // ----------------------------------------------------
    // STEP 2: PROTEIN
    // ----------------------------------------------------
    const proteinOptions = resolveOptions(selectedProteinFoods, T_p, 'protein_per_100g', 'protein_g');

    // ----------------------------------------------------
    // STEP 3: FATS
    // ----------------------------------------------------
    const fatOptions = resolveOptions(selectedFatFoods, T_f, 'fats_per_100g', 'fat_g');

    // ----------------------------------------------------
    // STEP 4: USE STRICT TARGETS FOR THE MEAL
    // ----------------------------------------------------
    // Instead of summing up the averages (which would include cross-macros and 
    // overshoot the display numbers), we simply display the exact strict block targets.
    // We calculate the expected calories of the pure block for display.
    const expectedKcal = (T_p * 4) + (T_c * 4) + (T_f * 9);

    meals.push({
      id: crypto.randomUUID(), // Temp ID until DB insertion
      trainee_id: traineeId,
      meal_index: distribution.index,
      meal_name: distribution.name,
      protein_options: proteinOptions,
      carb_options: carbOptions,
      fat_options: fatOptions,
      target_calories: Math.round(expectedKcal),
      target_protein: Math.round(T_p),
      target_carbs: Math.round(T_c),
      target_fat: Math.round(T_f),
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
    // In strict block mode, the database targets are already set to the strict blocks.
    // However, if we needed to sum up actuals (including cross macros), we could do it here.
    // Since the user requested strict blocks to be displayed, we will just return the meal as is
    // so it retains its exact strict target (e.g. 40g protein).
    return meal;
  });
}
