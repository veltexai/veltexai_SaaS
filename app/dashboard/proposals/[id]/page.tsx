import { notFound, redirect } from "next/navigation";
import { getUser } from "@/queries/user";
import { ProposalHeader } from "@/features/proposals/components/detail/proposal-header";
import { ProposalSidebar } from "@/features/proposals/components/detail/proposal-sidebar";
import { ProposalDetailTabs } from "@/features/proposals/components/detail/proposal-detail-tabs";
import { getUserProposalById } from "@/queries/get-user-proposal-by-id";
import { getProposalPermissions } from "@/queries/get-proposal-permissions";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProposalViewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProposalViewPage({
  params,
}: ProposalViewPageProps) {
  const { user } = await getUser();

  if (!user) {
    redirect("/auth/login");
  }
  const { id } = await params;

  const [proposal, permissions] = await Promise.all([
    getUserProposalById(id, user.id),
    getProposalPermissions(user.id),
  ]);

  if (!proposal) {
    notFound();
  }

  return (
    <div className="space-y-6 relative">
      <ProposalHeader proposal={proposal} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProposalDetailTabs proposal={proposal} permissions={permissions} />
        </div>
        <div className="sticky top-[84px] mt-[120px] h-fit">
          <ProposalSidebar proposal={proposal} />
        </div>
      </div>
    </div>
  );
}
