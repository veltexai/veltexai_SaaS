"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/use-auth";

interface ProposalPermissions {
  canCreate: boolean;
  canSend: boolean;
  canDownload: boolean;
  currentUsage: number;
  proposalLimit: number;
  remainingProposals: number;
  isTrial: boolean;
  isFreeTrial: boolean;
  subscriptionStatus: string;
  loading: boolean;
  error: string | null;
}

export function useProposalPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ProposalPermissions>({
    canCreate: false,
    canSend: false,
    canDownload: false,
    currentUsage: 0,
    proposalLimit: 0,
    remainingProposals: 0,
    isTrial: false,
    isFreeTrial: false,
    subscriptionStatus: "free_trial",
    loading: true,
    error: null,
  });

  const checkPermissions = useCallback(async () => {
    try {
      setPermissions((prev) => ({ ...prev, loading: true, error: null }));

      const response = await fetch("/api/usage/check");
      console.log("🚀 ~ useProposalPermissions ~ response:", response);
      if (!response.ok) {
        throw new Error("Failed to check permissions");
      }

      const data = await response.json();
      console.log("🚀 ~ checkPermissions ~ data:", data);
      const isFreeTrial = data.subscriptionStatus === "free_trial";
      const isPaid = data.subscriptionStatus === "active";

      setPermissions({
        canCreate: data.canCreateProposal,
        canSend: isPaid,
        canDownload: isPaid,
        currentUsage: data.currentUsage,
        proposalLimit: data.proposalLimit,
        remainingProposals: data.remainingProposals,
        isTrial: data.isTrial,
        isFreeTrial,
        subscriptionStatus: data.subscriptionStatus,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error checking proposal permissions:", error);
      setPermissions((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to check permissions",
      }));
    }
  }, []);

  useEffect(() => {
    console.log("🚀 ~ useProposalPermissions ~ user:", user);
    if (user) {
      checkPermissions();
    } else {
      setPermissions((prev) => ({ ...prev, loading: false }));
    }
  }, [user, checkPermissions]);

  return {
    ...permissions,
    refetch: checkPermissions,
  };
}
