import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { createClient } from '@/lib/supabase/server';
import { ProposalHeader } from '@/components/proposals/detail/proposal-header';
import { ProposalEditWrapper } from '@/components/proposals/detail/proposal-edit-wrapper';
import { ProposalSidebar } from '@/components/proposals/detail/proposal-sidebar';
import { ProposalDetailTabs } from '@/components/proposals/detail/proposal-detail-tabs';
import { Database } from '@/types/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Proposal = Database['public']['Tables']['proposals']['Row'];

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
    <div className="space-y-6 relative">
      <ProposalHeader proposal={proposal} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProposalDetailTabs proposal={proposal} />
        </div>
        <div className="sticky top-[84px] mt-[120px] h-fit">
          <ProposalSidebar proposal={proposal} />
        </div>
      </div>
    </div>
  );
}
