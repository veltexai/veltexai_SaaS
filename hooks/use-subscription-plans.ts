'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database, SubscriptionPlan } from '@/types/database';

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('Here Outside fetchPlans');
    const supabase = createClient();

    async function fetchPlans() {
      console.log('Here inside fetchPlans');
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .order('price_monthly', { ascending: true });
        console.log('🚀 ~ fetchPlans ~ error:', error);
        console.log('🚀 ~ fetchPlans ~ data:', data);

        if (error) throw error;
        setPlans(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlans();
  }, []);

  return { data: plans, isLoading, error };
}
