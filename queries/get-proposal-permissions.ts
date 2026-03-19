"use server";

import type { ProposalPermissions } from "@/features/proposals/types/proposal";
import { createClient } from "@/lib/supabase/server";
interface RawUsageInfo {
  can_create_proposal: boolean;
  subscription_status: string;
}

export async function getProposalPermissions(
  userId: string,
): Promise<ProposalPermissions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_user_usage_info", { user_uuid: userId })
    .single();

  if (error || !data) {
    console.error("Error fetching proposal permissions:", error);
    return {
      canCreate: false,
      canSend: false,
      canDownload: false,
      isFreeTrial: false,
    };
  }

  const usage = data as RawUsageInfo;
  const isPaid = usage.subscription_status === "active";

  return {
    canCreate: usage.can_create_proposal,
    canSend: isPaid,
    canDownload: isPaid,
    isFreeTrial: usage.subscription_status === "free_trial",
  };
}
