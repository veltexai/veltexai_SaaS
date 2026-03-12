"use client";

import { useState, useCallback } from "react";

const DEFAULT_DOWNLOAD_ERROR = "Failed to generate PDF";

export interface UseProposalActionsOptions {
  proposalId: string;
  clientCompany?: string | null;
  clientName?: string | null;
  canSend: boolean;
  canDownload: boolean;
  isFreeTrial: boolean;
}

export interface UseProposalActionsReturn {
  canSend: boolean;
  canDownload: boolean;
  isFreeTrial: boolean;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (open: boolean) => void;

  handleSendClick: (onSendAllowed: () => void) => void;

  handleDownloadClick: () => Promise<void>;

  downloading: boolean;

  downloadError: string | null;
  clearDownloadError: () => void;
}

export function useProposalActions(
  options: UseProposalActionsOptions,
): UseProposalActionsReturn {
  const { proposalId, clientCompany, clientName, canSend, canDownload, isFreeTrial } = options;

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
    console.log("🚀 ~ useProposalActions ~ canDownload:", canDownload);
    if (!canDownload) {
      setShowUpgradeModal(true);
      return;
    }

    setDownloadError(null);
    setDownloading(true);

    try {
      const res = await fetch(`/api/proposals/${proposalId}/print`);
      if (!res.ok) {
        throw new Error(DEFAULT_DOWNLOAD_ERROR);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposal-${clientCompany || clientName || proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : DEFAULT_DOWNLOAD_ERROR;
      setDownloadError(message);
      console.error("[useProposalActions] Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [proposalId, clientCompany, clientName, canDownload]);

  const clearDownloadError = useCallback(() => {
    setDownloadError(null);
  }, []);

  return {
    canSend,
    canDownload,
    isFreeTrial,
    showUpgradeModal,
    setShowUpgradeModal,
    handleSendClick,
    handleDownloadClick,
    downloading,
    downloadError,
    clearDownloadError,
  };
}
