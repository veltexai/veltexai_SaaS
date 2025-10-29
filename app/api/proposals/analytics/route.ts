import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get overview statistics
    const { data: proposals } = await supabase
      .from('proposals')
      .select(`
        id,
        title,
        status,
        view_count,
        last_viewed_at,
        created_at,
        company_profiles!inner(user_id)
      `)
      .eq('company_profiles.user_id', user.id);

    const { data: tracking } = await supabase
      .from('proposal_tracking')
      .select(`
        *,
        proposals!inner(
          id,
          title,
          company_profiles!inner(user_id)
        )
      `)
      .eq('proposals.company_profiles.user_id', user.id);

    const { data: statusHistory } = await supabase
      .from('proposal_status_history')
      .select(`
        *,
        proposals!inner(
          id,
          title,
          company_profiles!inner(user_id)
        )
      `)
      .eq('proposals.company_profiles.user_id', user.id)
      .order('changed_at', { ascending: false })
      .limit(50);

    // Calculate overview metrics
    const totalSent = tracking?.length || 0;
    const totalViews = proposals?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
    const totalDownloads = tracking?.reduce((sum, t) => sum + (t.download_count || 0), 0) || 0;
    
    // Calculate average view time (mock calculation - would need actual tracking data)
    const averageViewTime = tracking && tracking.length > 0 
      ? tracking.reduce((sum, t) => sum + (t.view_duration || 0), 0) / tracking.length 
      : 0;

    // Calculate open rate
    const openedEmails = tracking?.filter(t => t.opened).length || 0;
    const openRate = totalSent > 0 ? openedEmails / totalSent : 0;

    // Calculate conversion rate
    const acceptedProposals = proposals?.filter(p => p.status === 'accepted').length || 0;
    const conversionRate = totalSent > 0 ? acceptedProposals / totalSent : 0;

    // Prepare recent activity
    const recentActivity = statusHistory?.map(history => ({
      id: history.id,
      proposal_title: history.proposals?.title || 'Unknown',
      client_name: 'Client', // Would need to join with client data
      event_type: history.new_status,
      timestamp: history.changed_at,
      tracking_id: null
    })) || [];

    // Add tracking events to recent activity
    const trackingActivity = tracking?.map(t => ({
      id: t.id,
      proposal_title: t.proposals?.title || 'Unknown',
      client_name: t.recipient_email.split('@')[0],
      event_type: 'sent' as const,
      timestamp: t.sent_at,
      tracking_id: t.tracking_id
    })) || [];

    // Combine and sort activity
    const allActivity = [...recentActivity, ...trackingActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    // Calculate top performing proposals
    const topProposals = proposals?.map(proposal => {
      const proposalTracking = tracking?.filter(t => t.proposal_id === proposal.id) || [];
      const downloadCount = proposalTracking.reduce((sum, t) => sum + (t.download_count || 0), 0);
      const viewCount = proposal.view_count || 0;
      
      // Simple engagement score calculation
      const engagementScore = Math.min(100, (viewCount * 10) + (downloadCount * 20));

      return {
        id: proposal.id,
        title: proposal.title,
        client_name: 'Client', // Would need client data
        status: proposal.status,
        view_count: viewCount,
        download_count: downloadCount,
        last_viewed_at: proposal.last_viewed_at,
        engagement_score: engagementScore
      };
    })
    .sort((a, b) => b.engagement_score - a.engagement_score)
    .slice(0, 10) || [];

    // Prepare tracking details
    const trackingDetails = tracking?.map(t => ({
      id: t.id,
      proposal_title: t.proposals?.title || 'Unknown',
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
      recent_activity: allActivity,
      top_proposals: topProposals,
      tracking_details: trackingDetails
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}