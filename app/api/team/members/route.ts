import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isOrganizationRole } from "@/features/organizations/types/organization";
import { authenticatedTeamClient, unauthorized, unavailable } from "../_shared";

const querySchema = z.string().uuid();

export async function GET(request: NextRequest) {
  try {
    const context = await authenticatedTeamClient();
    if (!context) return unauthorized();
    const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("organizationId"));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid organization." }, { status: 400 });
    }

    // RLS returns no rows for non-members. No service-role client is used, so
    // profiles.email and every other profile contact field remain unreachable.
    const { data, error } = await context.supabase
      .from("organization_memberships")
      .select("organization_id,user_id,role,created_at")
      .eq("organization_id", parsed.data)
      .order("created_at", { ascending: true });
    if (error || !Array.isArray(data)) return unavailable();

    const members = data.flatMap((row) => {
      if (!isOrganizationRole(row.role)) return [];
      return [{
        id: `${row.organization_id}:${row.user_id}`,
        organizationId: row.organization_id,
        userId: row.user_id,
        // Deliberately non-identifying until a reviewed display-name projection exists.
        name: row.user_id === context.user.id ? "You" : "Team member",
        role: row.role,
        status: "active" as const,
        joinedAt: row.created_at,
      }];
    });
    return NextResponse.json({ data: members });
  } catch {
    return unavailable();
  }
}
