import { createClient } from "@/lib/supabase/client";
import { Proposal } from "@/types/database";
import { useState } from "react";

export function useProposalStatus(proposalId: string, onSuccess: () => void) {
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState("");

  const updateStatus = async (status: Proposal["status"]) => {
    setUpdating(true);
    setStatusError("");

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("proposals")
        .update({ status })
        .eq("id", proposalId);

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error("Error updating proposal status:", error);
      setStatusError(
        error instanceof Error
          ? error.message
          : "Failed to update proposal status",
      );
    } finally {
      setUpdating(false);
    }
  };

  return { updating, statusError, updateStatus };
}
