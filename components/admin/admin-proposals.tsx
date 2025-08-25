import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  total_value: number;
  status: string;
  created_at: string;
  user_email: string;
}

interface AdminProposalsProps {
  proposals: Proposal[];
}

export function AdminProposals({ proposals }: AdminProposalsProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'default' as const;
      case 'sent':
        return 'secondary' as const;
      case 'rejected':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Proposals</CardTitle>
        <CardDescription>Latest proposals created by users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">{proposal.title}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span>Client: {proposal.client_name}</span>
                  <span>Value: {formatCurrency(proposal.total_value)}</span>
                  <span>By: {proposal.user_email}</span>
                  <span>
                    {new Date(proposal.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Badge
                variant={getStatusBadgeVariant(proposal.status)}
                className="capitalize"
              >
                {proposal.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}