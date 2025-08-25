import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ProposalsHeader() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your business proposals and track their status.
        </p>
      </div>
      <Link href="/dashboard/proposals/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Proposal
        </Button>
      </Link>
    </div>
  );
}