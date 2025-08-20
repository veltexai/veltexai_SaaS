'use server';

import { createClient } from '@/lib/supabase/server';
import { AUTH_REDIRECTS, AUTH_ERRORS } from '@/lib/auth/constants';
import type { AuthResponse } from '@/lib/auth/types';

export const signInWithGoogle = async (
  priceId?: string
): Promise<AuthResponse> => {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${AUTH_REDIRECTS.CALLBACK}?priceId=${encodeURIComponent(
          priceId || ''
        )}&redirect=${encodeURIComponent(AUTH_REDIRECTS.DEFAULT_REDIRECT)}`,
      },
    });

    if (error) {
      return { error: { message: AUTH_ERRORS.GOOGLE_SIGNIN_FAILED } };
    }

    // Return the OAuth URL for client-side redirect
    if (data.url) {
      return { data: { url: data.url } };
    }

    return { error: { message: AUTH_ERRORS.GOOGLE_SIGNIN_FAILED } };
  } catch (error) {
    return { error: { message: AUTH_ERRORS.GOOGLE_SIGNIN_FAILED } };
  }
};
