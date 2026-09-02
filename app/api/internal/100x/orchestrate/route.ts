import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { load100GConfig } from "@/100X/100G/src/config";
import { run100G } from "@/100X/100G/src/orchestrator";
import { SupabaseOrchestrationRepository } from "@/100X/100G/src/supabase-repository";
import { createProductionStages } from "@/100X/100G/src/production-stages";
import { readProductionStageReadiness } from "@/100X/100G/src/readiness";
import type { OrchestrationLane, StageId } from "@/100X/100G/src/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(header: string | null, secret: string | undefined): boolean {
  if (!header?.startsWith("Bearer ") || !secret) return false;
  const actual = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function rehearsalStage(value: string | null): StageId | null {
  return value === "100A" || value === "100B" || value === "100C" ? value : null;
}

function orchestrationLane(value: string | null): OrchestrationLane {
  if (value === "outbound" || value === "discovery" || value === "enrichment" || value === "full") return value;
  return "full";
}

async function execute(req: NextRequest): Promise<NextResponse> {
  const config = load100GConfig(process.env);
  if (!config.enabled) return NextResponse.json({ ok: false }, { status: 404 });
  const bearer = req.headers.get("authorization");
  const custom = req.headers.get("x-veltex-100g-secret");
  const presented = custom ? `Bearer ${custom}` : bearer;
  const workflowAuthorized = authorized(presented, process.env.VELTEX_100G_CRON_SECRET);
  const vercelCronAuthorized = authorized(presented, process.env.CRON_SECRET);
  if (!workflowAuthorized && !vercelCronAuthorized) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (req.nextUrl.searchParams.get("readiness") === "1") {
    const readiness = readProductionStageReadiness(process.env);
    return NextResponse.json(readiness, { status: readiness.ok ? 200 : 503 });
  }
  const url = process.env.VELTEX_100G_SUPABASE_URL;
  const anonKey = process.env.VELTEX_100G_SUPABASE_ANON_KEY;
  const jwt = process.env.VELTEX_100G_ORCHESTRATOR_JWT;
  if (!url || !anonKey || !jwt) return NextResponse.json({ ok: false }, { status: 503 });

  try {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const repository = new SupabaseOrchestrationRepository(client);
    const lane = orchestrationLane(req.nextUrl.searchParams.get("lane"));
    const requestedRehearsal = rehearsalStage(req.nextUrl.searchParams.get("rehearse"));
    if (requestedRehearsal) {
      if (process.env.VELTEX_100G_ALLOW_REHEARSAL !== "true") return NextResponse.json({ ok: false }, { status: 403 });
      const enrichmentMode = requestedRehearsal === "100B" && req.nextUrl.searchParams.get("provider") === "hunter"
        ? "hunter_validation" as const
        : undefined;
      const result = await createProductionStages(process.env, client)[requestedRehearsal].run({
        runDate: new Date().toISOString().slice(0, 10),
        requestedLeads: 1,
        currentDailySendStage: 1,
        lane,
        enrichmentMode,
      });
      return NextResponse.json({
        ok: result.status !== "failed",
        mode: enrichmentMode ?? "rehearsal",
        providerCallsMade: result.status === "completed",
        result,
      });
    }
    const run = await run100G(config, { repository, stages: createProductionStages(process.env, client) }, lane);
    return NextResponse.json({ ok: run.status === "completed", mode: config.executeStages ? "execute" : "dry_run", run });
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : "Unknown 100G failure";
    console.error("100G orchestrator failed:", diagnostic);
    return NextResponse.json({ ok: false, diagnostic }, { status: 502 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> { return execute(req); }
export async function POST(req: NextRequest): Promise<NextResponse> { return execute(req); }
