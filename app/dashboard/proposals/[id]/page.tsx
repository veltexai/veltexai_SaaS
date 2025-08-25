import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { createClient } from '@/lib/supabase/server';
import { ProposalHeader } from '@/components/proposals/detail/proposal-header';
import { ProposalActions } from '@/components/proposals/detail/proposal-actions';
import { ProposalContent } from '@/components/proposals/detail/proposal-content';
import { ProposalSidebar } from '@/components/proposals/detail/proposal-sidebar';
interface Proposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  project_description: string;
  budget_range: string;
  timeline: string;
  company_name: string;
  services_offered: string;
  content: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  value: number;
  created_at: string;
  updated_at: string;
}

async function getProposal(
  id: string,
  userId: string
): Promise<Proposal | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
}

interface ProposalViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProposalViewPage({
  params,
}: ProposalViewPageProps) {
  const { user } = await getUser();

  if (!user) {
    redirect('/auth/login');
  }
  const { id } = await params;

  const proposal = await getProposal(id, user.id);

  if (!proposal) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <ProposalHeader proposal={proposal} />
      <ProposalActions proposal={proposal} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProposalContent proposal={proposal} />
        </div>
        <div>
          <ProposalSidebar proposal={proposal} />
        </div>
      </div>
    </div>
  );
}
