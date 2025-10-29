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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the proposal and verify ownership
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        company_profiles!inner(user_id)
      `)
      .eq('id', proposalId)
      .eq('company_profiles.user_id', user.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Get tracking data for this proposal
    const { data: tracking } = await supabase
      .from('proposal_tracking')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('sent_at', { ascending: false });

    // Get status history for this proposal
    const { data: statusHistory } = await supabase
      .from('proposal_status_history')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('changed_at', { ascending: false });

    // Get proposal views for this proposal
    const { data: proposalViews } = await supabase
      .from('proposal_views')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('viewed_at', { ascending: false });

    // Calculate metrics for this specific proposal
    const totalSent = tracking?.length || 0;
    const totalViews = proposal.view_count || 0;
    const totalDownloads = tracking?.reduce((sum, t) => sum + (t.download_count || 0), 0) || 0;
    
    // Calculate average view time from proposal_views
    const viewDurations = proposalViews?.filter(v => v.view_duration).map(v => v.view_duration) || [];
    const averageViewTime = viewDurations.length > 0 
      ? viewDurations.reduce((sum, duration) => sum + duration, 0) / viewDurations.length 
      : 0;

    // Calculate open rate
    const openedEmails = tracking?.filter(t => t.opened).length || 0;
    const openRate = totalSent > 0 ? openedEmails / totalSent : 0;

    // For single proposal, conversion rate is binary (accepted or not)
    const conversionRate = proposal.status === 'accepted' ? 1 : 0;

    // Prepare recent activity for this proposal
    const recentActivity = [
      // Status changes
      ...(statusHistory?.map(history => ({
        id: history.id,
        proposal_title: proposal.title,
        client_name: 'Client', // Would need client data
        event_type: history.new_status,
        timestamp: history.changed_at,
        tracking_id: null
      })) || []),
      
      // Tracking events
      ...(tracking?.map(t => ({
        id: t.id,
        proposal_title: proposal.title,
        client_name: t.recipient_email.split('@')[0],
        event_type: 'sent' as const,
        timestamp: t.sent_at,
        tracking_id: t.tracking_id
      })) || []),

      // View events
      ...(proposalViews?.map(view => ({
        id: view.id,
        proposal_title: proposal.title,
        client_name: view.viewer_ip || 'Anonymous',
        event_type: 'viewed' as const,
        timestamp: view.viewed_at,
        tracking_id: null
      })) || [])
    ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

    // For single proposal, it's the only "top" proposal
    const topProposals = [{
      id: proposal.id,
      title: proposal.title,
      client_name: 'Client', // Would need client data
      status: proposal.status,
      view_count: totalViews,
      download_count: totalDownloads,
      last_viewed_at: proposal.last_viewed_at,
      engagement_score: Math.min(100, (totalViews * 10) + (totalDownloads * 20))
    }];

    // Prepare tracking details
    const trackingDetails = tracking?.map(t => ({
      id: t.id,
      proposal_title: proposal.title,
      recipient_email: t.recipient_email,
      delivery_method: t.delivery_method,
      sent_at: t.sent_at,
      opened: t.opened || false,
      opened_at: t.opened_at,
      viewed: t.viewed || false,
      viewed_at: t.viewed_at,
      downloaded: t.downloaded || false,
      downloaded_at: t.downloaded_at,
      view_count: t.view_count || 0,
      download_count: t.download_count || 0
    })) || [];

    const analyticsData = {
      overview: {
        total_sent: totalSent,
        total_views: totalViews,
        total_downloads: totalDownloads,
        average_view_time: averageViewTime,
        open_rate: openRate,
        conversion_rate: conversionRate
      },
      recent_activity: recentActivity,
      top_proposals: topProposals,
      tracking_details: trackingDetails
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Proposal analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposal analytics data' },
      { status: 500 }
    );
  }
}