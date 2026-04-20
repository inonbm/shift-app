import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Food } from '../types';

interface FoodState {
  foods: Food[];
  isLoading: boolean;
  error: string | null;
  
  fetchFoods: () => Promise<void>;
  createFood: (food: Omit<Food, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  updateFood: (id: string, updates: Partial<Food>) => Promise<void>;
  deleteFood: (id: string, createdBy: string, currentUserId: string, currentUserRole: string) => Promise<void>;
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
        .order('name');
        
      if (error) throw error;
      set({ foods: data || [], isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch foods:', error);
      set({ isLoading: false, error: error.message || 'שגיאה בשליפת מאכלים' });
    }
  },

  createFood: async (food) => {
    try {
      set({ isLoading: true, error: null });
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('foods')
        .insert({
          name: food.name,
          primary_category: food.primary_category,
          serving_size: food.serving_size,
          calories_per_100g: food.calories_per_100g,
          protein_per_100g: food.protein_per_100g,
          carbs_per_100g: food.carbs_per_100g,
          fats_per_100g: food.fats_per_100g,
          created_by: userData.user.id
        });

      if (error) throw error;
      await get().fetchFoods();
    } catch (error: any) {
      console.error('Failed to create food:', error);
      set({ isLoading: false, error: error.message || 'שגיאה ביצירת מאכל' });
      throw error;
    }
  },

  updateFood: async (id, updates) => {
    try {
      set({ isLoading: true, error: null });
      
      const { error } = await supabase
        .from('foods')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await get().fetchFoods();
    } catch (error: any) {
      console.error('Failed to update food:', error);
      set({ isLoading: false, error: error.message || 'שגיאה בעדכון מאכל' });
      throw error;
    }
  },

  deleteFood: async (id, createdBy, currentUserId, currentUserRole) => {
    try {
      set({ isLoading: true, error: null });
      
      if (currentUserRole !== 'admin' && createdBy !== currentUserId) {
        throw new Error('אינך מורשה למחוק מאכל זה. ניתן למחוק רק מאכלים שאתה יצרת.');
      }

      const { error } = await supabase
        .from('foods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      set(state => ({
        foods: state.foods.filter(f => f.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to delete food:', error);
      set({ isLoading: false, error: error.message || 'שגיאה במחיקת מאכל' });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));
