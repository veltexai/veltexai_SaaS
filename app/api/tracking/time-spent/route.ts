import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tracking_id, time_spent } = body;

    if (!tracking_id || typeof time_spent !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current tracking record to increment time_spent_seconds
    const { data: currentTracking } = await supabase
      .from('proposal_tracking')
      .select('time_spent_seconds')
      .eq('tracking_id', tracking_id)
      .single();

    // Update tracking record with time spent
    const { error } = await supabase
      .from('proposal_tracking')
      .update({
        time_spent_seconds: (currentTracking?.time_spent_seconds || 0) + Math.floor(time_spent / 1000),
      })
      .eq('tracking_id', tracking_id);

    if (error) {
      console.error('Error updating time spent:', error);
      return NextResponse.json(
        { error: 'Failed to update time spent' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Time spent tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}