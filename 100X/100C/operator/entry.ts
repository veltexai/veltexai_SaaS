import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { FixtureOutboundProvider, type FixtureSyncScript } from "../src/fixture-provider";
import { InstantlyOutboundProvider } from "../src/instantly-provider";
import { InMemorySyncRepository, type InMemorySuppressionRow } from "../src/in-memory-repository";
import { SupabaseSyncRepository } from "../src/supabase-adapters";
import type { ApprovedCampaign, SuppressionEvent, SyncCandidate } from "../src/types";
import { bindApprovedCampaign } from "./campaigns";
import { executeOperator } from "./runtime";
import type { ApprovedEnvironment } from "./command";

const readJson = <T>(name: string): T => JSON.parse(readFileSync(resolve(process.cwd(), `100X/100C/operator/${name}`), "utf8")) as T;
const output = { info: (record: Record<string, unknown>) => console.info(JSON.stringify(record)) };

interface FixtureFile { fixtureNow: string; campaign: ApprovedCampaign; providerScript: FixtureSyncScript; candidates: SyncCandidate[]; suppression: Record<string, SuppressionEvent[]>; suppressionRegistry?: InMemorySuppressionRow[] }

executeOperator(
  process.argv.slice(2), process.env, readJson<ApprovedEnvironment[]>("environments.json"),
  {
    // fixture-preview: synthetic campaign + mock adapter + in-memory repository. Offline.
    createFixtureContext: () => {
      const f = readJson<FixtureFile>("sync-fixtures.json");
      const fixtureDate = new Date(f.fixtureNow);
      if (!Number.isFinite(fixtureDate.getTime())) throw new Error("100C fixtureNow must be a valid timestamp");
      const clock = { now: () => new Date(fixtureDate) };
      return { provider: new FixtureOutboundProvider(f.providerScript), repository: new InMemorySyncRepository(f.candidates, f.suppression, clock.now, f.suppressionRegistry ?? []), campaign: f.campaign, clock };
    },
    // provider-preview: read-only Instantly campaign inspection against an APPROVED allowlisted
    // campaign. Fails closed (in bindApprovedCampaign) before the Instantly client is constructed.
    createProviderContext: (env, campaignConfigId, environmentId) => {
      const campaign = bindApprovedCampaign(campaignConfigId, environmentId);
      return { provider: new InstantlyOutboundProvider(env.INSTANTLY_API_KEY!, fetch), campaign };
    },
    // controlled-write: disabled by default; reached only after every preflight gate passes.
    createControlledContext: (env, campaignConfigId, environmentId) => {
      const campaign = bindApprovedCampaign(campaignConfigId, environmentId);
      const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${env.SUPABASE_100C_WORKER_JWT!}` } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      return { provider: new InstantlyOutboundProvider(env.INSTANTLY_API_KEY!, fetch), repository: new SupabaseSyncRepository(client), campaign };
    },
  }, output,
).catch((error) => {
  console.error(JSON.stringify({ event: "operator.failed", message: error instanceof Error ? error.message : "unknown error" }));
  process.exitCode = 1;
});
