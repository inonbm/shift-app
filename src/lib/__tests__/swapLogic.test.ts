import { describe, it, expect } from 'vitest';
import { computeSwapCandidate } from '../nutrition';
import type { Food } from '../../types';

describe('computeSwapCandidate', () => {
  const rice: Food = {
    id: '1',
    name: 'Rice',
    primary_category: 'carb',
    measurement_unit: 'g',
    serving_size: 100,
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbs_per_100g: 28,
    fats_per_100g: 0.3,
    created_by: 'test',
    created_at: 'now'
  };

  const eggs: Food = {
    id: '2',
    name: 'Eggs',
    primary_category: 'protein',
    measurement_unit: 'unit',
    serving_size: 1, // 1 egg
    calories_per_100g: 70, // per egg
    protein_per_100g: 6,
    carbs_per_100g: 0,
    fats_per_100g: 5,
    created_by: 'test',
    created_at: 'now'
  };

  const oil: Food = {
    id: '3',
    name: 'Olive Oil',
    primary_category: 'fat',
    measurement_unit: 'ml',
    serving_size: 10,
    calories_per_100g: 80, // per 10ml
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fats_per_100g: 9,
    created_by: 'test',
    created_at: 'now'
  };

  it('should calculate swap for weight-based foods correctly', () => {
    // We want 56g of carbs from rice. Rice has 28g per 100g. 
    // We expect 200g of rice.
    const candidate = computeSwapCandidate(rice, 56, 'carbs_per_100g');
    expect(candidate).not.toBeNull();
    expect(candidate?.quantity).toBe(200);
    expect(candidate?.carbs_g).toBe(56);
  });

  it('should calculate swap for unit-based foods correctly', () => {
    // We want 18g of protein from eggs. Eggs have 6g per unit.
    // We expect 3 eggs.
    const candidate = computeSwapCandidate(eggs, 18, 'protein_per_100g');
    expect(candidate).not.toBeNull();
    expect(candidate?.quantity).toBe(3);
    expect(candidate?.protein_g).toBe(18);
  });

  it('should round unit-based foods to nearest whole number', () => {
    // We want 20g of protein. 20 / 6 = 3.33 -> rounds to 3.
    const candidate = computeSwapCandidate(eggs, 20, 'protein_per_100g');
    expect(candidate).not.toBeNull();
    expect(candidate?.quantity).toBe(3);
    expect(candidate?.protein_g).toBe(18); // 3 * 6
  });

  it('should round weight-based fats to nearest 5', () => {
    // We want 12g of fat. Oil has 9g per 10ml.
    // (12 * 10) / 9 = 13.33 -> rounds to 13 (since it's < 20, it uses nearest whole number)
    const candidate = computeSwapCandidate(oil, 12, 'fats_per_100g');
    expect(candidate).not.toBeNull();
    expect(candidate?.quantity).toBe(13);
  });

  it('should round larger weight-based fats to nearest 5', () => {
    // Want 25g of fat. Oil has 9g per 10ml.
    // (25 * 10) / 9 = 27.77 -> rounds to 30 (nearest 5)
    const candidate = computeSwapCandidate(oil, 25, 'fats_per_100g');
    expect(candidate).not.toBeNull();
    expect(candidate?.quantity).toBe(30);
  });

  it('should apply caps and return null if exceeded', () => {
    // Want 1000g of carbs from rice -> (1000 * 100) / 28 = 3571g.
    // Max cap is 600g. Should return null.
    const candidate = computeSwapCandidate(rice, 1000, 'carbs_per_100g');
    expect(candidate).toBeNull();
  });

  it('should return null if macroPer is zero', () => {
    // Want 10g of carbs from eggs. Eggs have 0g carbs.
    const candidate = computeSwapCandidate(eggs, 10, 'carbs_per_100g');
    expect(candidate).toBeNull();
  });
});
