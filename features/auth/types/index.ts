import { User } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export interface AuthResponse<T = any> {
  data?: T;
  error?: { message: string } | null;
  success?: string;
}

export interface MagicLinkOptions {
  email: string;
  fullName?: string;
  companyName?: string;
  redirectTo?: string;
  priceId?: string;
}

export interface OAuthOptions {
  provider: 'google';
  redirectTo?: string;
  priceId?: string;
}

export interface PasswordAuthData {
  email: string;
  password: string;
  inviteId?: string;
}

export interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}

export interface AuthFormState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}
