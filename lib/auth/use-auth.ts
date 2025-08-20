'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { AUTH_ERRORS } from '@/lib/auth/constants';
import type {
  AuthState,
  Profile,
  AuthResponse,
  MagicLinkOptions,
  OAuthOptions,
} from '@/lib/auth/types';

export function useAuth(): AuthState & {
  signInWithMagicLink: (options: MagicLinkOptions) => Promise<AuthResponse>;
  signUpWithMagicLink: (options: MagicLinkOptions) => Promise<AuthResponse>;
  signOut: () => Promise<AuthResponse>;
  updateProfile: (updates: Partial<Profile>) => Promise<AuthResponse>;
  updatePassword: (password: string) => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  refreshSession: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const supabase = useMemo(() => createClient(), []);

  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        updateState({ profile: data });
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    },
    [supabase, updateState]
  );

  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        updateState({
          user: session?.user ?? null,
          error: null,
        });

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } else {
        updateState({
          user: data.session?.user ?? null,
          error: null,
        });

        if (data.session?.user) {
          await fetchProfile(data.session.user.id);
        }
      }
    } catch (err) {
      console.error('Session refresh error:', err);
      updateState({ error: AUTH_ERRORS.SESSION_INIT_FAILED });
    }
  }, [supabase, updateState, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      await refreshSession();
      if (mounted) {
        updateState({ loading: false });
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        updateState({
          user: session?.user ?? null,
          error: null,
          loading: false,
        });

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          updateState({ profile: null });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, updateState, fetchProfile, refreshSession]);

  const signInWithMagicLink = useCallback(
    async (options: MagicLinkOptions): Promise<AuthResponse> => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: options.email,
        options: {
          emailRedirectTo:
            options.redirectTo || `${window.location.origin}/api/auth/callback`,
        },
      });
      return { data, error };
    },
    [supabase]
  );

  const signUpWithMagicLink = useCallback(
    async (options: MagicLinkOptions): Promise<AuthResponse> => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: options.email,
        options: {
          data: {
            full_name: options.fullName || '',
            company_name: options.companyName || '',
          },
          emailRedirectTo:
            options.redirectTo || `${window.location.origin}/api/auth/callback`,
        },
      });
      return { data, error };
    },
    [supabase]
  );

  const signOut = useCallback(async (): Promise<AuthResponse> => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, [supabase]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<AuthResponse> => {
      if (!state.user) {
        return { error: { message: AUTH_ERRORS.NO_USER } };
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', state.user.id)
        .select()
        .single();

      if (error) {
        return { error: { message: error.message } };
      }

      updateState({ profile: data });
      return { data };
    },
    [supabase, state.user, updateState]
  );

  const updatePassword = useCallback(
    async (password: string): Promise<AuthResponse> => {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { data };
    },
    [supabase]
  );

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResponse> => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { data };
    },
    [supabase]
  );

  return {
    ...state,
    signInWithMagicLink,
    signUpWithMagicLink,
    signOut,
    updateProfile,
    updatePassword,
    resetPassword,
    refreshSession,
  };
}
