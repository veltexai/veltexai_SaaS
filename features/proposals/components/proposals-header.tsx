import { Plus } from 'lucide-react';
import { NavButton } from '@/components/ui/nav-button';

export function ProposalsHeader() {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Proposals</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your business proposals and track their status.
        </p>
      </div>
      <NavButton href="/dashboard/proposals/new" icon={<Plus className="h-4 w-4" />}>
        New Proposal
      </NavButton>
    </div>
  );
}