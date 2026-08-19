import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { load100FConfig } from "@/100X/100F/src/config";
import { runRampController } from "@/100X/100F/src/controller";
import { InstantlyMetricsProvider, InstantlyRampProvider } from "@/100X/100F/src/instantly-provider";
import { completedObservationDate } from "@/100X/100F/src/observation-date";
import { rampReconciliationLookback, reconcileRampMetrics } from "@/100X/100F/src/reconciliation";
import { SupabaseRampRepository } from "@/100X/100F/src/supabase-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!header?.startsWith("Bearer ") || !secret) return false;
  const actual = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function executeRamp(req: NextRequest): Promise<NextResponse> {
  const config = load100FConfig(process.env);
  if (!config.enabled) return NextResponse.json({ ok: false }, { status: 404 });
  const bearer = req.headers.get("authorization");
  const workerHeader = req.headers.get("x-veltex-100f-secret");
  // Vercel Cron authenticates scheduled requests with the project-level CRON_SECRET.
  // Keep the workflow-specific secret for manual/worker calls, while accepting the
  // platform secret as the fail-closed fallback used by scheduled evaluations.
  const presented = workerHeader ? `Bearer ${workerHeader}` : bearer;
  const workerAuthorized =
    authorized(presented, process.env.VELTEX_100F_CRON_SECRET) ||
    authorized(presented, process.env.CRON_SECRET);
  if (!workerAuthorized) return NextResponse.json({ ok: false }, { status: 401 });
  const url = process.env.VELTEX_100F_SUPABASE_URL;
  const anonKey = process.env.VELTEX_100F_SUPABASE_ANON_KEY;
  const jwt = process.env.VELTEX_100F_RAMP_JWT;
  const instantlyKey =
    process.env.VELTEX_100F_INSTANTLY_API_KEY_V4 ??
    process.env.VELTEX_100F_INSTANTLY_API_KEY_V3 ??
    process.env.VELTEX_100F_INSTANTLY_API_KEY_V2 ??
    process.env.VELTEX_100F_INSTANTLY_API_KEY;
  if (!config.campaignId || !url || !anonKey || !jwt || !instantlyKey) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const client = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const repository = new SupabaseRampRepository(client);
    const supplyUrl = process.env.VELTEX_100G_SUPABASE_URL;
    const supplyAnonKey = process.env.VELTEX_100G_SUPABASE_ANON_KEY;
    const supplyJwt = process.env.VELTEX_100G_ORCHESTRATOR_JWT;
    let supply: { queuedEligibleLeads: number; minimumQueueDays: number } | undefined;
    if (supplyUrl && supplyAnonKey && supplyJwt) {
      const supplyClient = createClient(supplyUrl, supplyAnonKey, { global: { headers: { Authorization: `Bearer ${supplyJwt}` } }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const snapshot = await supplyClient.rpc("read_100g_supply_snapshot");
      if (!snapshot.error && snapshot.data) {
        const configuredQueueDays = Number(process.env.VELTEX_100G_MIN_QUEUE_DAYS_ALERT ?? 3);
        supply = {
          queuedEligibleLeads: Math.max(0, Number(snapshot.data.queued_eligible_leads ?? 0)),
          minimumQueueDays: Number.isFinite(configuredQueueDays) && configuredQueueDays > 0 ? Math.floor(configuredQueueDays) : 3,
        };
      }
    }
    const now = new Date();
    const date = completedObservationDate(
      now,
      process.env.VELTEX_100F_TIME_ZONE ?? "America/Los_Angeles",
      Number(process.env.VELTEX_100F_SEND_WINDOW_END_HOUR ?? "18"),
    );
    const metricsProvider = new InstantlyMetricsProvider(instantlyKey);
    const reconciled = await reconcileRampMetrics(
      config.campaignId,
      date,
      rampReconciliationLookback(process.env.VELTEX_100F_RECONCILE_LOOKBACK_DAYS),
      metricsProvider,
      repository,
    );
    const decision = await runRampController(config.campaignId, {
      enabled: true,
      executeMutations: config.executeMutations,
      policy: config.policy,
      repository,
      provider: new InstantlyRampProvider(instantlyKey),
      now: () => now,
      evaluationDate: date,
      supply,
    });
    return NextResponse.json({ ok: true, mode: config.executeMutations ? "execute" : "dry_run", reconciledDays: reconciled.length, action: decision.action, targetStage: decision.targetStage, reason: decision.reason });
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : "Unknown 100F failure";
    console.error("100F ramp controller failed:", diagnostic);
    return NextResponse.json({ ok: false, diagnostic }, { status: 502 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return executeRamp(req);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return executeRamp(req);
}
