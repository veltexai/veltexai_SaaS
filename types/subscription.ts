export interface SubscriptionMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  churnRate: number;
  averageRevenuePerUser: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  plan: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at?: string;
  user_email?: string;
  created_at: string;
}

export interface BillingRecord {
  id: string;
  user_id: string;
  stripe_invoice_id: string;
  amount: number;
  status: string;
  invoice_date: string;
  user_email?: string;
}

// New interfaces moved from billing-client.tsx
export interface UsageData {
  currentUsage: number;
  proposalLimit: number;
  canCreateProposal: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  remainingProposals: number;
  isTrial: boolean;
  trialEndAt: string | null;
}

export interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string;
}

export interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_date: string;
  stripe_invoice_id: string;
}
