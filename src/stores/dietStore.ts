import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { GeneratedMeal } from '../types';
import { useTraineeStore } from './traineeStore';
import { useFoodStore } from './foodStore';
import { generateDietPlan } from '../lib/dietGenerator';

interface DietState {
  /** The 4 generated meals for the current trainee */
  meals: GeneratedMeal[];
  isLoading: boolean;
  error: string | null;

  /** Load cached diet from database */
  fetchDiet: (traineeId: string) => Promise<void>;

  /** Full algorithm: generate meals, save to DB, and update state */
  generateDiet: (traineeId: string) => Promise<void>;

  /** Save generated meals to database (replaces existing) */
  saveDiet: (traineeId: string, meals: GeneratedMeal[]) => Promise<void>;

  /** Clear current meals from state */
  clearDiet: () => void;

  /** Clear error */
  clearError: () => void;
}

export const useDietStore = create<DietState>((set) => ({
  meals: [],
  isLoading: false,
  error: null,

  fetchDiet: async (traineeId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('generated_meals')
        .select('*')
        .eq('trainee_id', traineeId)
        .order('meal_index');

      if (error) throw error;

      set({ meals: (data || []) as GeneratedMeal[], isLoading: false });
    } catch (error) {
      console.error('Failed to fetch diet:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch diet',
      });
    }
  },

  generateDiet: async (traineeId: string) => {
    try {
      set({ isLoading: true, error: null });

      // Ensure stores are populated
      await useTraineeStore.getState().fetchTraineeById(traineeId);
      const trainee = useTraineeStore.getState().currentTrainee;
      if (!trainee || !trainee.trainee_data) {
        throw new Error('Trainee data not found');
      }

      await useFoodStore.getState().fetchFoods();
      const foods = useFoodStore.getState().foods;
      if (!foods || foods.length === 0) {
        throw new Error('No foods found in database. Please add foods first.');
      }

      const { goal_calories, protein_grams, carbs_grams, fat_grams } = trainee.trainee_data;

      // 1. Generate the plan using the core algorithm
      const generatedMeals = generateDietPlan(
        traineeId,
        goal_calories,
        protein_grams,
        carbs_grams,
        fat_grams,
        foods
      );

      // Clean the temporary UUIDs before inserting into Supabase
      const mealsToInsert = generatedMeals.map(({ id, ...rest }) => rest);

      // 2. Clear old meals
      const { error: deleteError } = await supabase
        .from('generated_meals')
        .delete()
        .eq('trainee_id', traineeId);

      if (deleteError) throw deleteError;

      // 3. Save new meals
      const { data: savedMeals, error: insertError } = await supabase
        .from('generated_meals')
        .insert(mealsToInsert)
        .select('*');

      if (insertError) throw insertError;

      set({ meals: savedMeals as GeneratedMeal[], isLoading: false });
    } catch (error) {
      console.error('Failed to generate diet:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate diet',
      });
    }
  },

  saveDiet: async (traineeId: string, meals: GeneratedMeal[]) => {
    try {
      set({ isLoading: true, error: null });

      // Delete existing meals for this trainee
      const { error: deleteError } = await supabase
        .from('generated_meals')
        .delete()
        .eq('trainee_id', traineeId);

      if (deleteError) throw deleteError;

      // Insert new meals
      const { error: insertError } = await supabase
        .from('generated_meals')
        .insert(meals);

      if (insertError) throw insertError;

      set({ meals, isLoading: false });
    } catch (error) {
      console.error('Failed to save diet:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to save diet',
      });
    }
  },

  clearDiet: () => set({ meals: [] }),

  clearError: () => set({ error: null }),
}));
