'use server';

import { z } from 'zod';
import { validatedAction } from '@/lib/auth/middleware';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AUTH_ROUTES, AUTH_ERRORS } from '@/lib/auth/constants';
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
    .from('user_data')
    .select('*')
    .eq('user_id', signInData.user?.id)
    .single();

  if (userDataError && userDataError.code === 'PGRST116') {
    const { error: insertError } = await supabase
      .from('user_data')
      .insert({ user_id: signInData.user?.id });
    
    if (insertError) {
      console.error('Error creating user_data entry:', insertError);
    }
  }

  redirect(AUTH_ROUTES.DASHBOARD);
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional(),
});

export const signUp = validatedAction(signUpSchema, async (data) => {
  const supabase = await createClient();
  const { email, password } = data;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // Create user_data entry
  const { error: insertError } = await supabase
    .from('user_data')
    .insert({ user_id: signUpData?.user?.id });

  if (insertError) {
    console.error('Error creating user_data entry:', insertError);
  }

  redirect(AUTH_ROUTES.DASHBOARD);
});

export const signOut = async (): Promise<AuthResponse> => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error: { message: error.message } };
  }
  
  redirect(AUTH_ROUTES.LOGIN);
};