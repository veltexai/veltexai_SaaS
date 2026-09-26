import { NextResponse } from "next/server";
import { authenticatedTeamClient, unauthorized, unavailable } from "../_shared";

export async function GET() {
  try {
    const context = await authenticatedTeamClient();
    if (!context) return unauthorized();

    // Neither invitation consent/delivery nor a reviewed contact-detail
    // projection exists. Authentication is necessary but does not grant them.
    return NextResponse.json({
      data: { invitationsEnabled: false, contactDetailsEnabled: false },
    });
  } catch {
    return unavailable();
  }
}
