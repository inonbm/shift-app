import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { TraineeWithData, TraineeData } from '../types';

interface TraineeState {
  /** List of trainees managed by the current trainer */
  trainees: TraineeWithData[];

  /** Currently viewed trainee (for detail page) */
  currentTrainee: TraineeWithData | null;

  isLoading: boolean;
  error: string | null;

  /** Trainer: fetch all managed trainees */
  fetchTrainees: () => Promise<void>;

  /** Trainee: fetch own profile + data */
  fetchMyData: () => Promise<void>;

  /** Trainer: fetch a specific trainee by ID */
  fetchTraineeById: (id: string) => Promise<void>;

  /** Trainer: update trainee data (physical measurements + calculated macros) */
  updateTraineeData: (id: string, data: Partial<TraineeData>) => Promise<void>;

  /** Clear error */
  clearError: () => void;
}

export const useTraineeStore = create<TraineeState>((set) => ({
  trainees: [],
  currentTrainee: null,
  isLoading: false,
  error: null,

  fetchTrainees: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch trainee profiles managed by this trainer
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('trainer_id', user.id)
        .eq('role', 'trainee');

      if (profilesError) throw profilesError;

      // Fetch trainee data for each profile
      const traineeIds = (profiles || []).map((p) => p.id);
      const { data: traineeDataRows, error: dataError } = await supabase
        .from('trainee_data')
        .select('*')
        .in('id', traineeIds);

      if (dataError) throw dataError;

      // Merge profiles with their data
      const dataMap = new Map((traineeDataRows || []).map((d) => [d.id, d]));
      const trainees: TraineeWithData[] = (profiles || []).map((p) => ({
        ...p,
        trainee_data: (dataMap.get(p.id) as TraineeData) || null,
      }));

      set({ trainees, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch trainees:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trainees',
      });
    }
  },

  fetchMyData: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const { data: traineeData, error: dataError } = await supabase
        .from('trainee_data')
        .select('*')
        .eq('id', user.id)
        .single();

      // trainee_data may not exist yet — that's okay
      if (dataError && dataError.code !== 'PGRST116') {
        throw dataError;
      }

      const currentTrainee: TraineeWithData = {
        ...profile,
        trainee_data: (traineeData as TraineeData) || null,
      };

      set({ currentTrainee, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch own data:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      });
    }
  },

  fetchTraineeById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      const { data: traineeData, error: dataError } = await supabase
        .from('trainee_data')
        .select('*')
        .eq('id', id)
        .single();

      if (dataError && dataError.code !== 'PGRST116') {
        throw dataError;
      }

      const currentTrainee: TraineeWithData = {
        ...profile,
        trainee_data: (traineeData as TraineeData) || null,
      };

      set({ currentTrainee, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch trainee:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trainee',
      });
    }
  },

  updateTraineeData: async (id: string, data: Partial<TraineeData>) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase
        .from('trainee_data')
        .upsert({ id, ...data, updated_at: new Date().toISOString() });

      if (error) throw error;

      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to update trainee data:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to update trainee data',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
