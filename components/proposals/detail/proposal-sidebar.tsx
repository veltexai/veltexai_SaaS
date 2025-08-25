import { ClientInfoCard } from './client-info-card';
import { ProjectDetailsCard } from './project-details-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Proposal {
  id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  budget_range: string;
  timeline: string;
  value: number;
  project_description: string;
  services_offered: string;
}

interface ProposalSidebarProps {
  proposal: Proposal;
}

export function ProposalSidebar({ proposal }: ProposalSidebarProps) {
  return (
    <div className="space-y-6">
      <ClientInfoCard proposal={proposal} />
      <ProjectDetailsCard proposal={proposal} />

      {/* Project Description */}
      <Card>
        <CardHeader>
          <CardTitle>Project Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">
            {proposal.project_description}
          </p>
        </CardContent>
      </Card>

      {proposal.services_offered && (
        <Card>
          <CardHeader>
            <CardTitle>Services Offered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {proposal.services_offered}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
