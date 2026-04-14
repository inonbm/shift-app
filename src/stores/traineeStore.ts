import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { TraineeWithData, TraineeData, CreateTraineeInput } from '../types';

interface TraineeState {
  /** List of trainees managed by the current trainer */
  trainees: TraineeWithData[];

  /** Currently viewed trainee (for detail page) */
  currentTrainee: TraineeWithData | null;

  isLoading: boolean;
  error: string | null;

  /** Trainer: fetch all managed trainees */
  fetchTrainees: () => Promise<void>;

  /** Trainer: Create a trainee (Auth + Profile + Data) */
  createTrainee: (input: CreateTraineeInput) => Promise<void>;

  /** Trainee: fetch own profile + data */
  fetchMyData: () => Promise<void>;

  /** Trainer: fetch a specific trainee by ID */
  fetchTraineeById: (id: string) => Promise<void>;

  /** Trainer: update trainee data (physical measurements + calculated macros) */
  updateTraineeData: (id: string, data: Partial<TraineeData>) => Promise<void>;

  /** Clear error */
  clearError: () => void;
}

export const useTraineeStore = create<TraineeState>((set, get) => ({
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

  createTrainee: async (input: CreateTraineeInput) => {
    try {
      set({ isLoading: true, error: null });

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      // 1. Create a secondary Supabase client that doesn't persist sessions
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      // 2. Sign up the new user
      const { data: authData, error: authError } = await authClient.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.full_name,
            role: 'trainee'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user account');

      const traineeId = authData.user.id;

      // The database trigger will auto-create the profile. We need to update it
      // using the primary client (as the Trainer).
      
      // Since triggers might take a few milliseconds, wait a bit or just retry
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ trainer_id: currentUser.id })
        .eq('id', traineeId);

      if (profileUpdateError) throw profileUpdateError;

      // 3. Insert the physical data via primary client
      const traineeData: Partial<TraineeData> = {
        id: traineeId,
        gender: input.gender,
        age: input.age,
        weight_kg: input.weight_kg,
        height_cm: input.height_cm,
        activity_level: input.activity_level,
        goal: input.goal,
      };

      const { error: dataError } = await supabase
        .from('trainee_data')
        .upsert({ ...traineeData, updated_at: new Date().toISOString() });

      if (dataError) throw dataError;

      // 4. Refresh trainee list
      await get().fetchTrainees();
    } catch (error) {
      console.error('Failed to create trainee:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create trainee',
      });
      throw error; // Re-throw to be handled by UI
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
