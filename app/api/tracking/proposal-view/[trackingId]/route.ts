import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ trackingId: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { trackingId } = await context.params;
    const supabase = await createClient();

    // Get user agent and IP for tracking
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Get current tracking record
    const { data: tracking, error: fetchError } = await supabase
      .from('proposal_tracking')
      .select('proposal_viewed, first_view_at, view_count')
      .eq('tracking_id', trackingId)
      .single();

    if (fetchError) {
      console.error('Error fetching tracking record:', fetchError);
      return NextResponse.json({ error: 'Tracking record not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      proposal_viewed: true,
      view_count: (tracking.view_count || 0) + 1,
      user_agent: userAgent,
      ip_address: ip,
    };

    // Set first view time if not already set
    if (!tracking.first_view_at) {
      updateData.first_view_at = new Date().toISOString();
    }

    // Update the tracking record
    const { error: updateError } = await supabase
      .from('proposal_tracking')
      .update(updateData)
      .eq('tracking_id', trackingId);

    if (updateError) {
      console.error('Error updating tracking record:', updateError);
      return NextResponse.json({ error: 'Failed to update tracking' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking proposal view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}