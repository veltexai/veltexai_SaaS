import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tracking_id, scroll_percent } = body;

    if (!tracking_id || typeof scroll_percent !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current tracking record to update max_scroll_depth
    const { data: currentTracking } = await supabase
      .from('proposal_tracking')
      .select('max_scroll_depth')
      .eq('tracking_id', tracking_id)
      .single();

    // Update tracking record with max scroll depth
    const { error } = await supabase
      .from('proposal_tracking')
      .update({
        max_scroll_depth: Math.max(currentTracking?.max_scroll_depth || 0, scroll_percent),
      })
      .eq('tracking_id', tracking_id);

    if (error) {
      console.error('Error updating scroll depth:', error);
      return NextResponse.json(
        { error: 'Failed to update scroll depth' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scroll tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}