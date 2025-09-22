import { redirect } from 'next/navigation';
import { getUser } from '@/queries/user';
import { createClient } from '@/lib/supabase/server';
import { ProposalForm } from '@/components/proposals/new/proposal-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface UsageInfo {
  can_create_proposal: boolean;
  is_trial: boolean;
  remaining_proposals: number;
  current_usage: number;
  proposal_limit: number;
  subscription_plan: string;
  subscription_status: string;
  trial_end_at: string | null;
}

async function checkUserCanCreateProposal(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc('get_user_usage_info', { user_uuid: userId })
    .single();

  if (error) {
    console.error('Error checking user proposal permissions:', error);
    return { canCreate: false, usageInfo: null };
  }

  const usageData = data as UsageInfo;

  return { canCreate: usageData.can_create_proposal, usageInfo: usageData };
}

export default async function NewProposalPage() {
  const { user } = await getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { canCreate, usageInfo } = await checkUserCanCreateProposal(user.id);

  if (!canCreate) {
    redirect('/dashboard/billing?error=subscription_required');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Proposal
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Fill in the details below and let AI help you create a professional
          proposal.
        </p>
      </div>

      {/* Usage Warning for Trial Users */}
      {usageInfo?.is_trial && usageInfo.remaining_proposals <= 1 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You have {usageInfo.remaining_proposals} proposal
            {usageInfo.remaining_proposals !== 1 ? 's' : ''} remaining in your
            trial. Consider upgrading to a paid plan to continue creating
            proposals.
          </AlertDescription>
        </Alert>
      )}

      <ProposalForm userId={user.id} />
    </div>
  );
}
