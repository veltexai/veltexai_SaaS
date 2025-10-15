'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ProposalActions } from './proposal-actions';
import { ProposalContent } from './proposal-content';

interface Proposal {
  id: string;
  title: string;
  client_name: string;
  client_email: string;
  client_company: string;
  contact_phone: string;
  service_location: string;
  facility_size: number;
  service_type: string;
  service_frequency: string;
  service_specific_data: any;
  global_inputs: any;
  pricing_enabled: boolean;
  pricing_data: any;
  generated_content: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface ProposalEditWrapperProps {
  proposal: Proposal;
}

export function ProposalEditWrapper({ proposal: initialProposal }: ProposalEditWrapperProps) {
  const [proposal, setProposal] = useState(initialProposal);
  const [isEditing, setIsEditing] = useState(false);
  const [contentDraft, setContentDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEditStart = () => {
    setContentDraft(proposal.generated_content || '');
    setTitleDraft(proposal.title || '');
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setContentDraft('');
    setTitleDraft('');
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('proposals')
        .update({
          title: titleDraft,
          generated_content: contentDraft,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;

      setProposal(prev => ({
        ...prev,
        title: titleDraft,
        generated_content: contentDraft,
      }));
      setIsEditing(false);
      setContentDraft('');
      setTitleDraft('');
      toast.success('Proposal updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating proposal:', error);
      toast.error('Failed to update proposal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ProposalActions
        proposal={proposal}
        isEditing={isEditing}
        onEditStart={handleEditStart}
        onEditCancel={handleEditCancel}
        onEditSave={handleEditSave}
        saving={saving}
      />
      <ProposalContent 
        proposal={proposal}
        isEditing={isEditing}
        contentDraft={contentDraft}
        titleDraft={titleDraft}
        onContentChange={setContentDraft}
        onTitleChange={setTitleDraft}
      />
    </>
  );
}
