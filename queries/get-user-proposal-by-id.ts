"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type Proposal = Database["public"]["Tables"]["proposals"]["Row"];

export async function getUserProposalById(
  id: string,
  userId: string,
): Promise<Proposal | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data;
}
