import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: proposalId } = await params;
  const { data: proposal } = await supabase
    .from("proposals")
    .select("id,organization_id")
    .eq("id", proposalId)
    .maybeSingle();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const [{ data: membership }, { data: links, error }] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", proposal.organization_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("proposal_tracking")
      .select(
        "id,recipient_email,delivery_method,email_sent_at,created_at,view_count,download_count,revoked_at",
      )
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    return NextResponse.json(
      { error: "Unable to load delivery links" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    links: links ?? [],
    canRevoke: membership?.role === "owner" || membership?.role === "admin",
  });
}
