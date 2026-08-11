import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { load100GConfig } from "@/100X/100G/src/config";
import { run100G } from "@/100X/100G/src/orchestrator";
import { SupabaseOrchestrationRepository } from "@/100X/100G/src/supabase-repository";
import { createProductionStages } from "@/100X/100G/src/production-stages";
import { readProductionStageReadiness } from "@/100X/100G/src/readiness";
import type { StageId } from "@/100X/100G/src/types";

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

async function execute(req: NextRequest): Promise<NextResponse> {
  const config = load100GConfig(process.env);
  if (!config.enabled) return NextResponse.json({ ok: false }, { status: 404 });
  const bearer = req.headers.get("authorization");
  const custom = req.headers.get("x-veltex-100g-secret");
  const cronSecret = process.env.VELTEX_100G_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!authorized(custom ? `Bearer ${custom}` : bearer, cronSecret)) {
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
    const requestedRehearsal = rehearsalStage(req.nextUrl.searchParams.get("rehearse"));
    if (requestedRehearsal) {
      if (process.env.VELTEX_100G_ALLOW_REHEARSAL !== "true") return NextResponse.json({ ok: false }, { status: 403 });
      const result = await createProductionStages(process.env, client)[requestedRehearsal].run({
        runDate: new Date().toISOString().slice(0, 10),
        requestedLeads: 1,
      });
      return NextResponse.json({ ok: result.status !== "failed", mode: "rehearsal", providerCallsMade: true, result });
    }
    const run = await run100G(config, { repository, stages: createProductionStages(process.env, client) });
    return NextResponse.json({ ok: run.status === "completed", mode: config.executeStages ? "execute" : "dry_run", run });
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : "Unknown 100G failure";
    console.error("100G orchestrator failed:", diagnostic);
    return NextResponse.json({ ok: false, diagnostic }, { status: 502 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> { return execute(req); }
export async function POST(req: NextRequest): Promise<NextResponse> { return execute(req); }
