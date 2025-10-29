import { ClientInfoCard } from './client-info-card';
import { ProjectDetailsCard } from './project-details-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from '@/types/database';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProposalSidebarProps {
  proposal: Proposal;
}

export function ProposalSidebar({ proposal }: ProposalSidebarProps) {
  return (
    <div className="space-y-6">
      <ClientInfoCard proposal={proposal} />
      <ProjectDetailsCard proposal={proposal} />

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Service Type</label>
              <p className="text-sm capitalize">{proposal.service_type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p className="text-sm">{proposal.service_location}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Frequency</label>
              <p className="text-sm capitalize">{proposal.service_frequency}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Facility Size</label>
              <p className="text-sm">{proposal.facility_size} sq ft</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
