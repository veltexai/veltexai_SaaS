import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database, SubscriptionPlan } from '@/types/database';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let cachedPlans: SubscriptionPlan[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const now = Date.now();

  if (cachedPlans && now - cacheTime < CACHE_DURATION) {
    return cachedPlans;
  }

  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly', { ascending: true });

  if (error) throw error;

  cachedPlans = data;
  cacheTime = now;

  return data;
}

export async function getSubscriptionPlan(
  planName: string
): Promise<SubscriptionPlan | null> {
  const plans = await getSubscriptionPlans();
  return plans.find((plan) => plan.name === planName) || null;
}

export async function getUserSubscription(userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

export type { SubscriptionPlan };
