import type { Food, GeneratedMeal, MealFoodOption, MealSuitability } from '../types';
import { MEAL_DISTRIBUTION } from '../types';

const MEAL_SUITABILITY_MAP: Record<number, MealSuitability[]> = {
  0: ['breakfast'],
  1: ['lunch'],
  2: ['snack'],
  3: ['dinner']
};

function selectRandomUnique<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const WEIGHT_BASED_UNITS: ReadonlySet<string> = new Set(['g', 'ml']);
const isWeightBased = (food: Food) => WEIGHT_BASED_UNITS.has(food.measurement_unit);

const macroRef = (food: Food): number =>
  food.serving_size > 0 ? food.serving_size : (isWeightBased(food) ? 100 : 1);

const INDIVISIBLE_KW = [
  '\u05d1\u05d9\u05e6\u05d4', '\u05d1\u05d9\u05e6\u05d9\u05dd', '\u05d9\u05d5\u05d2\u05d5\u05e8\u05d8', '\u05de\u05e9\u05e7\u05d4',
  '\u05d1\u05e7\u05d1\u05d5\u05e7', '\u05de\u05e2\u05d3\u05df', '\u05e9\u05d9\u05d9\u05e7', '\u05d2\u05d1\u05d9\u05e2',
  '\u05d0\u05de\u05e4\u05d5\u05dc\u05d4', '\u05e9\u05e7\u05d9\u05ea',
];
const DIVISIBLE_KW = [
  '\u05e4\u05e8\u05d5\u05e1\u05d4', '\u05e4\u05e8\u05d5\u05e1\u05ea', '\u05e4\u05d9\u05ea\u05d4', '\u05e4\u05d9\u05d5\u05ea',
  '\u05d8\u05d5\u05e8\u05d8\u05d9\u05d4', '\u05d8\u05d5\u05e8\u05d8\u05d9\u05d9\u05d4',
  '\u05dc\u05d7\u05de\u05e0\u05d9\u05d4', '\u05dc\u05d7\u05de\u05e0\u05d9\u05d5\u05ea',
  '\u05e7\u05e8\u05d5\u05d0\u05e1\u05d5\u05df', '\u05d5\u05d0\u05e4\u05dc',
];

const isIndivisibleUnit = (food: Food): boolean => {
  if (isWeightBased(food)) return false;
  const n = food.name;
  if (DIVISIBLE_KW.some(kw => n.includes(kw))) return false;
  if (INDIVISIBLE_KW.some(kw => n.includes(kw))) return true;
  return true;
};

const roundUnitQuantity = (food: Food, rawUnits: number): number => {
  if (!isWeightBased(food)) {
    return isIndivisibleUnit(food)
      ? Math.round(rawUnits)
      : Math.round(rawUnits * 2) / 2;
  }
  if (rawUnits < 20) return Math.round(rawUnits);
  if (food.primary_category === 'fat') return Math.round(rawUnits / 5) * 5;
  return Math.round(rawUnits / 10) * 10;
};

/** Smart rounding: for indivisible items, picks floor vs ceil closest to target. */
const smartRound = (
  food: Food, rawUnits: number,
  primaryKey: 'carbs_per_100g' | 'protein_per_100g' | 'fats_per_100g',
  targetGrams: number
): number => {
  if (isWeightBased(food) || !isIndivisibleUnit(food)) {
    return roundUnitQuantity(food, rawUnits);
  }
  const lo = Math.floor(rawUnits), hi = Math.ceil(rawUnits);
  if (lo <= 0) return hi <= 0 ? 1 : hi;
  const ref = macroRef(food);
  const mLo = (food[primaryKey] / ref) * lo;
  const mHi = (food[primaryKey] / ref) * hi;
  return Math.abs(mLo - targetGrams) <= Math.abs(mHi - targetGrams) ? lo : hi;
};

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-MACRO CONTAMINATION FILTER
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Removes foods whose incidental (secondary) macros would "contaminate" the
 * meal when eaten at the quantity needed to hit the primary macro target.
 *
 * Example: 4 whole eggs for 28g protein bring 20g fat — if the meal's fat
 * target is only 15g, the eggs alone overshoot it. We exclude such foods
 * from the dynamic swap block.
 *
 * Threshold: incidental macro must stay below 50% of the meal's target for
 * that macro. Falls back gracefully — if all foods would be excluded, we
 * keep the ones with the lowest contamination.
 */
function filterCrossMacro(
  foods: Food[],
  primaryTarget: number,
  primaryKey: 'carbs_per_100g' | 'protein_per_100g' | 'fats_per_100g',
  mealProtein: number,
  mealCarbs: number,
  mealFat: number
): Food[] {
  const MAX_CROSS = 0.50; // incidental macro must be < 50% of its meal target

  const score = (food: Food): number => {
    const macro = food[primaryKey];
    if (macro <= 0) return Infinity;
    const ref = macroRef(food);
    const units = (primaryTarget * ref) / macro;
    // Calculate incidental macros at the required quantity
    const prot = (food.protein_per_100g / ref) * units;
    const carbs = (food.carbs_per_100g / ref) * units;
    const fat = (food.fats_per_100g / ref) * units;
    // Max ratio of any incidental macro vs its meal target
    let maxRatio = 0;
    if (primaryKey !== 'protein_per_100g' && mealProtein > 0) maxRatio = Math.max(maxRatio, prot / mealProtein);
    if (primaryKey !== 'carbs_per_100g' && mealCarbs > 0) maxRatio = Math.max(maxRatio, carbs / mealCarbs);
    if (primaryKey !== 'fats_per_100g' && mealFat > 0) maxRatio = Math.max(maxRatio, fat / mealFat);
    return maxRatio;
  };

  const scored = foods.map(f => ({ food: f, contamination: score(f) }));
  const clean = scored.filter(s => s.contamination <= MAX_CROSS);

  // Fallback: if all foods fail, keep the 4 least-contaminating ones
  if (clean.length === 0) {
    scored.sort((a, b) => a.contamination - b.contamination);
    return scored.slice(0, 4).map(s => s.food);
  }
  return clean.map(s => s.food);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOLVE OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Portion caps — prevents absurd quantities like 16 egg whites or 470g cheese. */
const MAX_UNIT_ITEMS = 6;    // max units for unit-based foods
const MAX_WEIGHT_G = 500;    // max grams for weight-based foods
const MAX_OPTION_KCAL = 450; // max calories for a single food option

function resolveOptions(
  foods: Food[],
  targetGrams: number,
  primaryKey: 'carbs_per_100g' | 'protein_per_100g' | 'fats_per_100g',
  _primaryOutputKey: 'carbs_g' | 'protein_g' | 'fat_g'
): MealFoodOption[] {
  void _primaryOutputKey;
  const options: MealFoodOption[] = [];
  if (targetGrams <= 1) return options;

  const buildOption = (food: Food, unitsNeeded: number): MealFoodOption => {
    const ref = macroRef(food);
    const protein = (food.protein_per_100g / ref) * unitsNeeded;
    const carbs = (food.carbs_per_100g / ref) * unitsNeeded;
    const fat = (food.fats_per_100g / ref) * unitsNeeded;
    const kcal = (food.calories_per_100g / ref) * unitsNeeded;
    return {
      food_id: food.id,
      food_name: food.name,
      grams: Math.round(unitsNeeded * 10) / 10,
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
      calories: Math.round(kcal),
      unit: food.measurement_unit,
    };
  };

  for (const food of foods) {
    const macroPer = food[primaryKey];
    if (macroPer <= 0) continue;

    const ref = macroRef(food);
    const rawUnits = (targetGrams * ref) / macroPer;

    // ── PORTION CAPS ──────────────────────────────────────────────────────
    const unitCap = isWeightBased(food) ? MAX_WEIGHT_G : MAX_UNIT_ITEMS;
    if (rawUnits > unitCap) continue;

    const unitsNeeded = smartRound(food, rawUnits, primaryKey, targetGrams);
    if (unitsNeeded <= 0) continue;

    // Calorie cap — no single option should be a full meal's worth of kcal
    const optionKcal = (food.calories_per_100g / ref) * unitsNeeded;
    if (optionKcal > MAX_OPTION_KCAL) continue;

    options.push(buildOption(food, unitsNeeded));
  }

  // ── FALLBACK: guarantee at least one item ──────────────────────────────
  if (options.length === 0 && foods.length > 0) {
    const bestFood = foods
      .filter(f => f[primaryKey] > 0)
      .sort((a, b) => b[primaryKey] - a[primaryKey])[0];
    if (bestFood) {
      const ref = macroRef(bestFood);
      const rawUnits = (targetGrams * ref) / bestFood[primaryKey];
      const rounded = smartRound(bestFood, rawUnits, primaryKey, targetGrams);
      const unitsNeeded = isWeightBased(bestFood)
        ? Math.max(30, Math.min(rounded, MAX_WEIGHT_G))
        : Math.max(1, Math.min(rounded, MAX_UNIT_ITEMS));
      options.push(buildOption(bestFood, unitsNeeded));
    }
  }

  // ── CALORIE EFFICIENCY CLUSTERING ──────────────────────────────────────
  if (options.length > 2) {
    const pok = _primaryOutputKey;
    const annotated = options.map((o, i) => {
      const macro = o[pok] as number;
      return { opt: o, idx: i, ratio: macro > 0 ? o.calories / macro : Infinity };
    }).sort((a, b) => a.ratio - b.ratio);

    const TH = 0.50;
    let bestStart = 0, bestLen = 1, curStart = 0;
    for (let i = 1; i < annotated.length; i++) {
      const prev = annotated[i - 1].ratio;
      const curr = annotated[i].ratio;
      if (prev > 0 && (curr - prev) / prev <= TH) { /* extends */ } else { curStart = i; }
      if (i - curStart + 1 > bestLen) { bestStart = curStart; bestLen = i - curStart + 1; }
    }

    if (bestLen >= 2) {
      const cluster = annotated.slice(bestStart, bestStart + bestLen).map(a => a.opt);
      options.length = 0;
      options.push(...cluster);
    }

    const avgCal = options.reduce((s, o) => s + o.calories, 0) / options.length;
    options.sort((a, b) => Math.abs(a.calories - avgCal) - Math.abs(b.calories - avgCal));
  }

  return options;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIET PLAN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

const ROUNDING_BIAS_FACTOR = 1.0;

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
    const T_c = dailyCarbs * p * ROUNDING_BIAS_FACTOR;
    const T_p = dailyProtein * p * ROUNDING_BIAS_FACTOR;
    const T_f = dailyFat * p * ROUNDING_BIAS_FACTOR;

    // ── SUITABILITY FILTER (NEVER DROPPED) ────────────────────────────────
    const allowedTags = MEAL_SUITABILITY_MAP[distribution.index] || [];
    const filterSuitability = (foods: Food[]) => foods.filter(f =>
      !f.suitable_for || f.suitable_for.length === 0 || f.suitable_for.some(tag => allowedTags.includes(tag))
    );

    const filterNoRepetition = (foods: Food[]) => foods.filter(f => !previousMealFoodIds.includes(f.id));

    /**
     * Progressive fallback — suitability is NEVER dropped (fixes beef/wings
     * in breakfast bug). Only anti-repetition and homogeneous grouping are
     * dropped as fallbacks.
     */
    const getFoodsForMeal = (categoryFoods: Food[], filterFn?: (f: Food) => boolean) => {
      // Start with suitability-filtered pool (mandatory)
      const suitable = filterSuitability(categoryFoods);

      // Apply homogeneous grouping if available
      let baseFoods = filterFn ? suitable.filter(filterFn) : suitable;
      if (baseFoods.length < 4) baseFoods = suitable; // drop grouping, keep suitability

      // 1. Best: suitability + grouping + no-repetition
      let filtered = filterNoRepetition(baseFoods);
      if (filtered.length >= 4) return filtered;

      // 2. Fallback: suitability + grouping (drop anti-repetition)
      if (baseFoods.length >= 2) return baseFoods;

      // 3. Fallback: suitability only (drop grouping + anti-repetition)
      if (suitable.length >= 1) return suitable;

      // 4. Ultimate fallback: all foods in category (only when NO foods
      //    are marked suitable for this meal — log a warning so trainers
      //    know they should fix their food tags).
      console.warn(
        `[dietGenerator] No foods marked suitable for meal tags [${allowedTags}] ` +
        `in category with ${categoryFoods.length} items — falling back to all.`
      );
      return categoryFoods;
    };

    // ── CROSS-MACRO CONTAMINATION PRE-FILTER ──────────────────────────────
    // Apply suitability FIRST, then remove foods whose incidental macros
    // would wreck the meal balance. This ensures unsuitable foods never
    // enter the pool via the cross-macro fallback path.
    const suitableCarbFoods = filterSuitability(carbFoods);
    const suitableProteinFoods = filterSuitability(proteinFoods);
    const suitableFatFoods = filterSuitability(fatFoods);

    const cleanCarbFoods = filterCrossMacro(suitableCarbFoods, T_c, 'carbs_per_100g', T_p, T_c, T_f);
    const cleanProteinFoods = filterCrossMacro(suitableProteinFoods, T_p, 'protein_per_100g', T_p, T_c, T_f);
    const cleanFatFoods = filterCrossMacro(suitableFatFoods, T_f, 'fats_per_100g', T_p, T_c, T_f);

    const selectedCarbFoods = selectRandomUnique(getFoodsForMeal(cleanCarbFoods), 4);
    const selectedProteinFoods = selectRandomUnique(getFoodsForMeal(cleanProteinFoods), 4);
    const selectedFatFoods = selectRandomUnique(getFoodsForMeal(cleanFatFoods), 4);

    previousMealFoodIds = [
      ...selectedCarbFoods.map(f => f.id),
      ...selectedProteinFoods.map(f => f.id),
      ...selectedFatFoods.map(f => f.id)
    ];

    const carbOptions = resolveOptions(selectedCarbFoods, T_c, 'carbs_per_100g', 'carbs_g');
    const proteinOptions = resolveOptions(selectedProteinFoods, T_p, 'protein_per_100g', 'protein_g');
    const fatOptions = resolveOptions(selectedFatFoods, T_f, 'fats_per_100g', 'fat_g');

    const expectedKcal = (T_p * 4) + (T_c * 4) + (T_f * 9);

    meals.push({
      id: crypto.randomUUID(),
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
  return meals.map(meal => meal);
}
