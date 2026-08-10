import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { verifySharedSecret, SECRET_HEADER } from "@/100X/100D/src/auth";
import { load100DConfig, resolve100DPilotTarget } from "@/100X/100D/src/config";
import { ingestInstantlyEvent } from "@/100X/100D/src/ingest";
import { SupabaseIngestRepository } from "@/100X/100D/src/supabase-adapters";
import { toAllowlist } from "@/100X/100D/operator/command";
import type { InstantlyWebhookPayload } from "@/100X/100D/src/types";
import campaignsFile from "@/100X/100C/operator/campaigns.json";

// 100D Instantly event webhook. DISABLED BY DEFAULT and NOT deployed in this phase. Node runtime is
// required for node:crypto (timing-safe auth + fingerprint). Never logs the secret, headers, or PII.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const config = load100DConfig(process.env);
  // Disabled by default -> 404 so the endpoint's existence is not revealed.
  if (!config.enabled) return NextResponse.json({ ok: false }, { status: 404 });

  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) return NextResponse.json({ ok: false }, { status: 415 });

  // Shared-secret auth (timing-safe). Reject missing/blank/malformed/incorrect with a generic 401.
  const auth = verifySharedSecret(req.headers.get(SECRET_HEADER), process.env.VELTEX_100D_WEBHOOK_SECRET);
  if (!auth.ok) return NextResponse.json({ ok: false }, { status: 401 });

  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > config.maxBodyBytes) return NextResponse.json({ ok: false }, { status: 413 });

  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (!payload || typeof payload !== "object") return NextResponse.json({ ok: false }, { status: 400 });

  // Narrowly-scoped worker identity pinned to the APPROVED PILOT project only: dedicated pilot URL +
  // anon key + the veltex_100d_ingest JWT (EXECUTE on 004 functions only). Fails closed unless the host
  // is exactly the pilot and the JWT role is correct. NEVER the service-role key, NEVER the shared
  // NEXT_PUBLIC_SUPABASE_URL (which points at production).
  const target = resolve100DPilotTarget(process.env);
  if (!target.ok) return NextResponse.json({ ok: false }, { status: 503 });
  const client = createClient(target.url!, target.anonKey!, {
    global: { headers: { Authorization: `Bearer ${target.jwt!}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  try {
    const result = await ingestInstantlyEvent(payload as InstantlyWebhookPayload, {
      campaigns: toAllowlist(campaignsFile as { campaigns?: Array<Record<string, unknown>> }),
      repository: new SupabaseIngestRepository(client),
      now: () => new Date(),
      enabled: true,
      runId: randomUUID(),
    });
    const okOutcomes = new Set(["processed", "duplicate", "held_unmatched"]);
    const status = okOutcomes.has(result.outcome) ? 200 : result.outcome === "rejected_allowlist" ? 403 : 400;
    return NextResponse.json({ ok: okOutcomes.has(result.outcome), outcome: result.outcome }, { status });
  } catch {
    // A provider/DB failure (e.g. a rejected JWT at the DB) fails closed with a generic 502; never leak.
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

// Only POST is accepted.
export async function GET(): Promise<NextResponse> { return NextResponse.json({ ok: false }, { status: 405 }); }
