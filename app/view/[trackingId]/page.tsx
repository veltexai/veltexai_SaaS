import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PublicProposalView } from '@/components/proposals/public-proposal-view';
import { ProposalViewTracker } from '@/components/proposals/proposal-view-tracker';

interface ProposalData {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  client_company: string;
  service_location: string;
  service_type: string;
  service_frequency: string;
  facility_size: number;
  generated_content: string;
  pricing_enabled: boolean;
  pricing_data: any;
  status: string;
  created_at: string;
  company_profiles: {
    company_name: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface TrackingData {
  id: string;
  tracking_id: string;
  proposal_id: string;
  recipient_email: string;
  delivery_method: string;
  track_opens: boolean;
  track_downloads: boolean;
  view_count: number;
  download_count: number;
}

async function getProposalByTracking(trackingId: string): Promise<{
  proposal: ProposalData;
  tracking: TrackingData;
} | null> {
  const supabase = await createClient();

  // First get the tracking record
  const { data: tracking, error: trackingError } = await supabase
    .from('proposal_tracking')
    .select('*')
    .eq('tracking_id', trackingId)
    .single();

  if (trackingError || !tracking) {
    return null;
  }

  // Then get the proposal with company info
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select(`
      *,
      company_profiles!inner(
        company_name,
        logo_url,
        primary_color,
        secondary_color
      )
    `)
    .eq('id', tracking.proposal_id)
    .single();

  if (proposalError || !proposal) {
    return null;
  }

  return {
    proposal: proposal as ProposalData,
    tracking: tracking as TrackingData,
  };
}

async function recordProposalView(trackingId: string, userAgent?: string, ipAddress?: string) {
  const supabase = await createClient();

  try {
    // Get current tracking record
    const { data: currentTracking } = await supabase
      .from('proposal_tracking')
      .select('view_count, proposal_id')
      .eq('tracking_id', trackingId)
      .single();

    if (currentTracking) {
      // Update tracking record with incremented view count
      const { error: trackingError } = await supabase
        .from('proposal_tracking')
        .update({
          viewed: true,
          viewed_at: new Date().toISOString(),
          view_count: (currentTracking.view_count || 0) + 1,
          user_agent: userAgent,
          ip_address: ipAddress,
        })
        .eq('tracking_id', trackingId);

      if (trackingError) {
        console.error('Error updating tracking:', trackingError);
      }

      // Get current proposal view count
      const { data: currentProposal } = await supabase
        .from('proposals')
        .select('view_count')
        .eq('id', currentTracking.proposal_id)
        .single();

      if (currentProposal) {
        // Update proposal view count
        const { error: proposalError } = await supabase
          .from('proposals')
          .update({
            view_count: (currentProposal.view_count || 0) + 1,
            last_viewed_at: new Date().toISOString(),
          })
          .eq('id', currentTracking.proposal_id);

        if (proposalError) {
          console.error('Error updating proposal views:', proposalError);
        }
      }

      // Record in proposal_views table
      await supabase
        .from('proposal_views')
        .insert({
          proposal_id: currentTracking.proposal_id,
          tracking_id: trackingId,
          viewer_ip: ipAddress,
          user_agent: userAgent,
          viewed_at: new Date().toISOString(),
        });
    }
  } catch (error) {
    console.error('Error recording proposal view:', error);
  }
}

interface PublicProposalPageProps {
  params: Promise<{
    trackingId: string;
  }>;
  searchParams: Promise<{
    tracking?: string;
  }>;
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: PublicProposalPageProps) {
  const { trackingId } = await params;
  const { tracking } = await searchParams;

  const data = await getProposalByTracking(trackingId);

  if (!data) {
    notFound();
  }

  const { proposal, tracking: trackingData } = data;

  // Record the view (this will be done server-side)
  // We'll also add client-side tracking for more detailed analytics
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client-side tracking component */}
      <ProposalViewTracker 
        trackingId={trackingId}
        proposalId={proposal.id}
      />
      
      <PublicProposalView 
        proposal={proposal}
        tracking={trackingData}
      />
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ trackingId: string }>;
}) {
  const { trackingId } = await params;
  const data = await getProposalByTracking(trackingId);

  if (!data) {
    return {
      title: 'Proposal Not Found',
    };
  }

  const { proposal } = data;

  return {
    title: `${proposal.title} - ${proposal.company_profiles.company_name}`,
    description: `View proposal for ${proposal.service_type} services at ${proposal.service_location}`,
    robots: 'noindex, nofollow', // Prevent search engine indexing for privacy
  };
}