import { redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AdminAnalytics } from '@/components/admin/admin-analytics';
import { AdminClientWrapper } from '@/components/admin/admin-client-wrapper';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Analytics {
  totalUsers: number;
  totalProposals: number;
  totalRevenue: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  conversionRate: number;
  averageProposalValue: number;
  newUsersThisMonth: number;
  proposalsByStatus: {
    draft: number;
    sent: number;
    accepted: number;
    rejected: number;
  };
  usersByPlan: {
    trial: number;
    starter: number;
    professional: number;
    enterprise: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    full_name: string;
    company_name: string;
    created_at: string;
    role: string;
  }>;
  recentProposals: Array<{
    id: string;
    title: string;
    client_name: string;
    total_value: number;
    status: string;
    created_at: string;
    user_email: string;
  }>;
}

async function fetchAnalytics(): Promise<Analytics> {
  const supabase = await createServiceClient();

  // Get current date for monthly calculations
  const now = new Date();
  const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString();

  // Fetch all data in parallel
  const [
    usersResult,
    proposalsResult,
    subscriptionsResult,
    newUsersResult,
    recentUsersResult,
    recentProposalsResult,
  ] = await Promise.all([
    // Total users count
    supabase.from('profiles').select('id', { count: 'exact' }),

    // All proposals with pricing data
    supabase
      .from('proposals')
      .select(
        `
        id,
        title,
        client_name,
        status,
        pricing_data,
        created_at,
        user_id,
        profiles!inner(email)
      `
      )
      .order('created_at', { ascending: false }),

    // Active subscriptions with plan info
    supabase
      .from('subscriptions')
      .select('status, plan, user_id')
      .eq('status', 'active'),

    // New users this month
    supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .gte('created_at', startOfMonth),

    // Recent users (last 10)
    supabase
      .from('profiles')
      .select('id, email, full_name, company_name, created_at, role')
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent proposals with user email (last 10)
    supabase
      .from('proposals')
      .select(
        `
        id,
        title,
        client_name,
        status,
        pricing_data,
        created_at,
        profiles!inner(email)
      `
      )
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Check for errors
  if (usersResult.error) throw usersResult.error;
  if (proposalsResult.error) throw proposalsResult.error;
  if (subscriptionsResult.error) throw subscriptionsResult.error;
  if (newUsersResult.error) throw newUsersResult.error;
  if (recentUsersResult.error) throw recentUsersResult.error;
  if (recentProposalsResult.error) throw recentProposalsResult.error;

  const proposals = proposalsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const recentUsers = recentUsersResult.data || [];
  const recentProposals = recentProposalsResult.data || [];

  // Helper function to extract price from pricing_data
  const extractPrice = (pricingData: any): number => {
    if (!pricingData) return 0;

    // Handle different pricing_data structures
    if (typeof pricingData === 'object') {
      // Try different possible price fields
      if (pricingData.total_price)
        return parseFloat(pricingData.total_price) || 0;
      if (pricingData.price) return parseFloat(pricingData.price) || 0;
      if (pricingData.amount) return parseFloat(pricingData.amount) || 0;
      if (pricingData.price_range?.max)
        return parseFloat(pricingData.price_range.max) || 0;
      if (pricingData.price_range?.min)
        return parseFloat(pricingData.price_range.min) || 0;
    }

    return 0;
  };

  // Calculate metrics
  const totalUsers = usersResult.count || 0;
  const totalProposals = proposals.length;
  const activeSubscriptions = subscriptions.length;
  const newUsersThisMonth = newUsersResult.count || 0;

  // Revenue calculations
  const acceptedProposals = proposals.filter((p) => p.status === 'accepted');
  const totalRevenue = acceptedProposals.reduce(
    (sum, p) => sum + extractPrice(p.pricing_data),
    0
  );

  // Monthly revenue (accepted proposals this month)
  const monthlyAcceptedProposals = acceptedProposals.filter(
    (p) => new Date(p.created_at) >= new Date(startOfMonth)
  );
  const monthlyRevenue = monthlyAcceptedProposals.reduce(
    (sum, p) => sum + extractPrice(p.pricing_data),
    0
  );

  // Conversion rate
  const sentProposals = proposals.filter(
    (p) => p.status === 'sent' || p.status === 'accepted'
  );
  const conversionRate =
    sentProposals.length > 0
      ? (acceptedProposals.length / sentProposals.length) * 100
      : 0;

  // Average proposal value
  const averageProposalValue =
    acceptedProposals.length > 0 ? totalRevenue / acceptedProposals.length : 0;

  // Proposals by status
  const proposalsByStatus = {
    draft: proposals.filter((p) => p.status === 'draft').length,
    sent: proposals.filter((p) => p.status === 'sent').length,
    accepted: proposals.filter((p) => p.status === 'accepted').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  };

  // Users by plan
  const usersByPlan = {
    trial: 0,
    starter: subscriptions.filter((s) => s.plan === 'starter').length,
    professional: subscriptions.filter((s) => s.plan === 'professional').length,
    enterprise: subscriptions.filter((s) => s.plan === 'enterprise').length,
  };
  usersByPlan.trial =
    totalUsers -
    (usersByPlan.starter + usersByPlan.professional + usersByPlan.enterprise);

  // Format recent users
  const formattedRecentUsers = recentUsers.map((user) => ({
    id: user.id,
    email: user.email || '',
    full_name: user.full_name || '',
    company_name: user.company_name || '',
    created_at: user.created_at,
    role: user.role || 'user',
  }));

  // Format recent proposals
  const formattedRecentProposals = recentProposals.map((proposal) => ({
    id: proposal.id,
    title: proposal.title,
    client_name: proposal.client_name,
    total_value: extractPrice(proposal.pricing_data),
    status: proposal.status,
    created_at: proposal.created_at,
    user_email: proposal.profiles?.[0]?.email || '',
  }));

  return {
    totalUsers,
    totalProposals,
    totalRevenue,
    activeSubscriptions,
    monthlyRevenue,
    conversionRate,
    averageProposalValue,
    newUsersThisMonth,
    proposalsByStatus,
    usersByPlan,
    recentUsers: formattedRecentUsers,
    recentProposals: formattedRecentProposals,
  };
}

export default async function AdminDashboard() {
  const { user } = await getUser();

  if (!user) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const analytics = await fetchAnalytics();

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage users and view analytics</p>
      </div>

      <AdminAnalytics
        totalUsers={analytics.totalUsers}
        totalProposals={analytics.totalProposals}
        totalRevenue={analytics.totalRevenue}
        activeSubscriptions={analytics.activeSubscriptions}
        monthlyRevenue={analytics.monthlyRevenue}
        conversionRate={analytics.conversionRate}
        averageProposalValue={analytics.averageProposalValue}
        newUsersThisMonth={analytics.newUsersThisMonth}
        proposalsByStatus={analytics.proposalsByStatus}
        usersByPlan={analytics.usersByPlan}
      />

      <AdminClientWrapper
        users={analytics.recentUsers}
        proposals={analytics.recentProposals}
      />
    </div>
  );
}
