import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/100X/100C/src/unsubscribe-token";
import { resolve100DPilotTarget } from "@/100X/100D/src/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("t") ?? request.headers.get("x-unsubscribe-token");
  const secret = process.env.VELTEX_100C_UNSUBSCRIBE_SECRET;
  if (!token || !secret) return NextResponse.json({ ok: false }, { status: 400 });
  const email = verifyUnsubscribeToken(token, secret);
  if (!email) return NextResponse.json({ ok: false }, { status: 400 });
  const target = resolve100DPilotTarget(process.env);
  if (!target.ok) return NextResponse.json({ ok: false }, { status: 503 });
  const client = createClient(target.url!, target.anonKey!, { global: { headers: { Authorization: `Bearer ${target.jwt!}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const externalReference = createHash("sha256").update(token).digest("hex");
  const { error } = await client.rpc("apply_100c_public_unsubscribe", { requested_email: email, requested_external_reference: externalReference, requested_occurred_at: new Date().toISOString() });
  if (error) return NextResponse.json({ ok: false }, { status: 502 });
  return NextResponse.json({ ok: true, message: "You have been unsubscribed." });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return new NextResponse("Missing unsubscribe token.", { status: 400 });
  return new NextResponse(`<!doctype html><html><head><title>Unsubscribe</title></head><body><h1>Unsubscribe</h1><p>Click below to stop future Veltex AI outreach.</p><form method="post" action="/api/unsubscribe?t=${encodeURIComponent(token)}"><button type="submit">Unsubscribe</button></form></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
