import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { DailyTracking, FreeEntry, MealFoodOption, MealSelections, MealItemSelection } from '../types';

type CategoryKey = 'carb' | 'protein' | 'fat';

interface TrackingState {
  todaysTracking: DailyTracking | null;
  isLoading: boolean;
  error: string | null;
  
  fetchTodaysTracking: (traineeId: string) => Promise<void>;
  toggleMealCompletion: (traineeId: string, mealId: string) => Promise<void>;
  toggleItemSelection: (traineeId: string, mealId: string, category: CategoryKey, item: MealFoodOption) => Promise<void>;
  addFreeEntry: (traineeId: string, entry: Omit<FreeEntry, 'id'>) => Promise<void>;
  removeFreeEntry: (traineeId: string, entryId: string) => Promise<void>;
  fetchTrackingForDate: (traineeId: string, date: string) => Promise<DailyTracking | null>;
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  todaysTracking: null,
  isLoading: false,
  error: null,

  fetchTodaysTracking: async (traineeId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('trainee_id', traineeId)
        .eq('date', today)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Ensure meal_selections is always an object
      if (data && !data.meal_selections) {
        data.meal_selections = {};
      }
      
      set({ todaysTracking: data || null, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch today tracking:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  fetchTrackingForDate: async (traineeId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_tracking')
        .select('*')
        .eq('trainee_id', traineeId)
        .eq('date', date)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Ensure meal_selections is always an object
      if (data && !data.meal_selections) {
        data.meal_selections = {};
      }
      
      return data || null;
    } catch (error: any) {
      console.error('Failed to fetch tracking for date:', error);
      return null;
    }
  },

  toggleItemSelection: async (traineeId: string, mealId: string, category: CategoryKey, item: MealFoodOption) => {
    try {
      set({ isLoading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      const currentTracking = get().todaysTracking;
      
      // Build current meal_selections
      const currentSelections: MealSelections = currentTracking?.meal_selections 
        ? { ...currentTracking.meal_selections } 
        : {};
      
      // Get current meal's selections
      const mealSel = currentSelections[mealId] 
        ? { ...currentSelections[mealId] } 
        : {};
      
      // Toggle: if same food_id is already selected, deselect it; otherwise select the new one
      if (mealSel[category]?.food_id === item.food_id) {
        mealSel[category] = null;
      } else {
        const selectionItem: MealItemSelection = {
          food_id: item.food_id,
          food_name: item.food_name,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          grams: item.grams,
        };
        mealSel[category] = selectionItem;
      }
      
      currentSelections[mealId] = mealSel;
      
      // Check if all 3 categories are now selected → auto-complete the meal
      let completedMeals = currentTracking 
        ? [...currentTracking.completed_meals] 
        : [];
      
      const allSelected = Boolean(mealSel.carb) && Boolean(mealSel.protein) && Boolean(mealSel.fat);
      const isAlreadyCompleted = completedMeals.includes(mealId);
      
      if (allSelected && !isAlreadyCompleted) {
        completedMeals.push(mealId);
      } else if (!allSelected && isAlreadyCompleted) {
        // A category was deselected → remove from completed
        completedMeals = completedMeals.filter(id => id !== mealId);
      }
      
      // Upsert
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          trainee_id: traineeId,
          date: today,
          completed_meals: completedMeals,
          meal_selections: currentSelections,
          free_entries: currentTracking?.free_entries || []
        }, { onConflict: 'trainee_id,date' })
        .select()
        .single();
        
      if (error) throw error;
      
      set({ todaysTracking: data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to toggle item selection:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  toggleMealCompletion: async (traineeId: string, mealId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      const currentTracking = get().todaysTracking;
      
      let newMeals: string[] = [];
      let newSelections: MealSelections = currentTracking?.meal_selections 
        ? { ...currentTracking.meal_selections } 
        : {};
      
      if (currentTracking) {
        if (currentTracking.completed_meals.includes(mealId)) {
          // Uncompleting: remove from completed_meals AND clear selections
          newMeals = currentTracking.completed_meals.filter(id => id !== mealId);
          delete newSelections[mealId];
        } else {
          // Completing: add to completed_meals, keep existing selections
          newMeals = [...currentTracking.completed_meals, mealId];
        }
      } else {
        newMeals = [mealId];
      }
      
      // Upsert
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          trainee_id: traineeId,
          date: today,
          completed_meals: newMeals,
          meal_selections: newSelections,
          free_entries: currentTracking ? currentTracking.free_entries : []
        }, { onConflict: 'trainee_id,date' })
        .select()
        .single();
        
      if (error) throw error;
      
      set({ todaysTracking: data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to toggle meal:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  addFreeEntry: async (traineeId: string, entry: Omit<FreeEntry, 'id'>) => {
    try {
      set({ isLoading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      const currentTracking = get().todaysTracking;
      
      const newEntry: FreeEntry = {
        ...entry,
        id: crypto.randomUUID()
      };
      
      const newFreeEntries = currentTracking 
        ? [...currentTracking.free_entries, newEntry]
        : [newEntry];
        
      const completedMeals = currentTracking ? currentTracking.completed_meals : [];
      const mealSelections = currentTracking?.meal_selections || {};
      
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          trainee_id: traineeId,
          date: today,
          completed_meals: completedMeals,
          meal_selections: mealSelections,
          free_entries: newFreeEntries
        }, { onConflict: 'trainee_id,date' })
        .select()
        .single();
        
      if (error) throw error;
      set({ todaysTracking: data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to add free entry:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  removeFreeEntry: async (traineeId: string, entryId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      const currentTracking = get().todaysTracking;
      
      if (!currentTracking) return;
      
      const newFreeEntries = currentTracking.free_entries.filter(e => e.id !== entryId);
      
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          trainee_id: traineeId,
          date: today,
          completed_meals: currentTracking.completed_meals,
          meal_selections: currentTracking.meal_selections || {},
          free_entries: newFreeEntries
        }, { onConflict: 'trainee_id,date' })
        .select()
        .single();
        
      if (error) throw error;
      set({ todaysTracking: data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to remove free entry:', error);
      set({ isLoading: false, error: error.message });
    }
  }
}));
