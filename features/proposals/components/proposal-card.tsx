"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Trash2, Loader2, Send } from "lucide-react";
import { SendProposalModal } from "@/features/proposals/components/send-proposal-modal";
import { UpgradeModal } from "@/features/billing/components/upgrade-modal";
import { useProposalActions } from "@/features/proposals/hooks/use-proposal-actions";
import { formatDate } from "@/lib/utils";
import type {
  Proposal,
  ProposalPermissions,
} from "@/features/proposals/types/proposals";

interface ProposalCardProps {
  proposal: Proposal;
  permissions: ProposalPermissions;
}

const statusColors: Record<Proposal["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusLabels: Record<Proposal["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

export function ProposalCard({ proposal, permissions }: ProposalCardProps) {
  const router = useRouter();
  const [showSendModal, setShowSendModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const {
    handleSendClick,
    handleDownloadClick,
    handleDeleteProposal,
    handleUpdateStatus,
    isDeleting,
    isUpdatingStatus,
    downloading,
    downloadError,
    clearDownloadError,
    mutationError,
    clearMutationError,
    showUpgradeModal,
    setShowUpgradeModal,
  } = useProposalActions({
    proposalId: proposal.id,
    clientName: proposal.client_name,
    canSend: permissions.canSend,
    canDownload: permissions.canDownload,
  });

  const handleCardClick = useCallback(() => {
    router.push(`/dashboard/proposals/${proposal.id}`);
  }, [router, proposal.id]);

  const handleDownloadButtonClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await handleDownloadClick();
    },
    [handleDownloadClick],
  );

  const handleSendSuccess = useCallback(() => {
    setShowSendModal(false);
    router.refresh();
  }, [router]);

  const displayError = mutationError || downloadError;
  const clearDisplayError = mutationError
    ? clearMutationError
    : clearDownloadError;

  return (
    <>
      {displayError && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>
            {displayError}
            <button
              type="button"
              onClick={clearDisplayError}
              className="ml-2 underline focus:outline-none"
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleCardClick}
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl truncate">
                {proposal.title}
              </CardTitle>
              <CardDescription className="mt-1 text-sm truncate">
                Client: {proposal.client_name}
                <span className="hidden sm:inline">
                  {proposal.client_email && ` (${proposal.client_email})`}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColors[proposal.status]}`}
              >
                {statusLabels[proposal.status]}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col gap-3">
            {(proposal.status === "draft" || proposal.status === "sent") && (
              <div
                className="flex flex-wrap gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {proposal.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendClick(() => setShowSendModal(true));
                    }}
                    disabled={isUpdatingStatus}
                    className="flex-1 sm:flex-none"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                )}

                {proposal.status === "sent" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendClick(() => setShowSendModal(true));
                      }}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 flex-1 sm:flex-none"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      <span className="hidden xs:inline">Send Again</span>
                      <span className="xs:hidden">Resend</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus("accepted");
                      }}
                      disabled={isUpdatingStatus}
                      className="text-green-600 border-green-600 hover:bg-green-50 flex-1 sm:flex-none"
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span className="hidden sm:inline">Mark </span>
                          Accepted
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus("rejected");
                      }}
                      disabled={isUpdatingStatus}
                      className="text-red-600 border-red-600 hover:bg-red-50 flex-1 sm:flex-none"
                    >
                      {isUpdatingStatus ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span className="hidden sm:inline">Mark </span>
                          Rejected
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={handleDownloadButtonClick}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">PDF</span>
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
                disabled={isDeleting}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-col xs:flex-row xs:items-center gap-1 xs:gap-3 text-xs sm:text-sm text-gray-600">
              <div>
                <span className="font-medium">Created:</span>{" "}
                {formatDate(proposal.created_at)}
              </div>
              <div>
                <span className="font-medium">Updated:</span>{" "}
                {formatDate(proposal.updated_at)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{proposal.title}&rdquo; will be permanently deleted. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteProposal}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SendProposalModal
        proposal={proposal}
        open={showSendModal}
        onOpenChange={setShowSendModal}
        onSuccess={handleSendSuccess}
      />

      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </>
  );
}
