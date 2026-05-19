import type { Dispatch, SetStateAction, ChangeEvent } from 'react';
import type { GeneratedMeal, MealFoodOption } from '../../../types';

export type Tab = 'overview' | 'diet' | 'workouts' | 'nutrition_log';

export type MealCategory = 'protein_options' | 'carb_options' | 'fat_options';

export interface MealEdit {
  meal_name: string;
  protein_options: MealFoodOption[];
  carb_options: MealFoodOption[];
  fat_options: MealFoodOption[];
  target_calories?: number;
  target_protein?: number;
  target_carbs?: number;
  target_fat?: number;
}

export type AddForms = Record<string, Record<string, { foodId: string; grams: number }>>;
export type FoodSearch = Record<string, Record<string, string>>;
export type ExerciseForm = { exercise_name: string; target_sets: number; target_reps: number };

export type InputOrSelectChangeHandler = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
export type CheckboxChangeHandler = (e: ChangeEvent<HTMLInputElement>) => void;

export type SetState<T> = Dispatch<SetStateAction<T>>;
export type Meals = GeneratedMeal[];
