import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
  TemplateExercise,
  WorkoutSession,
  WorkoutSessionWithSets,
  SessionSet,
  CreateTemplateInput,
  LogSessionInput,
} from '../types';

interface WorkoutState {
  templates: WorkoutTemplateWithExercises[];
  sessions: WorkoutSessionWithSets[];
  isLoading: boolean;
  error: string | null;

  // --- Trainer Actions ---

  /** Fetch workout templates (optionally filtered by trainee) */
  fetchTemplates: (traineeId?: string) => Promise<void>;

  /** Create a new workout template with exercises */
  createTemplate: (input: CreateTemplateInput) => Promise<void>;

  /** Delete a workout template */
  deleteTemplate: (id: string) => Promise<void>;

  // --- Trainee Actions ---

  /** Fetch workout sessions for the current trainee */
  fetchSessions: () => Promise<void>;

  /** Log a new workout session */
  logSession: (input: LogSessionInput) => Promise<void>;

  /** Clear error */
  clearError: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  templates: [],
  sessions: [],
  isLoading: false,
  error: null,

  fetchTemplates: async (traineeId?: string) => {
    try {
      set({ isLoading: true, error: null });

      let query = supabase.from('workout_templates').select('*');
      if (traineeId) {
        query = query.eq('trainee_id', traineeId);
      }

      const { data: templates, error: templatesError } = await query.order('created_at', { ascending: false });
      if (templatesError) throw templatesError;

      // Fetch exercises for all templates
      const templateIds = (templates || []).map((t: WorkoutTemplate) => t.id);
      const { data: exercises, error: exercisesError } = await supabase
        .from('template_exercises')
        .select('*')
        .in('template_id', templateIds)
        .order('order_index');

      if (exercisesError) throw exercisesError;

      // Group exercises by template
      const exerciseMap = new Map<string, TemplateExercise[]>();
      for (const ex of (exercises || []) as TemplateExercise[]) {
        const existing = exerciseMap.get(ex.template_id) || [];
        existing.push(ex);
        exerciseMap.set(ex.template_id, existing);
      }

      const templatesWithExercises: WorkoutTemplateWithExercises[] =
        (templates || []).map((t: WorkoutTemplate) => ({
          ...t,
          exercises: exerciseMap.get(t.id) || [],
        }));

      set({ templates: templatesWithExercises, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch templates',
      });
    }
  },

  createTemplate: async (input: CreateTemplateInput) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert template
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .insert({
          name: input.name,
          trainer_id: user.id,
          trainee_id: input.trainee_id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert exercises
      const exercisesToInsert = input.exercises.map((ex) => ({
        ...ex,
        template_id: template.id,
      }));

      const { error: exercisesError } = await supabase
        .from('template_exercises')
        .insert(exercisesToInsert);

      if (exercisesError) throw exercisesError;

      // Refresh templates
      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      });
    }
  },

  deleteTemplate: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await get().fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to delete template',
      });
    }
  },

  fetchSessions: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('trainee_id', user.id)
        .order('performed_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch sets for all sessions
      const sessionIds = (sessions || []).map((s: WorkoutSession) => s.id);
      const { data: sets, error: setsError } = await supabase
        .from('session_sets')
        .select('*')
        .in('session_id', sessionIds)
        .order('set_number');

      if (setsError) throw setsError;

      // Group sets by session
      const setMap = new Map<string, SessionSet[]>();
      for (const s of (sets || []) as SessionSet[]) {
        const existing = setMap.get(s.session_id) || [];
        existing.push(s);
        setMap.set(s.session_id, existing);
      }

      const sessionsWithSets: WorkoutSessionWithSets[] =
        (sessions || []).map((s: WorkoutSession) => ({
          ...s,
          sets: setMap.get(s.id) || [],
        }));

      set({ sessions: sessionsWithSets, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
      });
    }
  },

  logSession: async (input: LogSessionInput) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert session
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          trainee_id: user.id,
          template_id: input.template_id,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Insert sets
      const setsToInsert = input.sets.map((s) => ({
        ...s,
        session_id: session.id,
      }));

      const { error: setsError } = await supabase
        .from('session_sets')
        .insert(setsToInsert);

      if (setsError) throw setsError;

      // Refresh sessions
      await get().fetchSessions();
    } catch (error) {
      console.error('Failed to log session:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to log session',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
