/**
 * Tests for recalculateDietTotals — ensures meal macro totals are
 * correctly recomputed from the representative (first) food option
 * in each category when menu items are edited.
 */

import { describe, it, expect } from 'vitest';
import { recalculateDietTotals } from '../dietGenerator';
import type { MealFoodOption } from '../../types';

// ── HELPERS ─────────────────────────────────────────────────────────────────

function makeOption(overrides: Partial<MealFoodOption> & { food_name: string }): MealFoodOption {
  return {
    food_id: overrides.food_id ?? crypto.randomUUID(),
    food_name: overrides.food_name,
    grams: overrides.grams ?? 100,
    protein_g: overrides.protein_g ?? 0,
    carbs_g: overrides.carbs_g ?? 0,
    fat_g: overrides.fat_g ?? 0,
    calories: overrides.calories ?? 0,
  };
}

function makeMeal(overrides: {
  protein_options?: MealFoodOption[];
  carb_options?: MealFoodOption[];
  fat_options?: MealFoodOption[];
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
}) {
  return {
    protein_options: overrides.protein_options ?? [],
    carb_options: overrides.carb_options ?? [],
    fat_options: overrides.fat_options ?? [],
    target_calories: overrides.target_calories ?? 0,
    target_protein: overrides.target_protein ?? 0,
    target_carbs: overrides.target_carbs ?? 0,
    target_fat: overrides.target_fat ?? 0,
  };
}

// ── TESTS ───────────────────────────────────────────────────────────────────

describe('recalculateDietTotals', () => {
  it('should compute totals from the first item of each category', () => {
    const meal = makeMeal({
      protein_options: [
        makeOption({ food_name: 'Chicken', protein_g: 30, carbs_g: 0, fat_g: 3, calories: 165 }),
        makeOption({ food_name: 'Tuna', protein_g: 26, carbs_g: 0, fat_g: 1, calories: 116 }),
      ],
      carb_options: [
        makeOption({ food_name: 'Rice', protein_g: 3, carbs_g: 45, fat_g: 0.5, calories: 200 }),
      ],
      fat_options: [
        makeOption({ food_name: 'Olive oil', protein_g: 0, carbs_g: 0, fat_g: 8, calories: 72 }),
      ],
      // Stale values that should be replaced
      target_calories: 999,
      target_protein: 999,
      target_carbs: 999,
      target_fat: 999,
    });

    const [result] = recalculateDietTotals([meal]);

    // Expected: chicken (index 0) + rice (index 0) + olive oil (index 0)
    expect(result.target_protein).toBe(Math.round(30 + 3 + 0));   // 33
    expect(result.target_carbs).toBe(Math.round(0 + 45 + 0));     // 45
    expect(result.target_fat).toBe(Math.round(3 + 0.5 + 8));      // 12 (rounds 11.5 → 12)
    expect(result.target_calories).toBe(Math.round(165 + 200 + 72)); // 437
  });

  it('should handle empty categories gracefully', () => {
    const meal = makeMeal({
      protein_options: [
        makeOption({ food_name: 'Chicken', protein_g: 25, carbs_g: 0, fat_g: 2, calories: 140 }),
      ],
      carb_options: [],
      fat_options: [],
      target_calories: 500,
    });

    const [result] = recalculateDietTotals([meal]);

    expect(result.target_protein).toBe(25);
    expect(result.target_carbs).toBe(0);
    expect(result.target_fat).toBe(2);
    expect(result.target_calories).toBe(140);
  });

  it('should handle fully empty meal (no options at all)', () => {
    const meal = makeMeal({
      protein_options: [],
      carb_options: [],
      fat_options: [],
      target_calories: 999,
    });

    const [result] = recalculateDietTotals([meal]);

    expect(result.target_protein).toBe(0);
    expect(result.target_carbs).toBe(0);
    expect(result.target_fat).toBe(0);
    expect(result.target_calories).toBe(0);
  });

  it('should recalculate multiple meals independently', () => {
    const meal1 = makeMeal({
      protein_options: [makeOption({ food_name: 'Eggs', protein_g: 13, carbs_g: 1, fat_g: 10, calories: 155 })],
      carb_options: [makeOption({ food_name: 'Bread', protein_g: 4, carbs_g: 20, fat_g: 1, calories: 120 })],
      fat_options: [makeOption({ food_name: 'Butter', protein_g: 0, carbs_g: 0, fat_g: 12, calories: 108 })],
    });

    const meal2 = makeMeal({
      protein_options: [makeOption({ food_name: 'Beef', protein_g: 40, carbs_g: 0, fat_g: 15, calories: 300 })],
      carb_options: [makeOption({ food_name: 'Potato', protein_g: 2, carbs_g: 30, fat_g: 0, calories: 130 })],
      fat_options: [makeOption({ food_name: 'Avocado', protein_g: 1, carbs_g: 3, fat_g: 10, calories: 100 })],
    });

    const [r1, r2] = recalculateDietTotals([meal1, meal2]);

    // Meal 1: eggs + bread + butter
    expect(r1.target_protein).toBe(Math.round(13 + 4 + 0));
    expect(r1.target_carbs).toBe(Math.round(1 + 20 + 0));
    expect(r1.target_fat).toBe(Math.round(10 + 1 + 12));
    expect(r1.target_calories).toBe(Math.round(155 + 120 + 108));

    // Meal 2: beef + potato + avocado
    expect(r2.target_protein).toBe(Math.round(40 + 2 + 1));
    expect(r2.target_carbs).toBe(Math.round(0 + 30 + 3));
    expect(r2.target_fat).toBe(Math.round(15 + 0 + 10));
    expect(r2.target_calories).toBe(Math.round(300 + 130 + 100));
  });

  it('should preserve other meal properties (no data loss)', () => {
    const meal = {
      ...makeMeal({
        protein_options: [makeOption({ food_name: 'X', protein_g: 10, carbs_g: 1, fat_g: 2, calories: 50 })],
        carb_options: [makeOption({ food_name: 'Y', protein_g: 1, carbs_g: 20, fat_g: 0, calories: 80 })],
        fat_options: [makeOption({ food_name: 'Z', protein_g: 0, carbs_g: 0, fat_g: 5, calories: 45 })],
      }),
      meal_name: 'ארוחה 1',
      id: 'meal-123',
      extra_custom_field: 'should survive',
    };

    const [result] = recalculateDietTotals([meal]);

    expect(result.meal_name).toBe('ארוחה 1');
    expect(result.id).toBe('meal-123');
    expect(result.extra_custom_field).toBe('should survive');

    // Food options themselves should be unchanged
    expect(result.protein_options).toEqual(meal.protein_options);
    expect(result.carb_options).toEqual(meal.carb_options);
    expect(result.fat_options).toEqual(meal.fat_options);
  });

  it('should use only [0] from each category (not sum all alternatives)', () => {
    const meal = makeMeal({
      protein_options: [
        makeOption({ food_name: 'Chicken', protein_g: 30, carbs_g: 0, fat_g: 3, calories: 165 }),
        makeOption({ food_name: 'Tuna', protein_g: 50, carbs_g: 0, fat_g: 1, calories: 300 }),
        makeOption({ food_name: 'Beef', protein_g: 40, carbs_g: 0, fat_g: 15, calories: 250 }),
      ],
      carb_options: [
        makeOption({ food_name: 'Rice', protein_g: 3, carbs_g: 45, fat_g: 0, calories: 200 }),
        makeOption({ food_name: 'Pasta', protein_g: 5, carbs_g: 60, fat_g: 1, calories: 280 }),
      ],
      fat_options: [
        makeOption({ food_name: 'Olive oil', protein_g: 0, carbs_g: 0, fat_g: 8, calories: 72 }),
        makeOption({ food_name: 'Avocado', protein_g: 2, carbs_g: 4, fat_g: 15, calories: 160 }),
      ],
    });

    const [result] = recalculateDietTotals([meal]);

    // Must use ONLY index [0]: Chicken + Rice + Olive oil
    // If it were summing all, protein would be 30+50+40+3+5+0+2 = 130
    expect(result.target_protein).toBe(Math.round(30 + 3 + 0)); // 33, not 130
    expect(result.target_carbs).toBe(Math.round(0 + 45 + 0));   // 45, not 109
    expect(result.target_fat).toBe(Math.round(3 + 0 + 8));      // 11, not 43
    expect(result.target_calories).toBe(Math.round(165 + 200 + 72)); // 437, not 1427
  });

  it('should update totals when quantity changes (simulated edit)', () => {
    // Before edit: 1.5 tortillas
    const mealBefore = makeMeal({
      carb_options: [
        makeOption({ food_name: 'Tortilla', grams: 1.5, protein_g: 6, carbs_g: 30, fat_g: 3, calories: 180 }),
      ],
      protein_options: [
        makeOption({ food_name: 'Cottage', protein_g: 11, carbs_g: 3, fat_g: 2, calories: 98 }),
      ],
      fat_options: [
        makeOption({ food_name: 'Olive oil', protein_g: 0, carbs_g: 0, fat_g: 8, calories: 72 }),
      ],
      target_calories: 350,
      target_carbs: 33,
    });

    const [before] = recalculateDietTotals([mealBefore]);
    expect(before.target_carbs).toBe(Math.round(30 + 3 + 0)); // 33
    expect(before.target_calories).toBe(Math.round(180 + 98 + 72)); // 350

    // After edit: 5 tortillas (amounts doubled+ on carb item)
    const mealAfter = makeMeal({
      carb_options: [
        makeOption({ food_name: 'Tortilla', grams: 5, protein_g: 20, carbs_g: 100, fat_g: 10, calories: 600 }),
      ],
      protein_options: [
        makeOption({ food_name: 'Cottage', protein_g: 11, carbs_g: 3, fat_g: 2, calories: 98 }),
      ],
      fat_options: [
        makeOption({ food_name: 'Olive oil', protein_g: 0, carbs_g: 0, fat_g: 8, calories: 72 }),
      ],
      target_calories: 350, // stale value
      target_carbs: 33,     // stale value
    });

    const [after] = recalculateDietTotals([mealAfter]);
    expect(after.target_carbs).toBe(Math.round(100 + 3 + 0)); // 103, NOT the stale 33
    expect(after.target_calories).toBe(Math.round(600 + 98 + 72)); // 770, NOT the stale 350
  });
});
