"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProposalStatus } from "@/features/proposals/types/proposals";

const DEFAULT_DOWNLOAD_ERROR = "Failed to generate PDF";

export interface UseProposalActionsOptions {
  proposalId: string;
  clientName?: string | null;
  clientCompany?: string | null;
  canSend: boolean;
  canDownload: boolean;
}

export interface UseProposalActionsReturn {
  showUpgradeModal: boolean;
  setShowUpgradeModal: (open: boolean) => void;

  handleSendClick: (onSendAllowed: () => void) => void;

  handleDownloadClick: () => Promise<void>;
  downloading: boolean;
  downloadError: string | null;
  clearDownloadError: () => void;

  handleDeleteProposal: () => Promise<void>;
  isDeleting: boolean;

  handleUpdateStatus: (status: ProposalStatus) => Promise<void>;
  isUpdatingStatus: boolean;

  mutationError: string | null;
  clearMutationError: () => void;
}

export function useProposalActions(
  options: UseProposalActionsOptions,
): UseProposalActionsReturn {
  const { proposalId, clientName, canSend, canDownload } = options;
  const router = useRouter();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const handleSendClick = useCallback(
    (onSendAllowed: () => void) => {
      if (!canSend) {
        setShowUpgradeModal(true);
        return;
      }
      onSendAllowed();
    },
    [canSend],
  );

  const handleDownloadClick = useCallback(async () => {
    if (!canDownload) {
      setShowUpgradeModal(true);
      return;
    }

    setDownloadError(null);
    setDownloading(true);

    try {
      const res = await fetch(`/api/proposals/${proposalId}/print`);
      if (!res.ok) throw new Error(DEFAULT_DOWNLOAD_ERROR);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${clientName || proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : DEFAULT_DOWNLOAD_ERROR,
      );
    } finally {
      setDownloading(false);
    }
  }, [proposalId, clientName, canDownload]);

  const handleDeleteProposal = useCallback(async () => {
    setMutationError(null);
    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposalId);

      if (error) throw error;

      router.refresh();
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : "Failed to delete proposal",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [proposalId, router]);

  const handleUpdateStatus = useCallback(
    async (status: ProposalStatus) => {
      setMutationError(null);
      setIsUpdatingStatus(true);

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("proposals")
          .update({ status })
          .eq("id", proposalId);

        if (error) throw error;

        router.refresh();
      } catch (err) {
        setMutationError(
          err instanceof Error
            ? err.message
            : "Failed to update proposal status",
        );
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [proposalId, router],
  );

  const clearDownloadError = useCallback(() => setDownloadError(null), []);
  const clearMutationError = useCallback(() => setMutationError(null), []);

  return {
    showUpgradeModal,
    setShowUpgradeModal,
    handleSendClick,
    handleDownloadClick,
    downloading,
    downloadError,
    clearDownloadError,
    handleDeleteProposal,
    isDeleting,
    handleUpdateStatus,
    isUpdatingStatus,
    mutationError,
    clearMutationError,
  };
}
