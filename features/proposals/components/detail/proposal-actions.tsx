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
  const [error, setError] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        {!isEditing ? (
          <>
            {/* Primary Actions - First Row */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={onEditStart}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Edit className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit Proposal</span>
                <span className="sm:hidden">Edit</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowEditDialog(true)}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Edit Details</span>
                <span className="sm:hidden">Details</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={downloading}
                className="flex-1 sm:flex-none"
                onClick={async () => {
                  try {
                    setError('');
                    setDownloading(true);
                    const res = await fetch(
                      `/api/proposals/${proposal.id}/print`
                    );
                    if (!res.ok) throw new Error('Failed to generate PDF');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `proposal-${
                      proposal.client_company ||
                      proposal.client_name ||
                      proposal.id
                    }.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(url);
                  } catch (e: any) {
                    setError(e?.message ?? 'Failed to generate PDF');
                    console.error(e);
                  } finally {
                    setDownloading(false);
                  }
                }}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                ) : (
                  <Download className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">{downloading ? 'Exporting…' : 'Export PDF'}</span>
                <span className="sm:hidden">{downloading ? '...' : 'PDF'}</span>
              </Button>
            </div>

            {/* Status Actions - Second Row on Mobile */}
            {proposal.status === 'draft' && (
              <Button 
                onClick={() => setShowSendModal(true)}
                size="sm"
                className="w-full sm:w-auto"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Proposal
              </Button>
            )}

            {proposal.status === 'sent' && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowSendModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Send className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Send Again</span>
                  <span className="sm:hidden">Resend</span>
                </Button>
                <Button
                  onClick={() => updateStatus('accepted')}
                  disabled={updating}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Mark </span>Accepted
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus('rejected')}
                  disabled={updating}
                  size="sm"
                  className="text-red-600 border-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Mark </span>Rejected
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onEditCancel} 
              disabled={saving}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <X className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
            <Button 
              onClick={onEditSave} 
              disabled={saving}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
              ) : (
                <Save className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Save</span>
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
