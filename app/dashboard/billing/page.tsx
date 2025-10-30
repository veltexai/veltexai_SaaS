import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/queries/user';
import { BillingClient } from '@/components/dashboard/billing/billing-client';
import { redirect } from 'next/navigation';
import { getSubscriptionPlans } from '@/lib/stripe';
import type { SubscriptionPlan } from '@/types/database';

interface UsageData {
  currentUsage: number;
  proposalLimit: number;
  canCreateProposal: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  remainingProposals: number;
  isTrial: boolean;
  trialEndAt: string | null;
}

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string;
  canceled_at?: string | null;
}

interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_date: string;
  stripe_invoice_id: string | null;
}

// Define the RPC function return type based on the SQL function
interface UsageInfoRPC {
  current_usage: number;
  proposal_limit: number;
  can_create_proposal: boolean;
  subscription_plan: string;
  subscription_status: string;
  remaining_proposals: number;
  is_trial: boolean;
  trial_end_at: string | null;
}

async function getBillingData() {
  try {
    const { user } = await getUser();

    const supabase = await createClient();

    if (!user) {
      redirect('/auth/login');
    }

    // Fetch usage data with proper typing
    const { data: usageData, error: usageError } = await supabase
      .rpc('get_user_usage_info', { user_uuid: user.id })
      .single();

    if (usageError) {
      console.error('Error fetching usage info:', usageError);
    }

    // Fetch subscription data
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'canceled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subscriptionError);
    }

    // Fetch billing history
    const { data: billingHistoryData, error: billingError } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', user.id)
      .order('invoice_date', { ascending: false })
      .limit(10);

    if (billingError) {
      console.error('Error fetching billing history:', billingError);
    }

    // Transform usage data to match interface
    const usage: UsageData | null = usageData
      ? {
          currentUsage: (usageData as UsageInfoRPC).current_usage,
          proposalLimit: (usageData as UsageInfoRPC).proposal_limit,
          canCreateProposal: (usageData as UsageInfoRPC).can_create_proposal,
          subscriptionPlan: (usageData as UsageInfoRPC).subscription_plan,
          subscriptionStatus: (usageData as UsageInfoRPC).subscription_status,
          remainingProposals: (usageData as UsageInfoRPC).remaining_proposals,
          isTrial: (usageData as UsageInfoRPC).is_trial,
          trialEndAt: (usageData as UsageInfoRPC).trial_end_at,
        }
      : null;

    // Transform subscription data to match interface
    const subscription: SubscriptionData | null = subscriptionData
      ? {
          id: subscriptionData.id,
          plan: subscriptionData.plan,
          status: subscriptionData.status,
          current_period_start: subscriptionData.current_period_start,
          current_period_end: subscriptionData.current_period_end,
          stripe_customer_id: subscriptionData.stripe_customer_id || '',
          canceled_at: subscriptionData.canceled_at,
        }
      : null;

    // Transform billing history to match interface
    const billingHistory: BillingHistory[] =
      billingHistoryData?.map((item) => ({
        id: item.id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        invoice_date: item.invoice_date,
        stripe_invoice_id: item.stripe_invoice_id || '',
      })) || [];

    return {
      usage,
      subscription,
      billingHistory,
    };
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return {
      usage: null,
      subscription: null,
      billingHistory: [],
    };
  }
}

function BillingPageSkeleton() {
  return (
    <div className="container mx-auto py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function BillingPage() {
  const { usage, subscription, billingHistory } = await getBillingData();
  let plans: SubscriptionPlan[] = [];
  let plansError: string | null = null;

  try {
    plans = await getSubscriptionPlans();
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    plansError =
      error instanceof Error
        ? error.message
        : 'Failed to fetch subscription plans';
  }

  return (
    <Suspense fallback={<BillingPageSkeleton />}>
      <BillingClient
        initialUsage={usage}
        initialSubscription={subscription}
        initialBillingHistory={billingHistory}
        plans={plans}
        plansError={plansError}
      />
    </Suspense>
  );
}
