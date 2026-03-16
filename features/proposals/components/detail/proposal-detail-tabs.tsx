import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProposalEditWrapper } from "./proposal-edit-wrapper";
import { ProposalStatusHistory } from "./proposal-status-history";
import { Edit, History, Eye } from "lucide-react";
import { Database } from "@/types/database";
import { TemplateRenderer } from "@/features/templates";
import type { ProposalPermissions } from "@/features/proposals/types/proposals";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

interface ProposalDetailTabsProps {
  proposal: Proposal;
  permissions: ProposalPermissions;
}

export function ProposalDetailTabs({
  proposal,
  permissions,
}: ProposalDetailTabsProps) {
  return (
    <Tabs defaultValue="edit" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto p-1">
        <TabsTrigger
          value="edit"
          className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-4 text-xs sm:text-sm"
        >
          <Edit className="h-4 w-4 flex-shrink-0" />
          <span className="hidden xs:inline">Edit</span>
        </TabsTrigger>
        <TabsTrigger
          value="preview"
          className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-4 text-xs sm:text-sm"
        >
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span className="hidden xs:inline">Preview</span>
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:px-4 text-xs sm:text-sm"
        >
          <History className="h-4 w-4 flex-shrink-0" />
          <span className="hidden xs:inline">History</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="edit" className="mt-4 sm:mt-6">
        <ProposalEditWrapper proposal={proposal} permissions={permissions} />
      </TabsContent>

      <TabsContent value="preview" className="mt-4 sm:mt-6">
        <div className="p-2 sm:p-4 md:p-6 overflow-x-auto">
          <TemplateRenderer proposal={proposal} />
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-4 sm:mt-6">
        <ProposalStatusHistory proposalId={proposal.id} />
      </TabsContent>
    </Tabs>
  );
}
