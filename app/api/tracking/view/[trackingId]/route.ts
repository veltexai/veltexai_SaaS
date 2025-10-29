import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const body = await request.json();
    const { proposal_id, user_agent, referrer } = body;

    const supabase = await createClient();
    const headersList = await headers();
    
    // Get IP address
    const forwarded = headersList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') || 'unknown';

    // Get current tracking record to increment view_count
    const { data: currentTracking } = await supabase
      .from('proposal_tracking')
      .select('view_count')
      .eq('tracking_id', trackingId)
      .single();

    // Update proposal tracking record
    const { error: trackingError } = await supabase
      .from('proposal_tracking')
      .update({
        viewed: true,
        viewed_at: new Date().toISOString(),
        view_count: (currentTracking?.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('tracking_id', trackingId);

    if (trackingError) {
      console.error('Error updating tracking:', trackingError);
      return NextResponse.json(
        { error: 'Failed to update tracking' },
        { status: 500 }
      );
    }

    // Insert view record
    const { error: viewError } = await supabase
      .from('proposal_views')
      .insert({
        proposal_id,
        tracking_id: trackingId,
        ip_address: ip,
        user_agent: user_agent || headersList.get('user-agent'),
        referrer: referrer || headersList.get('referer'),
        viewed_at: new Date().toISOString(),
      });

    if (viewError) {
      console.error('Error inserting view:', viewError);
      // Don't return error here as tracking update was successful
    }

    // Get current proposal to increment view_count
    const { data: currentProposal } = await supabase
      .from('proposals')
      .select('view_count')
      .eq('id', proposal_id)
      .single();

    // Update proposal view count
    const { error: proposalError } = await supabase
      .from('proposals')
      .update({
        view_count: (currentProposal?.view_count || 0) + 1,
      })
      .eq('id', proposal_id);

    if (proposalError) {
      console.error('Error updating proposal view count:', proposalError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}