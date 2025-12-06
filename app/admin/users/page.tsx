import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Users } from 'lucide-react';
import UsersTable from '@/components/admin/users-table';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  role: string;
}

interface UserSubscription {
  user_id: string;
  plan: string;
  status: string;
  current_period_end: string;
}

interface UserStats {
  totalProposals: number;
  totalRevenue: number;
  lastActivity: string | null;
}

async function fetchUsers() {
  const supabase = createServiceClient();

  try {
    // Fetch users from auth.users (admin only)
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    if (profilesError) throw profilesError;

    // Fetch subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*');
    if (subsError) throw subsError;

    // Combine auth users with profiles
    const combinedUsers: User[] = authUsers.users.map((authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: profile?.full_name || null,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at || null,
        email_confirmed_at: authUser.email_confirmed_at || null,
        role: profile?.role || 'user',
      };
    });

    return {
      users: combinedUsers,
      subscriptions: subscriptions || [],
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

async function fetchUserStats(userIds: string[]) {
  const supabase = createServiceClient();
  const stats: Record<string, UserStats> = {};

  try {
    for (const userId of userIds) {
      // Get proposal count and revenue
      const { data: proposals } = await supabase
        .from('proposals')
        .select('total_amount, status, updated_at')
        .eq('user_id', userId);

      const totalProposals = proposals?.length || 0;
      const totalRevenue =
        proposals
          ?.filter((p) => p.status === 'accepted')
          .reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

      const lastActivity =
        proposals?.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )[0]?.updated_at || null;

      stats[userId] = {
        totalProposals,
        totalRevenue,
        lastActivity,
      };
    }

    return stats;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {};
  }
}

async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return user;
}

export default async function UsersPage() {
  const currentUser = await checkAdminAccess();
  const { users, subscriptions } = await fetchUsers();
  const userStats = await fetchUserStats(users.map((u) => u.id));

  return (
    <div className="container mx-auto py-6 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage users, subscriptions, and permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <span className="font-medium">{users.length} users</span>
        </div>
      </div>

      <UsersTable
        users={users}
        subscriptions={subscriptions}
        userStats={userStats}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
