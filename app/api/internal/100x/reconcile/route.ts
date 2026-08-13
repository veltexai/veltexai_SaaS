import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { resolve100DPilotTarget } from "@/100X/100D/src/config";
import { reconcileUnmatched } from "@/100X/100D/src/reconciliation";
import { SupabaseIngestRepository } from "@/100X/100D/src/supabase-adapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!header?.startsWith("Bearer ") || !secret) return false;
  const actual = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function execute(req: NextRequest): Promise<NextResponse> {
  if (process.env.VELTEX_100D_RECONCILIATION_ENABLED !== "true") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const bearer = req.headers.get("authorization");
  const workflowHeader = req.headers.get("x-veltex-100d-reconcile-secret");
  const presented = workflowHeader ? `Bearer ${workflowHeader}` : bearer;
  const allowed =
    authorized(presented, process.env.VELTEX_100D_RECONCILIATION_SECRET) ||
    authorized(presented, process.env.CRON_SECRET);
  if (!allowed) return NextResponse.json({ ok: false }, { status: 401 });

  const target = resolve100DPilotTarget(process.env);
  if (!target.ok) return NextResponse.json({ ok: false }, { status: 503 });

  try {
    const client = createClient(target.url!, target.anonKey!, {
      global: { headers: { Authorization: `Bearer ${target.jwt!}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const report = await reconcileUnmatched(new SupabaseIngestRepository(client));
    // Return aggregate counts only. Event ids, addresses, and other contact identifiers stay private.
    return NextResponse.json({
      ok: true,
      examined: report.examined,
      reconciled: report.reconciled,
      stillUnmatched: report.stillUnmatched,
      stillAmbiguous: report.stillAmbiguous,
    });
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : "Unknown 100D reconciliation failure";
    console.error("100D reconciliation failed:", diagnostic);
    return NextResponse.json({ ok: false, diagnostic }, { status: 502 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> { return execute(req); }
export async function POST(req: NextRequest): Promise<NextResponse> { return execute(req); }
