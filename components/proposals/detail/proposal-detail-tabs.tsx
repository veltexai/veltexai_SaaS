'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProposalEditWrapper } from './proposal-edit-wrapper';
import { ProposalAnalytics } from '../proposal-analytics';
import { ProposalStatusHistory } from './proposal-status-history';
import { Edit, BarChart3, History, Eye } from 'lucide-react';
import { Database } from '@/types/database';
import { TemplateRenderer } from '../templates';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProposalDetailTabsProps {
  proposal: Proposal;
}

export function ProposalDetailTabs({ proposal }: ProposalDetailTabsProps) {
  return (
    <Tabs defaultValue="edit" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="edit" className="flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </TabsTrigger>
        {/* <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger> */}
        <TabsTrigger value="preview" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2">
          <History className="h-4 w-4" />
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="edit" className="mt-6">
        <ProposalEditWrapper proposal={proposal} />
      </TabsContent>

      {/* <TabsContent value="analytics" className="mt-6">
        <ProposalAnalytics proposalId={proposal.id} />
      </TabsContent> */}

      <TabsContent value="preview" className="mt-6">
        <div className="p-6">
          <TemplateRenderer proposal={proposal} />
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <ProposalStatusHistory proposalId={proposal.id} />
      </TabsContent>
    </Tabs>
  );
}
