'use server';

import { createClient } from '@/lib/supabase/server';
import { Profile } from '@/types/database';

export const getUser = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log('getUser - Auth check:', {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    userError: userError?.message
  });

  if (userError || !user) {
    console.log('getUser - No user found, redirecting to login');
    return { user: null, profile: null };
  }

  // Fetch the user's profile from the profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  console.log('getUser - Profile fetch:', {
    hasProfile: !!profile,
    profileId: profile?.id,
    profileError: profileError?.message
  });

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return { user, profile: null };
  }

  console.log('getUser - Success:', {
    userId: user.id,
    profileId: profile?.id,
    logoUrl: profile?.logo_url
  });

  return { user, profile: profile as Profile };
};
