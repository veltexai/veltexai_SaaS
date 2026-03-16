import { redirect } from "next/navigation";
import { getUser } from "@/queries/user";
import { ProposalsHeader } from "@/features/proposals/components/proposals-header";
import { ProposalsList } from "@/features/proposals/components/proposals-list";
import { EmptyProposals } from "@/features/proposals/components/empty-proposals";
import { getUserProposals } from "@/queries/get-user-proposals";
import { getProposalPermissions } from "@/queries/get-proposal-permissions";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const { user } = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [proposals, permissions] = await Promise.all([
    getUserProposals(user.id),
    getProposalPermissions(user.id),
  ]);

  return (
    <div className="space-y-6">
      <ProposalsHeader />
      {proposals.length === 0 ? (
        <EmptyProposals />
      ) : (
        <ProposalsList proposals={proposals} permissions={permissions} />
      )}
    </div>
  );
}
