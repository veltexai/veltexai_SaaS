'use server';

import { z } from 'zod';
import { validatedAction } from '@/lib/auth/middleware';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AUTH_ROUTES, AUTH_ERRORS, AUTH_REDIRECTS } from '@/lib/auth/constants';
import type { AuthResponse } from '@/lib/auth/types';

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export const signIn = validatedAction(signInSchema, async (data) => {
  const supabase = await createClient();
  const { email, password } = data;

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: AUTH_ERRORS.INVALID_CREDENTIALS };
  }

  // Ensure user_data entry exists
  const { data: userData, error: userDataError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', signInData.user?.id)
    .single();

  if (userDataError && userDataError.code === 'PGRST116') {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: signInData.user?.id,
      email: signInData.user?.email || '',
    });

    if (insertError) {
      console.error('Error creating profile entry:', insertError);
    }
  }

  redirect(AUTH_ROUTES.DASHBOARD);
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  companyName: z.string().optional(),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data) => {
  const supabase = await createClient();
  const { email, password, fullName, companyName } = data;

  // Check if user already exists first
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('email', email)
    .single();

  if (existingProfile) {
    return { error: 'User already exists!' };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName || '',
      },
      emailRedirectTo: `${
        AUTH_REDIRECTS.CALLBACK
      }?redirect=${encodeURIComponent(AUTH_REDIRECTS.DEFAULT_REDIRECT)}`,
    },
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // Success case - user was created
  if (signUpData.user) {
    return { success: 'Please check your email to verify your account.' };
  }

  return { error: 'Failed to create user.' };
});

export const signOut = async (): Promise<AuthResponse> => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: { message: error.message } };
  }

  redirect(AUTH_ROUTES.LOGIN);
};

const resetPasswordSchema = z.object({
  email: z.string().email(),
});

export const sendResetPasswordEmail = validatedAction(
  resetPasswordSchema,
  async (data): Promise<AuthResponse> => {
    const supabase = await createClient();
    const { email } = data;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${AUTH_REDIRECTS.CONFIRM}?next=${encodeURIComponent(
        AUTH_ROUTES.RESET_PASSWORD
      )}`,
    });

    if (error) {
      console.error('Reset password error:', error);
      return { error: { message: error.message } };
    }

    return { success: 'Please check your email for the reset link.' };
  }
);

const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updatePassword = validatedAction(
  updatePasswordSchema,
  async (data): Promise<AuthResponse> => {
    const supabase = await createClient();
    const { password } = data;

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Update password error:', error);
      return { error: { message: error.message } };
    }

    return { success: 'Password updated successfully.' };
  }
);
