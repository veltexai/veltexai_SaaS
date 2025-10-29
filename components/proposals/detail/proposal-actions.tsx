'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { Edit, Download, Send, Loader2, Save, X, Settings } from 'lucide-react';
import { SendProposalModal } from '@/components/proposals/send-proposal-modal';
import { ProposalEditDialog } from '@/components/proposals/proposal-edit-dialog';
import { type Database } from '@/types/database';

type Proposal = Database['public']['Tables']['proposals']['Row'];

interface ProposalActionsProps {
  proposal: Proposal;
  isEditing?: boolean;
  onEditStart?: () => void;
  onEditCancel?: () => void;
  onEditSave?: () => void;
  saving?: boolean;
  onProposalUpdated?: (proposal: Proposal) => void;
}

export function ProposalActions({
  proposal,
  isEditing = false,
  onEditStart,
  onEditCancel,
  onEditSave,
  saving = false,
  onProposalUpdated,
}: ProposalActionsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const updateStatus = async (status: Proposal['status']) => {
    setUpdating(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('proposals')
        .update({ status })
        .eq('id', proposal.id);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error updating proposal status:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to update proposal status'
      );
    } finally {
      setUpdating(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    setError('');

    try {
      const response = await fetch(`/api/proposals/${proposal.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: 'modern',
          includeCompanyInfo: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${proposal.title
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}_proposal.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleSendSuccess = () => {
    setShowSendModal(false);
    router.refresh();
  };

  const handleProposalUpdated = (updatedProposal: Proposal) => {
    onProposalUpdated?.(updatedProposal);
    router.refresh();
  };

  // Convert database Proposal type to SendProposalModal expected type
  const proposalForSendModal = {
    id: proposal.id,
    title: proposal.title,
    client_name: proposal.client_name,
    client_email: proposal.client_email,
    client_company: proposal.client_company || undefined,
    service_type: proposal.service_type,
    status: proposal.status,
  };

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-4 mb-4">
        {!isEditing ? (
          <>
            <Button variant="outline" onClick={onEditStart}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Proposal
            </Button>
            <Button variant="outline" onClick={() => setShowEditDialog(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
            <Button
              variant="outline"
              onClick={exportToPDF}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
            {proposal.status === 'draft' && (
              <Button onClick={() => setShowSendModal(true)}>
                <Send className="mr-2 h-4 w-4" />
                Send Proposal
              </Button>
            )}

            {proposal.status === 'sent' && (
              <>
                <Button
                  onClick={() => setShowSendModal(true)}
                  variant="outline"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Again
                </Button>
                <Button
                  onClick={() => updateStatus('accepted')}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Mark Accepted'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus('rejected')}
                  disabled={updating}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  {updating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Mark Rejected'
                  )}
                </Button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onEditCancel} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={onEditSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        )}
      </div>

      <SendProposalModal
        proposal={proposalForSendModal}
        open={showSendModal}
        onOpenChange={setShowSendModal}
        onSuccess={handleSendSuccess}
      />

      <ProposalEditDialog
        proposal={proposal}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onProposalUpdated={handleProposalUpdated}
      />
    </>
  );
}
