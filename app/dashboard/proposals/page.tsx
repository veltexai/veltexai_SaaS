import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/queries/user';
import { ProposalsHeader } from '@/components/proposals/proposals-header';
import { ProposalsList } from '@/components/proposals/proposals-list';
import { EmptyProposals } from '@/components/proposals/empty-proposals';

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  value: number;
  created_at: string;
  updated_at: string;
}

async function getProposals(userId: string): Promise<Proposal[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching proposals:', error);
    return [];
  }

  return data || [];
}

export default async function ProposalsPage() {
  const { user } = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const proposals = await getProposals(user.id);

  return (
    <div className="space-y-6">
      <ProposalsHeader />
      {proposals.length === 0 ? (
        <EmptyProposals />
      ) : (
        <ProposalsList proposals={proposals} />
      )}
    </div>
  );
}
