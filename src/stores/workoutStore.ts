import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { 
  WorkoutTemplate, 
  TemplateExercise, 
  WorkoutSession, 
  SessionSet 
} from '../types';

export interface CreateTemplateInput {
  name: string;
  trainee_id: string;
  exercises: {
    exercise_name: string;
    target_sets: number;
    target_reps: number;
    order_index: number;
  }[];
}

export interface LogSessionInput {
  template_id: string;
  trainee_id: string;
  notes?: string;
  sets: {
    exercise_id: string;
    set_number: number;
    reps_done: number;
    weight_kg: number;
  }[];
}

interface WorkoutState {
  templates: (WorkoutTemplate & { exercises: TemplateExercise[] })[];
  sessions: (WorkoutSession & { sets: SessionSet[] })[];
  isLoading: boolean;
  error: string | null;

  fetchTemplates: () => Promise<void>;
  createTemplate: (input: CreateTemplateInput) => Promise<void>;
  
  fetchHistory: () => Promise<void>;
  logSession: (input: LogSessionInput) => Promise<void>;
  updateSession: (sessionId: string, input: { notes?: string; sets: LogSessionInput['sets'] }) => Promise<void>;
  
  deleteTemplate: (templateId: string) => Promise<void>;
  updateExercise: (exerciseId: string, updates: Partial<TemplateExercise>) => Promise<void>;
  addExerciseToTemplate: (templateId: string, exercise: Omit<TemplateExercise, 'id' | 'template_id'>) => Promise<void>;
  deleteExercise: (exerciseId: string) => Promise<void>;

  clearError: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  templates: [],
  sessions: [],
  isLoading: false,
  error: null,

  fetchTemplates: async () => {
    try {
      set({ isLoading: true, error: null });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workout_templates')
        .select(`
          *,
          exercises:template_exercises(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ templates: data || [], isLoading: false });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'שגיאה בטעינת תבניות אימון'
      });
    }
  },

  createTemplate: async (input: CreateTemplateInput) => {
    try {
      set({ isLoading: true, error: null });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Insert template
      const { data: templateData, error: templateError } = await supabase
        .from('workout_templates')
        .insert({
          name: input.name,
          trainer_id: user.id,
          trainee_id: input.trainee_id
        })
        .select('id')
        .single();

      if (templateError) throw templateError;
      if (!templateData) throw new Error('Failed to create template');

      // 2. Insert exercises
      const exercisesToInsert = input.exercises.map(ex => ({
        ...ex,
        template_id: templateData.id
      }));

      const { error: exerciseError } = await supabase
        .from('template_exercises')
        .insert(exercisesToInsert);

      if (exerciseError) throw exerciseError;

      // Ensure lists are updated
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'שגיאה בשמירת התבנית'
      });
      throw error;
    }
  },

  fetchHistory: async () => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          sets:session_sets(
            *,
            exercise:template_exercises(exercise_name)
          )
        `)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      set({ sessions: data || [], isLoading: false });
    } catch (error) {
      console.error('Failed to fetch history:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'שגיאה בטעינת היסטוריה'
      });
    }
  },

  logSession: async (input: LogSessionInput) => {
    try {
      set({ isLoading: true, error: null });

      // 1. Insert session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          trainee_id: input.trainee_id,
          template_id: input.template_id,
          notes: input.notes
        })
        .select('id')
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error('Failed to create session');

      // 2. Insert sets
      const setsToInsert = input.sets.map(set => ({
        ...set,
        session_id: sessionData.id
      }));

      const { error: setsError } = await supabase
        .from('session_sets')
        .insert(setsToInsert);

      if (setsError) throw setsError;

      // Update history list
      await get().fetchHistory();
    } catch (error) {
      console.error('Failed to log session:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'שגיאה בשמירת האימון'
      });
      throw error;
    }
  },

  updateSession: async (sessionId: string, input: { notes?: string; sets: LogSessionInput['sets'] }) => {
    try {
      set({ isLoading: true, error: null });

      // 1. Update session notes
      const { error: sessionError } = await supabase
        .from('workout_sessions')
        .update({ notes: input.notes })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // 2. Delete existing sets and re-insert
      const { error: deleteError } = await supabase
        .from('session_sets')
        .delete()
        .eq('session_id', sessionId);

      if (deleteError) throw deleteError;

      if (input.sets.length > 0) {
        const setsToInsert = input.sets.map(s => ({
          ...s,
          session_id: sessionId
        }));

        const { error: setsError } = await supabase
          .from('session_sets')
          .insert(setsToInsert);

        if (setsError) throw setsError;
      }

      await get().fetchHistory();
    } catch (error) {
      console.error('Failed to update session:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'שגיאה בעדכון האימון'
      });
      throw error;
    }
  },

  deleteTemplate: async (templateId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.from('workout_templates').delete().eq('id', templateId);
      if (error) throw error;
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'שגיאה במחיקת תבנית' });
      throw error;
    }
  },

  updateExercise: async (exerciseId: string, updates: Partial<TemplateExercise>) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.from('template_exercises').update(updates).eq('id', exerciseId);
      if (error) throw error;
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to update exercise:', error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'שגיאה בעדכון תרגיל' });
      throw error;
    }
  },

  addExerciseToTemplate: async (templateId: string, exercise: Omit<TemplateExercise, 'id' | 'template_id'>) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.from('template_exercises').insert({ ...exercise, template_id: templateId });
      if (error) throw error;
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to add exercise:', error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'שגיאה בהוספת תרגיל' });
      throw error;
    }
  },

  deleteExercise: async (exerciseId: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.from('template_exercises').delete().eq('id', exerciseId);
      if (error) throw error;
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      set({ isLoading: false, error: error instanceof Error ? error.message : 'שגיאה במחיקת תרגיל' });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));
