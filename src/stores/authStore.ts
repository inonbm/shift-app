import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  /** Check for existing session and load profile on app startup */
  initialize: () => Promise<void>;

  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<void>;

  /** Sign out and clear state */
  signOut: () => Promise<void>;

  /** Clear error message */
  clearError: () => void;

  /** Check if current user is a trainer */
  isTrainer: () => boolean;

  /** Check if current user is a trainee */
  isTrainee: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.user) {
        set({ user: null, profile: null, isLoading: false });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      set({
        user: session.user,
        profile: profile as Profile,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth initialization failed:', error);
      set({
        user: null,
        profile: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize auth',
      });
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data.user) {
        throw new Error('Sign in succeeded but no user was returned');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      set({
        user: data.user,
        profile: profile as Profile,
        isLoading: false,
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
      });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      set({ user: null, profile: null, isLoading: false });
    } catch (error) {
      console.error('Sign out failed:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      });
    }
  },

  clearError: () => set({ error: null }),

  isTrainer: () => get().profile?.role === 'trainer',

  isTrainee: () => get().profile?.role === 'trainee',
}));
