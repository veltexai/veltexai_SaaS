import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import ProposalsTable from '@/components/admin/proposals-table';

interface Proposal {
  id: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  total_amount: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_name: string;
  client_email: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

async function fetchProposals() {
  const supabase = createServiceClient();

  try {
    // Fetch proposals
    const { data: proposalsData, error: proposalsError } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false });

    if (proposalsError) throw proposalsError;

    // Fetch users
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email');

    if (usersError) throw usersError;

    return {
      proposals: proposalsData || [],
      users: usersData || [],
    };
  } catch (error) {
    console.error('Error fetching proposals:', error);
    throw error;
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

export default async function ProposalsPage() {
  const currentUser = await checkAdminAccess();
  const { proposals, users } = await fetchProposals();

  const totalRevenue = proposals
    .filter((p) => p.status === 'accepted')
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  return (
    <div className="container mx-auto py-6 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proposal Management</h1>
          <p className="text-muted-foreground">
            Manage all proposals across the platform
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Total Proposals</div>
            <div className="text-2xl font-bold">{proposals.length}</div>
          </div>
        </div>
      </div>

      <ProposalsTable
        proposals={proposals}
        users={users}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
