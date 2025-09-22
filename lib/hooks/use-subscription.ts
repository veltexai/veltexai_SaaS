import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/use-auth';
import { createClient } from '@/lib/supabase/client';
import { getStripeJs } from '@/lib/stripe-client';

const supabase = createClient();

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  plan: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at?: string;
}

interface UsageInfo {
  currentUsage: number;
  proposalLimit: number;
  canCreateProposal: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  remainingProposals: number;
  isTrial: boolean;
  trialEndAt: string | null;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 ~ fetchSubscriptionData ~ user:', user);
      console.log('🚀 ~ Environment check:', {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

      // Fetch subscription - get the most recent one regardless of status
      // Debug the auth state first
      console.log('🚀 ~ Auth state:', {
        userId: user?.id,
        userExists: !!user,
        supabaseUrl:
          process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
      });

      // Test basic connectivity
      try {
        const testQuery = await supabase.auth.getUser();
        console.log('🚀 ~ Supabase auth test:', testQuery);
      } catch (authError) {
        console.error('🚀 ~ Auth error:', authError);
      }

      // Try the subscription query with timeout
      const subscriptionPromise = supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 3s')), 3000)
      );

      try {
        const result = await Promise.race([
          subscriptionPromise,
          timeoutPromise,
        ]);
        
        // Test without RLS first
        console.log('🚀 ~ Testing basic query...');
        
        try {
          // Test 1: Simple count query (should work even with RLS)
          const { count, error: countError } = await supabase
            .from('subscriptions')
            .select('*', { count: 'exact', head: true });
          
          console.log('🚀 ~ Table count:', count, 'Error:', countError);
          
          // Test 2: Your actual query
          const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          console.log('🚀 ~ Subscription data:', subData, 'Error:', subError);
          
          setSubscription(subData);
        } catch (err) {
          console.error('🚀 ~ Query error:', err);
        }
      } catch (timeoutError) {
        console.error('🚀 ~ Query failed or timed out:', timeoutError);
        if (timeoutError instanceof Error && timeoutError.message.includes('timeout')) {
          console.error('🚀 ~ This is likely an RLS policy issue blocking the query');
        }
        throw timeoutError;
      }

      // Fetch usage info
      const response = await fetch('/api/usage/check');
      if (response.ok) {
        const usageData = await response.json();
        setUsageInfo(usageData);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError('Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    console.log('🚀 ~ useSubscription ~ user:', user);
    console.log('🚀 ~ useSubscription ~ authLoading:', authLoading);
    if (authLoading) {
      // Still loading auth, don't do anything yet
      return;
    }
    if (user && !authLoading) {
      fetchSubscriptionData();
    } else {
      setSubscription(null);
      setUsageInfo(null);
      setLoading(false);
    }
  }, [user, authLoading, fetchSubscriptionData]);

  // Poll for subscription updates after checkout
  useEffect(() => {
    const pendingCheckout = localStorage.getItem('pending_checkout');
    if (pendingCheckout && user) {
      let pollCount = 0;
      const maxPolls = 15;

      const pollInterval = setInterval(async () => {
        pollCount++;
        await fetchSubscriptionData();

        if (subscription?.status === 'active' || pollCount >= maxPolls) {
          localStorage.removeItem('pending_checkout');
          clearInterval(pollInterval);
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [user, subscription?.status]);

  const createCheckoutSession = async (plan: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Creating checkout session for plan:', plan);
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });
      console.log('Checkout session response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await getStripeJs();

      if (!stripe) {
        throw new Error('Stripe not loaded');
      }

      // Store checkout session for polling
      localStorage.setItem('pending_checkout', sessionId);

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('Failed to start checkout process');
    } finally {
      setLoading(false);
    }
  };

  const createPortalSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      console.error('Error creating portal session:', err);
      setError('Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  const isSubscribed = subscription && subscription.status === 'active';
  const isPro =
    isSubscribed && ['professional', 'enterprise'].includes(subscription.plan);
  const isEnterprise = isSubscribed && subscription.plan === 'enterprise';
  const isTrial = usageInfo?.isTrial || false;
  const canCreateProposal = usageInfo?.canCreateProposal || false;

  return {
    subscription,
    usageInfo,
    loading,
    error,
    isSubscribed,
    isPro,
    isEnterprise,
    isTrial,
    canCreateProposal,
    createCheckoutSession,
    createPortalSession,
    refetch: fetchSubscriptionData,
  };
}
