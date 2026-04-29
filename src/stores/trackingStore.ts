import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { DailyTracking, FreeEntry } from '../types';

interface TrackingState {
  todaysTracking: DailyTracking | null;
  isLoading: boolean;
  error: string | null;
  
  fetchTodaysTracking: (traineeId: string) => Promise<void>;
  toggleMealCompletion: (traineeId: string, mealId: string) => Promise<void>;
  addFreeEntry: (traineeId: string, entry: Omit<FreeEntry, 'id'>) => Promise<void>;
  removeFreeEntry: (traineeId: string, entryId: string) => Promise<void>;
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
      
      set({ todaysTracking: data || null, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch today tracking:', error);
      set({ isLoading: false, error: error.message });
    }
  },

  toggleMealCompletion: async (traineeId: string, mealId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const today = new Date().toISOString().split('T')[0];
      const currentTracking = get().todaysTracking;
      
      let newMeals: string[] = [];
      if (currentTracking) {
        if (currentTracking.completed_meals.includes(mealId)) {
          newMeals = currentTracking.completed_meals.filter(id => id !== mealId);
        } else {
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
      
      const { data, error } = await supabase
        .from('daily_tracking')
        .upsert({
          trainee_id: traineeId,
          date: today,
          completed_meals: completedMeals,
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
