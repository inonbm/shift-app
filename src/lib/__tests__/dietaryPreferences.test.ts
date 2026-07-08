import { describe, it, expect } from 'vitest';
import { filterByPreferences } from '../dietGenerator';
import type { Food, DietaryPreference } from '../../types';

describe('filterByPreferences', () => {
  const chicken: Food = {
    id: '1', name: 'Chicken Breast', primary_category: 'protein', measurement_unit: 'g', serving_size: 100, calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fats_per_100g: 3.6, created_by: 'test', created_at: 'now',
    tags: ['meat', 'poultry']
  };

  const beef: Food = {
    id: '2', name: 'Beef Steak', primary_category: 'protein', measurement_unit: 'g', serving_size: 100, calories_per_100g: 250, protein_per_100g: 26, carbs_per_100g: 0, fats_per_100g: 15, created_by: 'test', created_at: 'now',
    tags: ['meat']
  };

  const salmon: Food = {
    id: '3', name: 'Salmon', primary_category: 'protein', measurement_unit: 'g', serving_size: 100, calories_per_100g: 208, protein_per_100g: 20, carbs_per_100g: 0, fats_per_100g: 13, created_by: 'test', created_at: 'now',
    tags: ['fish']
  };

  const eggs: Food = {
    id: '4', name: 'Eggs', primary_category: 'protein', measurement_unit: 'unit', serving_size: 1, calories_per_100g: 70, protein_per_100g: 6, carbs_per_100g: 0, fats_per_100g: 5, created_by: 'test', created_at: 'now',
    tags: ['eggs']
  };

  const cheese: Food = {
    id: '5', name: 'Cottage Cheese', primary_category: 'protein', measurement_unit: 'g', serving_size: 100, calories_per_100g: 98, protein_per_100g: 11, carbs_per_100g: 3, fats_per_100g: 4.3, created_by: 'test', created_at: 'now',
    tags: ['dairy']
  };

  const bread: Food = {
    id: '6', name: 'Wheat Bread', primary_category: 'carb', measurement_unit: 'slice', serving_size: 1, calories_per_100g: 80, protein_per_100g: 4, carbs_per_100g: 15, fats_per_100g: 1, created_by: 'test', created_at: 'now',
    tags: ['gluten']
  };

  const rice: Food = {
    id: '7', name: 'White Rice', primary_category: 'carb', measurement_unit: 'g', serving_size: 100, calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fats_per_100g: 0.3, created_by: 'test', created_at: 'now',
    tags: []
  };

  const allFoods = [chicken, beef, salmon, eggs, cheese, bread, rice];

  it('should return all foods if no preferences provided', () => {
    expect(filterByPreferences(allFoods, undefined)).toEqual(allFoods);
    expect(filterByPreferences(allFoods, [])).toEqual(allFoods);
  });

  it('should filter out meat/fish/poultry for vegetarian', () => {
    const prefs: DietaryPreference[] = ['vegetarian'];
    const filtered = filterByPreferences(allFoods, prefs);
    expect(filtered).not.toContain(chicken);
    expect(filtered).not.toContain(beef);
    expect(filtered).not.toContain(salmon);
    expect(filtered).toContain(eggs);
    expect(filtered).toContain(cheese);
    expect(filtered).toContain(bread);
    expect(filtered).toContain(rice);
  });

  it('should filter out meat/fish/poultry/dairy/eggs for vegan', () => {
    const prefs: DietaryPreference[] = ['vegan'];
    const filtered = filterByPreferences(allFoods, prefs);
    expect(filtered).not.toContain(chicken);
    expect(filtered).not.toContain(beef);
    expect(filtered).not.toContain(salmon);
    expect(filtered).not.toContain(eggs);
    expect(filtered).not.toContain(cheese);
    expect(filtered).toContain(bread);
    expect(filtered).toContain(rice);
  });

  it('should filter out dairy for lactose_free', () => {
    const prefs: DietaryPreference[] = ['lactose_free'];
    const filtered = filterByPreferences(allFoods, prefs);
    expect(filtered).toContain(chicken);
    expect(filtered).not.toContain(cheese);
    expect(filtered).toContain(eggs);
  });

  it('should filter out gluten for gluten_free', () => {
    const prefs: DietaryPreference[] = ['gluten_free'];
    const filtered = filterByPreferences(allFoods, prefs);
    expect(filtered).not.toContain(bread);
    expect(filtered).toContain(rice);
  });

  it('should handle multiple preferences (e.g. vegetarian + lactose_free)', () => {
    const prefs: DietaryPreference[] = ['vegetarian', 'lactose_free'];
    const filtered = filterByPreferences(allFoods, prefs);
    expect(filtered).not.toContain(chicken);
    expect(filtered).not.toContain(beef);
    expect(filtered).not.toContain(salmon);
    expect(filtered).not.toContain(cheese); // lactose
    expect(filtered).toContain(eggs);
    expect(filtered).toContain(rice);
  });
});
