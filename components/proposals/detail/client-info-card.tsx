import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Proposal {
  client_name: string;
  client_email: string;
  client_company: string;
}

interface ClientInfoCardProps {
  proposal: Proposal;
}

export function ClientInfoCard({ proposal }: ClientInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-600">Name</label>
          <p className="text-sm">{proposal.client_name}</p>
        </div>
        {proposal.client_email && (
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <p className="text-sm">{proposal.client_email}</p>
          </div>
        )}
        {proposal.client_company && (
          <div>
            <label className="text-sm font-medium text-gray-600">Company</label>
            <p className="text-sm">{proposal.client_company}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
