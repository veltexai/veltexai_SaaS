import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid(),
  trackingId: z.string().uuid(),
});

const bodySchema = z.object({
  reason: z.string().trim().max(240).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; trackingId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    parsedBody = bodySchema.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("revoke_tracked_proposal_link", {
    tracking_uuid: parsedParams.data.trackingId,
    proposal_uuid: parsedParams.data.id,
    reason: parsedBody.reason || null,
  });

  if (error) {
    return NextResponse.json(
      { error: "Unable to revoke delivery link" },
      { status: 503 },
    );
  }

  if (data !== true) {
    // Missing, cross-tenant, and unauthorized records are intentionally
    // indistinguishable so this endpoint cannot be used as an ID oracle.
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
