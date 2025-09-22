import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/queries/user';

interface UsageInfo {
  current_usage: number;
  proposal_limit: number;
  can_create_proposal: boolean;
  subscription_plan: string;
  subscription_status: string;
  remaining_proposals: number;
  is_trial: boolean;
  trial_end_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Use the new database function to get comprehensive usage info
    const { data, error } = await supabase
      .rpc('get_user_usage_info', { user_uuid: user.id })
      .single();

    if (error) {
      console.error('Error fetching usage info:', error);
      return NextResponse.json(
        { error: 'Failed to fetch usage information' },
        { status: 500 }
      );
    }
    const usageData = data as UsageInfo;

    return NextResponse.json({
      currentUsage: usageData.current_usage,
      proposalLimit: usageData.proposal_limit,
      canCreateProposal: usageData.can_create_proposal,
      subscriptionPlan: usageData.subscription_plan,
      subscriptionStatus: usageData.subscription_status,
      remainingProposals: usageData.remaining_proposals,
      isTrial: usageData.is_trial,
      trialEndAt: usageData.trial_end_at,
    });
  } catch (error) {
    console.error('Error checking usage:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}
