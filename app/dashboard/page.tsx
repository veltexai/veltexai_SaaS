import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/queries/user';
import { WelcomeSection } from '@/components/dashboard/welcome-section';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { RecentProposals } from '@/components/dashboard/recent-proposals';
import { QuickActions } from '@/components/dashboard/quick-actions';

interface DashboardStats {
  totalProposals: number;
  activeProposals: number;
  wonProposals: number;
  totalValue: number;
}

interface RecentProposal {
  id: string;
  title: string;
  client_name: string;
  status: string;
  created_at: string;
  value: number;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  // Fetch proposals for stats
  const { data: proposals, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching proposals:', error);
    return {
      stats: {
        totalProposals: 0,
        activeProposals: 0,
        wonProposals: 0,
        totalValue: 0,
      },
      recentProposals: [],
    };
  }

  // Calculate stats
  const totalProposals = proposals?.length || 0;
  const activeProposals =
    proposals?.filter((p) => p.status === 'sent' || p.status === 'viewed')
      .length || 0;
  const wonProposals =
    proposals?.filter((p) => p.status === 'accepted').length || 0;
  const totalValue =
    proposals?.reduce((sum, p) => {
      // Extract total from pricing_data JSON
      const pricingData = p.pricing_data as any;
      const proposalValue =
        pricingData?.price_range?.high || pricingData?.total || 0;
      return sum + proposalValue;
    }, 0) || 0;

  const stats: DashboardStats = {
    totalProposals,
    activeProposals,
    wonProposals,
    totalValue,
  };

  // Get recent proposals (last 5)
  const recentProposals: RecentProposal[] = proposals?.slice(0, 5) || [];

  return { stats, recentProposals };
}

async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return profile as UserProfile;
}

export default async function DashboardPage() {
  const { user } = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const [{ stats, recentProposals }, profile] = await Promise.all([
    getDashboardData(user.id),
    getUserProfile(user.id),
  ]);

  return (
    <div className="space-y-6">
      <WelcomeSection profile={profile} />
      <DashboardStats stats={stats} />
      <RecentProposals proposals={recentProposals} />
      <QuickActions />
    </div>
  );
}
