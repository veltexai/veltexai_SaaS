import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PublicProposalView } from '@/features/proposals/components/public-proposal-view';
import { ProposalViewTracker } from '@/features/proposals/components/proposal-view-tracker';

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

  const { data, error } = await supabase.rpc('read_tracked_proposal', { token: trackingId });
  if (error || !data) return null;
  return data as { proposal: ProposalData; tracking: TrackingData };
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