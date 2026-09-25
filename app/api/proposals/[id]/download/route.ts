import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateProposalPDF } from "@/features/proposals/services/pdf/generator";
import { getUser } from "@/features/auth/services/get-user";
import { canUsePaidProposalActions } from "@/lib/billing/proposal-entitlements";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get("tracking");

    const sessionClient = await createClient();
    const { user } = await getUser();
    let supabase = sessionClient;
    let trackedProposal: any = null;
    if (trackingId) {
      const { data, error } = await sessionClient.rpc("read_tracked_proposal", {
        token: trackingId,
      });
      const payload = data as { proposal?: any; tracking?: { proposal_id?: string } } | null;
      if (error || payload?.tracking?.proposal_id !== id || !payload.proposal) {
        return NextResponse.json({ error: "Invalid or expired download link" }, { status: 404 });
      }
      trackedProposal = payload.proposal;
    } else if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Fetch proposal data
    let proposalQuery = supabase
      .from("proposals")
      .select(
        `
        *,
        company_profiles (
          company_name,
          logo_url,
          primary_color,
          secondary_color
        )
      `,
      )
      .eq("id", id);
    if (!trackingId && user) proposalQuery = proposalQuery.eq("user_id", user.id);
    const proposalResult = trackedProposal
      ? { data: trackedProposal, error: null }
      : await proposalQuery.single();
    const { data: proposal, error: proposalError } = proposalResult;

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 },
      );
    }

    const hasPaidAccess = trackingId
      ? Boolean((await supabase.rpc("tracked_proposal_has_paid_access", { token: trackingId })).data)
      : await canUsePaidProposalActions(supabase, proposal.user_id);
    if (!hasPaidAccess) {
      return NextResponse.json({ error: "A paid plan is required to download proposals", code: "PAID_PLAN_REQUIRED" }, { status: 403 });
    }

    // Generate PDF
    const pdfBuffer = await generateProposalPDF(proposal);

    // Track download if tracking ID is provided
    if (trackingId) {
      const { error: trackingError } = await supabase.rpc("record_tracked_download", {
        token: trackingId,
      });
      if (trackingError) console.error("Error updating download tracking:", trackingError);
    }

    // Return PDF
    const filename = `${proposal.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}
