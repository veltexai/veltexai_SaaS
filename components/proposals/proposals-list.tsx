'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProposalCard } from './proposal-card';

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  value: number;
  created_at: string;
  updated_at: string;
}

interface ProposalsListProps {
  proposals: Proposal[];
}

export function ProposalsList({
  proposals: initialProposals,
}: ProposalsListProps) {
  const [proposals, setProposals] = useState(initialProposals);
  const [error, setError] = useState('');

  const handleUpdate = (id: string, updates: Partial<Proposal>) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    setError('');
  };

  const handleDelete = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
    setError('');
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 grid-cols-2">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
