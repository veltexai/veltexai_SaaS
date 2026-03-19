"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Download, Send, Loader2, Save, X, Settings } from "lucide-react";
import { SendProposalModal } from "@/features/proposals/components/send-proposal-modal";
import { ProposalEditDialog } from "@/features/proposals/components/proposal-edit-dialog";
import { UpgradeModal } from "@/features/billing/components/upgrade-modal";
import { useProposalActions } from "@/features/proposals/hooks/use-proposal-actions";
import { type Database } from "@/types/database";
import { ProposalStatusActions } from "./proposal-status-actions";
import { useProposalStatus } from "../../hooks/use-proposal-status";
import { toSendModalProposal } from "../../utils/send-modal-proposal";
import { useRouter } from "next/navigation";
import { ProposalPermissions } from "../../types/proposal";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

interface ProposalActionsProps {
  proposal: Proposal;
  isEditing?: boolean;
  onEditStart?: () => void;
  onEditCancel?: () => void;
  onEditSave?: () => void;
  saving?: boolean;
  onProposalUpdated?: (proposal: Proposal) => void;
  permissions: ProposalPermissions;
}

export function ProposalActions({
  proposal,
  isEditing = false,
  onEditStart,
  onEditCancel,
  onEditSave,
  saving = false,
  onProposalUpdated,
  permissions,
}: ProposalActionsProps) {
  const router = useRouter();
  const { updateStatus, updating, statusError } = useProposalStatus(
    proposal.id,
    () => router.refresh(),
  );
  const [showSendModal, setShowSendModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const {
    handleSendClick,
    handleDownloadClick,
    downloading,
    downloadError,
    clearDownloadError,
    showUpgradeModal,
    setShowUpgradeModal,
  } = useProposalActions({
    proposalId: proposal.id,
    clientCompany: proposal.client_company,
    clientName: proposal.client_name,
    canSend: permissions.canSend,
    canDownload: permissions.canDownload,
  });

  const handleSendSuccess = () => {
    setShowSendModal(false);
    router.refresh();
  };

  const handleProposalUpdated = (updatedProposal: Proposal) => {
    onProposalUpdated?.(updatedProposal);
    router.refresh();
  };

  const handleSendModalOpen = () =>
    handleSendClick(() => setShowSendModal(true));

  const proposalForSendModal = toSendModalProposal(proposal);

  return (
    <>
      {statusError && (
        <Alert variant="destructive">
          <AlertDescription>{statusError}</AlertDescription>
        </Alert>
      )}
      {downloadError && (
        <Alert variant="destructive">
          <AlertDescription>
            {downloadError}
            <button onClick={clearDownloadError} className="ml-2 underline">
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        {!isEditing ? (
          <>
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
                onClick={handleDownloadClick}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                ) : (
                  <Download className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">
                  {downloading ? "Exporting..." : "Export PDF"}
                </span>
                <span className="sm:hidden">{downloading ? "..." : "PDF"}</span>
              </Button>
            </div>

            <ProposalStatusActions
              status={proposal.status}
              updating={updating}
              onSend={handleSendModalOpen}
              onMarkAccepted={() => updateStatus("accepted")}
              onMarkRejected={() => updateStatus("rejected")}
            />
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

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  );
}
