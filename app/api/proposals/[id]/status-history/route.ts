import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: proposalId } = await params;

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify proposal ownership
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('id, user_id')
      .eq('id', proposalId)
      .eq('user_id', user.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Get status history for this proposal with user full names
    const { data: statusHistory, error: historyError } = await supabase
      .from('proposal_status_history')
      .select(`
        *,
        profiles!changed_by(full_name)
      `)
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('Status history fetch error:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch status history' },
        { status: 500 }
      );
    }

    return NextResponse.json(statusHistory || []);
  } catch (error) {
    console.error('Status history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status history' },
      { status: 500 }
    );
  }
}
