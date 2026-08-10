import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { verifySharedSecret, SECRET_HEADER } from "@/100X/100D/src/auth";
import { load100DConfig, resolve100DPilotTarget } from "@/100X/100D/src/config";
import { ingestCustomerStatus } from "@/100X/100D/src/ingest";
import { SupabaseIngestRepository } from "@/100X/100D/src/supabase-adapters";
import { toAllowlist } from "@/100X/100D/operator/command";
import type { CustomerStatusPayload } from "@/100X/100D/src/types";
import campaignsFile from "@/100X/100C/operator/campaigns.json";

// 100D internal customer/trial status ingestion. DISABLED BY DEFAULT and NOT deployed in this phase.
// Receives a Veltex AI subscription/trial status (no billing data, no Stripe) and applies a durable
// customer/active-trial suppression through the existing registry. Same auth model as the event webhook.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const config = load100DConfig(process.env);
  if (!config.enabled) return NextResponse.json({ ok: false }, { status: 404 });

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) return NextResponse.json({ ok: false }, { status: 415 });

  const auth = verifySharedSecret(req.headers.get(SECRET_HEADER), process.env.VELTEX_100D_WEBHOOK_SECRET);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: 401 });

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > config.maxBodyBytes) return NextResponse.json({ ok: false }, { status: 413 });

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return NextResponse.json({ ok: false }, { status: 400 });

  // Pinned to the approved pilot project only (see events route). Fails closed otherwise; never the
  // service-role key, never the shared NEXT_PUBLIC_SUPABASE_URL.
  const target = resolve100DPilotTarget(process.env);
  if (!target.ok) return NextResponse.json({ ok: false }, { status: 503 });
  const client = createClient(target.url!, target.anonKey!, {
    global: { headers: { Authorization: `Bearer ${target.jwt!}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // campaignsFile is imported to keep a single authoritative config surface; customer-status ingestion
  // is workspace/campaign-agnostic (email-keyed), so the allowlist is not consulted for matching here.
  void toAllowlist(campaignsFile as { campaigns?: Array<Record<string, unknown>> });

  try {
    const result = await ingestCustomerStatus(payload as CustomerStatusPayload, {
      campaigns: [],
      repository: new SupabaseIngestRepository(client),
      now: () => new Date(),
      enabled: true,
      runId: randomUUID(),
    });
    const status = result.outcome === "rejected_invalid" ? 400 : 200;
    return NextResponse.json({ ok: result.outcome !== "rejected_invalid", outcome: result.outcome }, { status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> { return NextResponse.json({ ok: false }, { status: 405 }); }
