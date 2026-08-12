import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadOutboundCompliance } from "@/100X/100C/src/compliance";
import { evaluateCompliancePreflight } from "@/100X/100C/src/preflight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.VELTEX_100G_CRON_SECRET ?? process.env.CRON_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !actual) return false;
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = evaluateCompliancePreflight(loadOutboundCompliance(process.env), {
    globalSendPaused: process.env.VELTEX_100C_GLOBAL_SEND_PAUSE === "true",
    newAudiencePaused: process.env.VELTEX_100C_NEW_AUDIENCE_PAUSE === "true",
  });
  return NextResponse.json({ ...result, sendingEnabled: process.env.VELTEX_100C_ENABLED === "true" });
}
