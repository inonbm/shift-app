import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Food, CreateFoodInput } from '../types';

interface FoodState {
  foods: Food[];
  isLoading: boolean;
  error: string | null;

  /** Fetch all foods from the database */
  fetchFoods: () => Promise<void>;

  /** Trainer: create a new food entry */
  createFood: (input: CreateFoodInput) => Promise<void>;

  /** Trainer: update an existing food entry */
  updateFood: (id: string, input: Partial<CreateFoodInput>) => Promise<void>;

  /** Trainer: delete a food entry */
  deleteFood: (id: string) => Promise<void>;

  /** Clear error */
  clearError: () => void;
}

export const useFoodStore = create<FoodState>((set, get) => ({
  foods: [],
  isLoading: false,
  error: null,

  fetchFoods: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('primary_category')
        .order('name');

      if (error) throw error;

      set({ foods: (data || []) as Food[], isLoading: false });
    } catch (error) {
      console.error('Failed to fetch foods:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch foods',
      });
    }
  },

  createFood: async (input: CreateFoodInput) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('foods')
        .insert({ ...input, created_by: user.id });

      if (error) throw error;

      // Refresh the foods list
      await get().fetchFoods();
    } catch (error) {
      console.error('Failed to create food:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create food',
      });
    }
  },

  updateFood: async (id: string, input: Partial<CreateFoodInput>) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('foods')
        .update(input)
        .eq('id', id);

      if (error) throw error;

      await get().fetchFoods();
    } catch (error) {
      console.error('Failed to update food:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update food',
      });
    }
  },

  deleteFood: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchFoods();
    } catch (error) {
      console.error('Failed to delete food:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete food',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
