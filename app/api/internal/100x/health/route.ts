import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { read100XHealthDashboard } from "@/100X/100G/src/health-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(header: string | null, secrets: Array<string | undefined>): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(header.slice(7));
  return secrets.some((secret) => {
    if (!secret) return false;
    const expected = Buffer.from(secret);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

const db = (url: string, anon: string, jwt: string) => createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${jwt}` } },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req.headers.get("authorization"), [process.env.VELTEX_100G_CRON_SECRET, process.env.VELTEX_100F_CRON_SECRET, process.env.CRON_SECRET])) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const required = [
    process.env.VELTEX_100G_SUPABASE_URL,
    process.env.VELTEX_100G_SUPABASE_ANON_KEY,
    process.env.VELTEX_100G_ORCHESTRATOR_JWT,
    process.env.VELTEX_100F_SUPABASE_URL,
    process.env.VELTEX_100F_SUPABASE_ANON_KEY,
    process.env.VELTEX_100F_RAMP_JWT,
    process.env.VELTEX_100F_CAMPAIGN_ID,
  ];
  if (required.some((value) => !value)) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const dashboard = await read100XHealthDashboard(
      db(required[0]!, required[1]!, required[2]!),
      db(required[3]!, required[4]!, required[5]!),
      required[6]!,
      process.env.VELTEX_100F_EXECUTE_MUTATIONS === "true",
    );
    return NextResponse.json({ ok: true, dashboard });
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : "Unknown 100X health failure";
    console.error("100X health dashboard failed:", diagnostic);
    return NextResponse.json({ ok: false, diagnostic }, { status: 502 });
  }
}
