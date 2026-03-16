"use server";

import { Proposal } from "@/features/proposals/types/proposals";
import { createClient } from "@/lib/supabase/server";

export async function getUserProposals(userId: string): Promise<Proposal[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching proposals:", error);
    return [];
  }

  return (data as Proposal[]) ?? [];
}
