'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SubscriptionTier as UserTier } from '@/types/subscription';

export function useUserTier(userId: string): UserTier {
  const [userTier, setUserTier] = useState<UserTier>('starter');

  useEffect(() => {
    const fetchUserTier = async (): Promise<void> => {
      try {
        const supabase = createClient();

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', userId)
          .in('status', ['active', 'trialing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscription?.plan) {
          setUserTier(subscription.plan as UserTier);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', userId)
          .single();

        if (!error && profile?.subscription_plan) {
          setUserTier(profile.subscription_plan as UserTier);
        }
      } catch (err) {
        console.error('Error fetching user tier:', err);
      }
    };

    fetchUserTier();
  }, [userId]);

  return userTier;
}
