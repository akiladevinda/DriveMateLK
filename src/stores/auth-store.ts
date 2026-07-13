import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import * as authService from '@/services/auth-service';
import * as profileService from '@/services/profile-service';
import type { Profile } from '@/types/database';

type AuthStoreState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessionResult = await Promise.race([
        authService.getSession(),
        new Promise<Awaited<ReturnType<typeof authService.getSession>>>((resolve) => {
          setTimeout(
            () =>
              resolve({
                data: null,
                error: { message: 'Auth initialization timed out', code: 'timeout' },
              }),
            8000,
          );
        }),
      ]);

      if (sessionResult.error && sessionResult.error.code !== 'timeout') {
        set({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
          error: sessionResult.error.message,
        });
        return;
      }

      const session = sessionResult.data;
      const user = session?.user ?? null;

      if (!user) {
        set({
          session: null,
          user: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
          error: sessionResult.error?.code === 'timeout' ? sessionResult.error.message : null,
        });
        return;
      }

      const profileResult = await profileService.ensureProfile(user.id, {
        email: user.email,
        fullName:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
      });
      set({
        session,
        user,
        profile: profileResult.data,
        isLoading: false,
        isInitialized: true,
        error: profileResult.error?.code === 'not_found' ? null : profileResult.error?.message ?? null,
      });
    } catch (error) {
      set({
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'Failed to initialize auth',
      });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const result = await authService.signIn(email, password);
    if (result.error || !result.data) {
      set({ isLoading: false, error: result.error?.message ?? 'Sign in failed' });
      return false;
    }

    const profileResult = await profileService.ensureProfile(result.data.user.id, {
      email: result.data.user.email,
      fullName:
        (result.data.user.user_metadata?.full_name as string | undefined) ??
        (result.data.user.user_metadata?.name as string | undefined) ??
        null,
    });
    set({
      session: result.data.session,
      user: result.data.user,
      profile: profileResult.data,
      isLoading: false,
      error: profileResult.error?.message ?? null,
    });
    return true;
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    const result = await authService.signUp(email, password, fullName);
    if (result.error || !result.data) {
      set({ isLoading: false, error: result.error?.message ?? 'Sign up failed' });
      return false;
    }

    const profileResult = await profileService.ensureProfile(result.data.user.id, {
      email: result.data.user.email ?? email,
      fullName,
    });
    set({
      session: result.data.session,
      user: result.data.user,
      profile: profileResult.data,
      isLoading: false,
      error: profileResult.error?.message ?? null,
    });
    return true;
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    await authService.signOut();
    set({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      error: null,
    });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) {
      return;
    }
    const profileResult = await profileService.ensureProfile(user.id, {
      email: user.email,
      fullName:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
    });
    set({
      profile: profileResult.data,
      error: profileResult.error?.message ?? null,
    });
  },

  clearError: () => set({ error: null }),
}));
