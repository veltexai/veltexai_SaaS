import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { load100FConfig } from "@/100X/100F/src/config";
import { runRampController } from "@/100X/100F/src/controller";
import { InstantlyMetricsProvider, InstantlyRampProvider } from "@/100X/100F/src/instantly-provider";
import { SupabaseRampRepository } from "@/100X/100F/src/supabase-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!header?.startsWith("Bearer ") || !secret) return false;
  const actual = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const config = load100FConfig(process.env);
  if (!config.enabled) return NextResponse.json({ ok: false }, { status: 404 });
  const bearer = req.headers.get("authorization");
  const workerHeader = req.headers.get("x-veltex-100f-secret");
  const workerAuthorized = authorized(workerHeader ? `Bearer ${workerHeader}` : bearer, process.env.VELTEX_100F_CRON_SECRET);
  if (!workerAuthorized) return NextResponse.json({ ok: false }, { status: 401 });
  const url = process.env.VELTEX_100F_SUPABASE_URL;
  const anonKey = process.env.VELTEX_100F_SUPABASE_ANON_KEY;
  const jwt = process.env.VELTEX_100F_RAMP_JWT;
  const instantlyKey = process.env.VELTEX_100F_INSTANTLY_API_KEY;
  if (!config.campaignId || !url || !anonKey || !jwt || !instantlyKey) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const client = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const repository = new SupabaseRampRepository(client);
    const date = new Date().toISOString().slice(0, 10);
    const [providerMetrics, internal] = await Promise.all([
      new InstantlyMetricsProvider(instantlyKey).collect(config.campaignId, date),
      repository.getInternalSignals(config.campaignId, date),
    ]);
    await repository.upsertMetrics({ ...providerMetrics, ...internal });
    const decision = await runRampController(config.campaignId, { enabled: true, executeMutations: config.executeMutations, policy: config.policy, repository, provider: new InstantlyRampProvider(instantlyKey) });
    return NextResponse.json({ ok: true, mode: config.executeMutations ? "execute" : "dry_run", action: decision.action, targetStage: decision.targetStage, reason: decision.reason });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

export async function GET(): Promise<NextResponse> { return NextResponse.json({ ok: false }, { status: 405 }); }
