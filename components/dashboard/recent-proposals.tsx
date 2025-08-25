import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Plus,
  Eye,
} from 'lucide-react';

interface RecentProposal {
  id: string;
  title: string;
  client_name: string;
  status: string;
  created_at: string;
  value: number;
}

interface RecentProposalsProps {
  proposals: RecentProposal[];
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft':
      return 'text-gray-600 bg-gray-100';
    case 'sent':
      return 'text-blue-600 bg-blue-100';
    case 'viewed':
      return 'text-yellow-600 bg-yellow-100';
    case 'accepted':
      return 'text-green-600 bg-green-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function RecentProposals({ proposals }: RecentProposalsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Proposals</CardTitle>
            <CardDescription>Your latest proposal activity</CardDescription>
          </div>
          <Link href="/dashboard/proposals">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No proposals yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first proposal.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/proposals/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Proposal
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {proposal.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {proposal.client_name} •{' '}
                        {formatDate(proposal.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      proposal.status
                    )}`}
                  >
                    {proposal.status.charAt(0).toUpperCase() +
                      proposal.status.slice(1)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(proposal.value || 0)}
                  </span>
                  <Link href={`/dashboard/proposals/${proposal.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}