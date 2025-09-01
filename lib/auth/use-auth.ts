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
  updateProfile: (updates: Partial<Profile>, userOverride?: User) => Promise<AuthResponse>;
  updatePassword: (password: string) => Promise<AuthResponse>;
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

  const updateProfile = useCallback(
    async (updates: Partial<Profile>, userOverride?: User): Promise<AuthResponse> => {
      try {
        console.log('updateProfile called with:', updates);
        
        const currentUser = userOverride || state.user;
        if (!currentUser) {
          console.log('No user found');
          return { error: { message: AUTH_ERRORS.NO_USER } };
        }

        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
          return { error: { message: result.error } };
        }

        console.log('Profile updated successfully:', result.data);
        updateState({ profile: result.data });
        return { data: result.data };
      } catch (error: any) {
        console.error('Unexpected error in updateProfile:', error);
        return { error: { message: error.message || 'An unexpected error occurred' } };
      }
    },
    [state.user, updateState]
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

  return {
    ...state,
    updateProfile,
    updatePassword,
    refreshSession,
  };
}
