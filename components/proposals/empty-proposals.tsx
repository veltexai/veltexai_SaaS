import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus } from 'lucide-react';

export function EmptyProposals() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No proposals yet
        </h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          Create your first proposal to get started with winning new clients.
        </p>
        <Link href="/dashboard/proposals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Proposal
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}