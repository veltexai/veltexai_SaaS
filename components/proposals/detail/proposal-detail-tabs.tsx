'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProposalEditWrapper } from './proposal-edit-wrapper';
import { ProposalAnalytics } from '../proposal-analytics';
import { ProposalStatusHistory } from './proposal-status-history';
import { Edit, BarChart3, History, Eye } from 'lucide-react';
import { Database } from '@/types/database';

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
        <div className="bg-white border rounded-lg p-6">
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold mb-4">{proposal.title}</h2>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Client Information</h3>
              <p>
                <strong>Name:</strong> {proposal.client_name}
              </p>
              <p>
                <strong>Email:</strong> {proposal.client_email}
              </p>
              <p>
                <strong>Company:</strong> {proposal.client_company || 'N/A'}
              </p>
              <p>
                <strong>Phone:</strong> {proposal.contact_phone}
              </p>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Service Details</h3>
              <p>
                <strong>Location:</strong> {proposal.service_location}
              </p>
              <p>
                <strong>Type:</strong> {proposal.service_type}
              </p>
              <p>
                <strong>Frequency:</strong> {proposal.service_frequency}
              </p>
              <p>
                <strong>Facility Size:</strong> {proposal.facility_size} sq ft
              </p>
            </div>
            {proposal.generated_content && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Proposal Content</h3>
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: proposal.generated_content || '',
                  }}
                />
              </div>
            )}
            {proposal.pricing_enabled && proposal.pricing_data && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Pricing Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm">
                    {JSON.stringify(proposal.pricing_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <ProposalStatusHistory proposalId={proposal.id} />
      </TabsContent>
    </Tabs>
  );
}
