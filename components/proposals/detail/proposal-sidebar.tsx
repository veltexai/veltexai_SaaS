import { ClientInfoCard } from './client-info-card';
import { ProjectDetailsCard } from './project-details-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Proposal {
  id: string;
  client_name: string;
  client_email: string;
  client_company: string;
  service_location: string;
  service_type: string;
  service_frequency: string;
  facility_size: number;
  pricing_data: any;
  generated_content: string;
}

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
