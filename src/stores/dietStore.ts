import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { GeneratedMeal } from '../types';

interface DietState {
  /** The 4 generated meals for the current trainee */
  meals: GeneratedMeal[];
  isLoading: boolean;
  error: string | null;

  /** Load cached diet from database */
  fetchDiet: (traineeId: string) => Promise<void>;

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
