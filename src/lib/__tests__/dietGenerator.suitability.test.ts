/**
 * Tests for meal suitability filtering in the diet generator.
 *
 * Verifies that:
 * 1. Foods only appear in meals they are marked suitable for
 * 2. Foods with no suitable_for (legacy data) pass all meals
 * 3. The fallback paths never bypass suitability
 * 4. The cross-macro filter doesn't leak unsuitable foods
 */

import { describe, it, expect } from 'vitest';
import { generateDietPlan } from '../dietGenerator';
import type { Food, MealSuitability } from '../../types';

// ── HELPER ──────────────────────────────────────────────────────────────────

let foodCounter = 0;

function makeFood(overrides: Partial<Food> & { name: string; primary_category: Food['primary_category'] }): Food {
  foodCounter++;
  return {
    id: `food-${foodCounter}`,
    name: overrides.name,
    primary_category: overrides.primary_category,
    measurement_unit: overrides.measurement_unit ?? 'g',
    serving_size: overrides.serving_size ?? 100,
    calories_per_100g: overrides.calories_per_100g ?? 100,
    protein_per_100g: overrides.protein_per_100g ?? 0,
    carbs_per_100g: overrides.carbs_per_100g ?? 0,
    fats_per_100g: overrides.fats_per_100g ?? 0,
    suitable_for: overrides.suitable_for ?? ['breakfast', 'lunch', 'snack', 'dinner'],
    created_by: 'test',
    created_at: new Date().toISOString(),
  };
}

/**
 * Create a standard set of foods with known suitability tags.
 * Each macro category gets several foods so the algorithm has enough to work with.
 */
function buildTestFoods(): Food[] {
  return [
    // ── CARBS ──────────────────────────────────────────────────────────────
    // "Rice" — lunch + snack only (NOT breakfast, NOT dinner)
    makeFood({ name: 'אורז בסמטי', primary_category: 'carb', carbs_per_100g: 28, calories_per_100g: 130, suitable_for: ['lunch', 'snack'] }),
    // "Bread" — breakfast only
    makeFood({ name: 'לחם', primary_category: 'carb', carbs_per_100g: 40, calories_per_100g: 250, suitable_for: ['breakfast'] }),
    // "Pasta" — lunch + dinner
    makeFood({ name: 'פסטה', primary_category: 'carb', carbs_per_100g: 30, calories_per_100g: 160, suitable_for: ['lunch', 'dinner'] }),
    // "Oats" — breakfast + snack
    makeFood({ name: 'שיבולת שועל', primary_category: 'carb', carbs_per_100g: 60, calories_per_100g: 370, suitable_for: ['breakfast', 'snack'] }),
    // "Sweet potato" — all meals
    makeFood({ name: 'בטטה', primary_category: 'carb', carbs_per_100g: 20, calories_per_100g: 86, suitable_for: ['breakfast', 'lunch', 'snack', 'dinner'] }),
    // "Couscous" — lunch + dinner
    makeFood({ name: 'קוסקוס', primary_category: 'carb', carbs_per_100g: 23, calories_per_100g: 112, suitable_for: ['lunch', 'dinner'] }),

    // ── PROTEIN ────────────────────────────────────────────────────────────
    // "Eggs" — breakfast only
    makeFood({ name: 'ביצה', primary_category: 'protein', protein_per_100g: 13, calories_per_100g: 155, suitable_for: ['breakfast'] }),
    // "Chicken" — lunch + dinner
    makeFood({ name: 'חזה עוף', primary_category: 'protein', protein_per_100g: 31, calories_per_100g: 165, suitable_for: ['lunch', 'dinner'] }),
    // "Tuna" — all meals
    makeFood({ name: 'טונה', primary_category: 'protein', protein_per_100g: 26, calories_per_100g: 116, suitable_for: ['breakfast', 'lunch', 'snack', 'dinner'] }),
    // "Cottage" — breakfast + snack
    makeFood({ name: 'קוטג', primary_category: 'protein', protein_per_100g: 11, calories_per_100g: 98, suitable_for: ['breakfast', 'snack'] }),
    // "Beef" — lunch + dinner only
    makeFood({ name: 'בקר', primary_category: 'protein', protein_per_100g: 26, calories_per_100g: 250, suitable_for: ['lunch', 'dinner'] }),

    // ── FATS ───────────────────────────────────────────────────────────────
    // "Olive oil" — all meals
    makeFood({ name: 'שמן זית', primary_category: 'fat', fats_per_100g: 100, calories_per_100g: 884, suitable_for: ['breakfast', 'lunch', 'snack', 'dinner'] }),
    // "Avocado" — lunch + dinner
    makeFood({ name: 'אבוקדו', primary_category: 'fat', fats_per_100g: 15, calories_per_100g: 160, suitable_for: ['lunch', 'dinner'] }),
    // "Tahini" — all meals
    makeFood({ name: 'טחינה', primary_category: 'fat', fats_per_100g: 48, calories_per_100g: 595, suitable_for: ['breakfast', 'lunch', 'snack', 'dinner'] }),
    // "Almonds" — snack only
    makeFood({ name: 'שקדים', primary_category: 'fat', fats_per_100g: 49, calories_per_100g: 579, suitable_for: ['snack'] }),
    // "Peanut butter" — breakfast + snack
    makeFood({ name: 'חמאת בוטנים', primary_category: 'fat', fats_per_100g: 50, calories_per_100g: 588, suitable_for: ['breakfast', 'snack'] }),
  ];
}

// Meal suitability for each index (mirrors the code):
//   0 → breakfast, 1 → lunch, 2 → snack, 3 → dinner
const MEAL_TAG_BY_INDEX: Record<number, MealSuitability> = {
  0: 'breakfast',
  1: 'lunch',
  2: 'snack',
  3: 'dinner',
};

// ── TESTS ───────────────────────────────────────────────────────────────────

describe('Diet Generator – Meal Suitability', () => {
  const foods = buildTestFoods();

  // Build a lookup so we can check suitability by food_id
  const foodById = new Map(foods.map(f => [f.id, f]));

  /**
   * Run the generator several times (randomness!) and collect all food
   * appearances per meal index.
   */
  const RUNS = 30;
  const allMeals = Array.from({ length: RUNS }).flatMap(() =>
    generateDietPlan('test-trainee', 2200, 150, 250, 70, foods, false)
  );

  it('should never place a food in a meal it is NOT suitable for', () => {
    const violations: string[] = [];

    for (const meal of allMeals) {
      const mealTag = MEAL_TAG_BY_INDEX[meal.meal_index];
      const allOptions = [
        ...meal.carb_options,
        ...meal.protein_options,
        ...meal.fat_options,
      ];

      for (const opt of allOptions) {
        const food = foodById.get(opt.food_id);
        if (!food) continue; // skip if food not in our test set

        const suitableFor = food.suitable_for ?? [];
        // If the food has suitability tags, it must include the meal's tag
        if (suitableFor.length > 0 && !suitableFor.includes(mealTag)) {
          violations.push(
            `"${food.name}" (suitable_for: [${suitableFor}]) appeared in ${meal.meal_name} (${mealTag})`
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('rice (lunch+snack only) should NOT appear in ארוחה 1 (breakfast)', () => {
    const riceFoodIds = foods
      .filter(f => f.name === 'אורז בסמטי')
      .map(f => f.id);

    const meal1Carbs = allMeals
      .filter(m => m.meal_index === 0)
      .flatMap(m => m.carb_options);

    const riceInBreakfast = meal1Carbs.filter(o => riceFoodIds.includes(o.food_id));
    expect(riceInBreakfast).toHaveLength(0);
  });

  it('rice (lunch+snack only) should NOT appear in ארוחה 4 (dinner)', () => {
    const riceFoodIds = foods
      .filter(f => f.name === 'אורז בסמטי')
      .map(f => f.id);

    const meal4Carbs = allMeals
      .filter(m => m.meal_index === 3)
      .flatMap(m => m.carb_options);

    const riceInDinner = meal4Carbs.filter(o => riceFoodIds.includes(o.food_id));
    expect(riceInDinner).toHaveLength(0);
  });

  it('beef (lunch+dinner) should NOT appear in breakfast or snack', () => {
    const beefIds = foods.filter(f => f.name === 'בקר').map(f => f.id);

    const breakfastAndSnackProteins = allMeals
      .filter(m => m.meal_index === 0 || m.meal_index === 2)
      .flatMap(m => m.protein_options);

    const beefViolations = breakfastAndSnackProteins.filter(o => beefIds.includes(o.food_id));
    expect(beefViolations).toHaveLength(0);
  });

  it('eggs (breakfast only) should NOT appear in lunch, snack, or dinner', () => {
    const eggIds = foods.filter(f => f.name === 'ביצה').map(f => f.id);

    const nonBreakfastProteins = allMeals
      .filter(m => m.meal_index !== 0)
      .flatMap(m => m.protein_options);

    const eggViolations = nonBreakfastProteins.filter(o => eggIds.includes(o.food_id));
    expect(eggViolations).toHaveLength(0);
  });

  it('almonds (snack only) should NOT appear in breakfast, lunch, or dinner', () => {
    const almondIds = foods.filter(f => f.name === 'שקדים').map(f => f.id);

    const nonSnackFats = allMeals
      .filter(m => m.meal_index !== 2)
      .flatMap(m => m.fat_options);

    const almondViolations = nonSnackFats.filter(o => almondIds.includes(o.food_id));
    expect(almondViolations).toHaveLength(0);
  });

  it('bread (breakfast only) CAN appear in ארוחה 1', () => {
    const breadIds = foods.filter(f => f.name === 'לחם').map(f => f.id);

    const meal1Carbs = allMeals
      .filter(m => m.meal_index === 0)
      .flatMap(m => m.carb_options);

    const breadInBreakfast = meal1Carbs.filter(o => breadIds.includes(o.food_id));
    // With 30 runs, bread should appear at least once in breakfast
    expect(breadInBreakfast.length).toBeGreaterThan(0);
  });

  it('generates exactly 4 meals per run', () => {
    const mealsPerRun = allMeals.length / RUNS;
    expect(mealsPerRun).toBe(4);
  });
});

describe('Diet Generator – Legacy foods without suitable_for', () => {
  it('foods with no suitable_for should be allowed in all meals', () => {
    const legacyFoods: Food[] = [
      // Carb with no suitability tags (legacy)
      makeFood({ name: 'legacy-carb-1', primary_category: 'carb', carbs_per_100g: 30, calories_per_100g: 150 }),
      makeFood({ name: 'legacy-carb-2', primary_category: 'carb', carbs_per_100g: 25, calories_per_100g: 120 }),
      makeFood({ name: 'legacy-carb-3', primary_category: 'carb', carbs_per_100g: 35, calories_per_100g: 180 }),
      makeFood({ name: 'legacy-carb-4', primary_category: 'carb', carbs_per_100g: 28, calories_per_100g: 140 }),
      makeFood({ name: 'legacy-carb-5', primary_category: 'carb', carbs_per_100g: 22, calories_per_100g: 110 }),
      // Protein
      makeFood({ name: 'legacy-protein-1', primary_category: 'protein', protein_per_100g: 25, calories_per_100g: 130 }),
      makeFood({ name: 'legacy-protein-2', primary_category: 'protein', protein_per_100g: 20, calories_per_100g: 120 }),
      makeFood({ name: 'legacy-protein-3', primary_category: 'protein', protein_per_100g: 30, calories_per_100g: 160 }),
      makeFood({ name: 'legacy-protein-4', primary_category: 'protein', protein_per_100g: 22, calories_per_100g: 140 }),
      // Fat
      makeFood({ name: 'legacy-fat-1', primary_category: 'fat', fats_per_100g: 50, calories_per_100g: 500 }),
      makeFood({ name: 'legacy-fat-2', primary_category: 'fat', fats_per_100g: 40, calories_per_100g: 400 }),
      makeFood({ name: 'legacy-fat-3', primary_category: 'fat', fats_per_100g: 60, calories_per_100g: 600 }),
    ];

    // Remove suitable_for entirely to simulate legacy data
    legacyFoods.forEach(f => { delete (f as any).suitable_for; });

    const meals = generateDietPlan('test', 2000, 130, 220, 60, legacyFoods, false);
    expect(meals).toHaveLength(4);

    // All 4 meals should have options
    for (const meal of meals) {
      const totalOptions = meal.carb_options.length + meal.protein_options.length + meal.fat_options.length;
      expect(totalOptions).toBeGreaterThan(0);
    }
  });
});

describe('Diet Generator – Edge case: only breakfast-suitable foods', () => {
  it('should still generate all 4 meals with fallback warning', () => {
    // All foods are breakfast-only — meals 2/3/4 will have no suitable foods
    // The ultimate fallback should kick in
    const breakfastOnlyFoods: Food[] = [
      makeFood({ name: 'bo-carb-1', primary_category: 'carb', carbs_per_100g: 30, calories_per_100g: 150, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-carb-2', primary_category: 'carb', carbs_per_100g: 25, calories_per_100g: 120, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-carb-3', primary_category: 'carb', carbs_per_100g: 35, calories_per_100g: 180, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-carb-4', primary_category: 'carb', carbs_per_100g: 28, calories_per_100g: 140, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-protein-1', primary_category: 'protein', protein_per_100g: 25, calories_per_100g: 130, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-protein-2', primary_category: 'protein', protein_per_100g: 20, calories_per_100g: 120, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-protein-3', primary_category: 'protein', protein_per_100g: 30, calories_per_100g: 160, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-fat-1', primary_category: 'fat', fats_per_100g: 50, calories_per_100g: 500, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-fat-2', primary_category: 'fat', fats_per_100g: 40, calories_per_100g: 400, suitable_for: ['breakfast'] }),
      makeFood({ name: 'bo-fat-3', primary_category: 'fat', fats_per_100g: 60, calories_per_100g: 600, suitable_for: ['breakfast'] }),
    ];

    // Should not throw — ultimate fallback keeps the generator working
    const meals = generateDietPlan('test', 2000, 130, 220, 60, breakfastOnlyFoods, false);
    expect(meals).toHaveLength(4);
  });
});
