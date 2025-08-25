import { redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { createClient } from '@/lib/supabase/server';
import { AdminAnalytics } from '@/components/admin/admin-analytics';
import { AdminClientWrapper } from '@/components/admin/admin-client-wrapper';

interface Analytics {
  totalUsers: number;
  totalProposals: number;
  totalRevenue: number;
  activeSubscriptions: number;
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
  const supabase = await createClient();

  // Fetch total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Fetch total proposals
  const { count: totalProposals } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true });

  // Fetch total revenue from proposals
  const { data: revenueData } = await supabase
    .from('proposals')
    .select('total_value')
    .eq('status', 'accepted');

  const totalRevenue =
    revenueData?.reduce(
      (sum: number, proposal: { total_value: number }) =>
        sum + (proposal.total_value || 0),
      0
    ) || 0;

  // Fetch active subscriptions
  const { count: activeSubscriptions } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('stripe_customer_id', 'is', null);

  // Fetch recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, created_at, role')
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch recent proposals with user email
  const { data: recentProposals } = await supabase
    .from('proposals')
    .select(
      `
      id,
      title,
      client_name,
      total_value,
      status,
      created_at,
      profiles!inner(email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(10);

  const formattedProposals =
    recentProposals?.map((proposal: any) => ({
      ...proposal,
      user_email: proposal.profiles?.email || 'Unknown',
    })) || [];

  return {
    totalUsers: totalUsers || 0,
    totalProposals: totalProposals || 0,
    totalRevenue,
    activeSubscriptions: activeSubscriptions || 0,
    recentUsers: recentUsers || [],
    recentProposals: formattedProposals,
  };
}

export default async function AdminDashboard() {
  const { user, profile } = await getUser();

  if (!user || profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const analytics = await fetchAnalytics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage users and view analytics</p>
      </div>

      <AdminAnalytics
        totalUsers={analytics.totalUsers}
        totalProposals={analytics.totalProposals}
        totalRevenue={analytics.totalRevenue}
        activeSubscriptions={analytics.activeSubscriptions}
      />

      <AdminClientWrapper
        users={analytics.recentUsers}
        proposals={analytics.recentProposals}
      />
    </div>
  );
}
