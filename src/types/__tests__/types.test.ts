import { describe, it, expect } from 'vitest';
import { normaliseSelectionArray, getMealDistribution } from '../index';
import type { MealItemSelection } from '../index';

describe('normaliseSelectionArray', () => {
  it('should return empty array for undefined or null', () => {
    expect(normaliseSelectionArray(undefined)).toEqual([]);
    // @ts-ignore
    expect(normaliseSelectionArray(null)).toEqual([]);
  });

  it('should return array if given a single object (legacy compatibility)', () => {
    const singleItem: MealItemSelection = {
      food_id: '1',
      food_name: 'Test Food',
      calories: 100,
      grams: 50,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 5
    };
    expect(normaliseSelectionArray(singleItem)).toEqual([singleItem]);
  });

  it('should return the same array if given an array', () => {
    const arr: MealItemSelection[] = [
      { food_id: '1', food_name: 'Food A', calories: 100, grams: 50, protein_g: 10, carbs_g: 10, fat_g: 5 },
      { food_id: '2', food_name: 'Food B', calories: 200, grams: 100, protein_g: 20, carbs_g: 20, fat_g: 10 }
    ];
    expect(normaliseSelectionArray(arr)).toEqual(arr);
  });
});

describe('getMealDistribution', () => {
  it('should distribute for 3 meals', () => {
    const distribution = getMealDistribution(3);
    expect(distribution).toHaveLength(3);
    const sum = distribution.reduce((acc, curr) => acc + curr.percentage, 0);
    expect(Math.round(sum * 100) / 100).toBe(1.0); // 100%
  });

  it('should distribute for 4 meals (default)', () => {
    const distribution = getMealDistribution(4);
    expect(distribution).toHaveLength(4);
    const sum = distribution.reduce((acc, curr) => acc + curr.percentage, 0);
    expect(Math.round(sum * 100) / 100).toBe(1.0); // 100%
  });

  it('should distribute for 5 meals', () => {
    const distribution = getMealDistribution(5);
    expect(distribution).toHaveLength(5);
    const sum = distribution.reduce((acc, curr) => acc + curr.percentage, 0);
    expect(Math.round(sum * 100) / 100).toBe(1.0); // 100%
  });

  it('should distribute for 6 meals', () => {
    const distribution = getMealDistribution(6);
    expect(distribution).toHaveLength(6);
    const sum = distribution.reduce((acc, curr) => acc + curr.percentage, 0);
    expect(Math.round(sum * 100) / 100).toBe(1.0); // 100%
  });

  it('should default to 4 meals if invalid number provided', () => {
    const distribution = getMealDistribution(10);
    expect(distribution).toHaveLength(4);
  });
});
