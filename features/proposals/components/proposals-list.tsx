import { ProposalCard } from "./proposal-card";
import type {
  Proposal,
  ProposalPermissions,
} from "@/features/proposals/types/proposal";

interface ProposalsListProps {
  proposals: Proposal[];
  permissions: ProposalPermissions;
}

export function ProposalsList({ proposals, permissions }: ProposalsListProps) {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          permissions={permissions}
        />
      ))}
    </div>
  );
}
