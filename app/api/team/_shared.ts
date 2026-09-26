import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const TEAM_UNAVAILABLE = "Team management is unavailable. Please try again.";

export async function authenticatedTeamClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, user: data.user };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function unavailable() {
  return NextResponse.json({ error: TEAM_UNAVAILABLE }, { status: 503 });
}
