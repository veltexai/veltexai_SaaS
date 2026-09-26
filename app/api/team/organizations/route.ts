import { NextResponse } from "next/server";
import { authenticatedTeamClient, unauthorized, unavailable } from "../_shared";

type MembershipRow = {
  organizations: { id: string; name: string; slug: string } | null;
};

export async function GET() {
  try {
    const context = await authenticatedTeamClient();
    if (!context) return unauthorized();

    const { data, error } = await context.supabase
      .from("organization_memberships")
      .select("organizations!inner(id,name,slug)")
      .eq("user_id", context.user.id);
    if (error || !Array.isArray(data)) return unavailable();

    const organizations = (data as unknown as MembershipRow[])
      .map((row) => row.organizations)
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    return NextResponse.json({ data: organizations });
  } catch {
    return unavailable();
  }
}
