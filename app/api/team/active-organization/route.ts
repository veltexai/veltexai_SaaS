import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedTeamClient, unauthorized, unavailable } from "../_shared";

const switchSchema = z.object({ organizationId: z.string().uuid() }).strict();

export async function GET() {
  try {
    const context = await authenticatedTeamClient();
    if (!context) return unauthorized();
    const { data, error } = await context.supabase
      .from("profiles")
      .select("active_organization_id")
      .eq("id", context.user.id)
      .single();
    if (error || !data) return unavailable();
    return NextResponse.json({ data: data.active_organization_id ?? null });
  } catch {
    return unavailable();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await authenticatedTeamClient();
    if (!context) return unauthorized();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid organization." }, { status: 400 });
    }
    const parsed = switchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid organization." }, { status: 400 });
    }

    // The database trigger is the final guard. This membership precheck makes
    // the public response stable without exposing whether another tenant exists.
    const { data: membership, error: membershipError } = await context.supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("organization_id", parsed.data.organizationId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (membershipError) return unavailable();
    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to that organization." },
        { status: 403 },
      );
    }

    const { data: updated, error } = await context.supabase
      .from("profiles")
      .update({ active_organization_id: parsed.data.organizationId })
      .eq("id", context.user.id)
      .select("active_organization_id")
      .maybeSingle();
    if (error) {
      if (error.code === "42501") {
        return NextResponse.json(
          { error: "You do not have access to that organization." },
          { status: 403 },
        );
      }
      return unavailable();
    }
    if (!updated || updated.active_organization_id !== parsed.data.organizationId) {
      return unavailable();
    }
    return NextResponse.json({ data: null });
  } catch {
    return unavailable();
  }
}
