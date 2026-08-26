import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { load100AConfig } from "../../100A/src/config";
import { GooglePlacesTextSearchClient } from "../../100A/src/google-places";
import { RulesCleaningQualifier } from "../../100A/src/qualifier";
import { run100A } from "../../100A/src/run";
import { SupabaseDiagnosticSink as ADiagnostics, SupabaseProspectRepository } from "../../100A/src/supabase-adapters";
import { ApolloEnrichmentProvider } from "../../100B/src/apollo-provider";
import { load100BConfig } from "../../100B/src/config";
import { run100B } from "../../100B/src/run";
import { SupabaseContactRepository, SupabaseDiagnosticSink as BDiagnostics } from "../../100B/src/supabase-adapters";
import { NullSuppressionResolver } from "../../100B/src/suppression";
import { selectApprovedCampaign } from "../../100C/src/campaign-allowlist";
import { load100CConfig } from "../../100C/src/config";
import { InstantlyOutboundProvider } from "../../100C/src/instantly-provider";
import { run100C } from "../../100C/src/run";
import { SupabaseDiagnosticSink as CDiagnostics, SupabaseSyncRepository } from "../../100C/src/supabase-adapters";
import campaignsFile from "../../100C/operator/campaigns.json";
import type { ApprovedCampaign } from "../../100C/src/types";
import type { StageRunner, StageResult } from "./types";
import { discoveryGeographies } from "./national-geographies";

type Env = Record<string, string | undefined>;
const required = (env: Env, name: string): string => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for 100G execution`);
  return value;
};
const client = (url: string, anon: string, jwt: string): SupabaseClient => createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${jwt}` } },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const result = (stage: StageResult["stage"], produced: number, reason: string, evidence?: StageResult["evidence"]): StageResult => ({ stage, status: "completed", produced, reason, evidence });
const positive = (value: string | undefined, fallback: number): number => {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("100G database-build limits must be positive integers");
  return parsed;
};
export const discoveryMarketLimit = (requestedLeads: number, perMarket: number, configuredLimit?: string): number =>
  Math.min(Math.ceil(requestedLeads / perMarket), positive(configuredLimit, 1));
const disabled = (stage: StageResult["stage"]): StageResult => ({ stage, status: "skipped", produced: 0, reason: `${stage} is not enabled for 100G` });

async function enrichmentTargets(orchestrationClient: SupabaseClient, limit: number): Promise<string[]> {
  const { data, error } = await orchestrationClient.rpc("load_100g_enrichment_target_ids", { requested_limit: limit });
  if (error) throw new Error(`load 100G enrichment targets: ${error.message}`);
  return Array.isArray(data) ? data.map(String) : [];
}

async function remainingCampaignCapacity(db: SupabaseClient, campaign: ApprovedCampaign, runDate: string): Promise<number> {
  const base = db.from("campaign_contact_assignments").select("id", { count: "exact", head: true }).eq("campaign_config_id", campaign.configId).eq("state", "submitted");
  const [total, daily] = await Promise.all([
    base,
    db.from("campaign_contact_assignments").select("id", { count: "exact", head: true }).eq("campaign_config_id", campaign.configId).eq("state", "submitted").gte("updated_at", `${runDate}T00:00:00.000Z`).lt("updated_at", `${runDate}T23:59:59.999Z`),
  ]);
  if (total.error) throw new Error(`read 100C total cap: ${total.error.message}`);
  if (daily.error) throw new Error(`read 100C daily cap: ${daily.error.message}`);
  return Math.max(0, Math.min(campaign.totalPilotCap - (total.count ?? 0), campaign.dailySyncCap - (daily.count ?? 0)));
}

export function createProductionStages(env: Env, orchestrationClient: SupabaseClient): Record<"100A" | "100B" | "100C", StageRunner> {
  return {
    "100A": { run: async ({ requestedLeads }) => {
      if (env.VELTEX_100A_ALLOW_100G !== "true") return disabled("100A");
      const db = client(required(env, "VELTEX_100A_SUPABASE_URL"), required(env, "VELTEX_100A_SUPABASE_ANON_KEY"), required(env, "VELTEX_100A_WORKER_JWT"));
      const config = load100AConfig(env, discoveryGeographies(env.VELTEX_100A_GEOGRAPHY_MODE));
      const perMarket = positive(env.VELTEX_100A_MAX_NEW_PROSPECTS_PER_MARKET, 5);
      // A nationwide database target can require many markets. Running all of them in one
      // serverless invocation starves 100B/100C and can exceed Vercel's five-minute limit.
      // Rotate through a small bounded cohort each day; the durable cursor preserves progress.
      const marketLimit = discoveryMarketLimit(requestedLeads, perMarket, env.VELTEX_100A_MAX_MARKETS_PER_RUN);
      let created = 0; let markets = 0;
      while (created < requestedLeads && markets < marketLimit) {
        const remaining = requestedLeads - created;
        config.limits.maxNewProspectsPerRun = Math.min(positive(env.VELTEX_100A_MAX_NEW_PROSPECTS, 5), perMarket, remaining);
        config.limits.maxSourceRecordsPerRun = Math.min(positive(env.VELTEX_100A_MAX_SOURCE_RECORDS, 5), perMarket, remaining);
        const summary = await run100A(config, { places: new GooglePlacesTextSearchClient(required(env, "VELTEX_100A_GOOGLE_PLACES_API_KEY")), qualifier: new RulesCleaningQualifier(), repository: new SupabaseProspectRepository(db), diagnostics: new ADiagnostics(db) }, "100g");
        created += summary.canonicalProspectsCreated; markets += 1;
        if (summary.canonicalProspectsCreated === 0) continue;
      }
      return result("100A", created, `discovered ${created} new prospects across ${markets} of ${marketLimit} scheduled market${marketLimit === 1 ? "" : "s"}`);
    } },
    "100B": { run: async ({ requestedLeads }) => {
      if (env.VELTEX_100B_ALLOW_100G !== "true") return disabled("100B");
      const ids = await enrichmentTargets(orchestrationClient, requestedLeads);
      if (ids.length === 0) return { stage: "100B", status: "skipped", produced: 0, reason: "no discovered prospects require enrichment" };
      const db = client(required(env, "VELTEX_100B_SUPABASE_URL"), required(env, "VELTEX_100B_SUPABASE_ANON_KEY"), required(env, "VELTEX_100B_WORKER_JWT"));
      const config = load100BConfig(env, "apollo");
      config.limits.maxCompaniesPerRun = Math.min(config.limits.maxCompaniesPerRun, ids.length);
      const summary = await run100B(config, { provider: new ApolloEnrichmentProvider(required(env, "VELTEX_100B_APOLLO_API_KEY")), suppression: new NullSuppressionResolver(), repository: new SupabaseContactRepository(db), diagnostics: new BDiagnostics(db), prospectIds: ids }, "100g");
      return result("100B", summary.readyForOutreach, `verified ${summary.readyForOutreach} outreach-ready contacts`, {
        targetsSelected: ids.length,
        companiesProcessed: summary.companiesProcessed,
        companiesWithCandidates: summary.companiesWithCandidates,
        companiesWithoutCandidates: summary.companiesWithoutCandidates,
        domainlessTargets: summary.domainlessTargets,
        providerRequests: summary.providerRequests,
        searchRequests: summary.searchRequests,
        enrichmentRequests: summary.enrichmentRequests,
        successfulEnrichments: summary.successfulEnrichments,
        providerErrors: summary.providerErrors + summary.providerReportedErrors,
        candidates: summary.candidates,
        contactsCreated: summary.contactsCreated,
        existingSources: summary.existingSources,
        confidentMatches: summary.confidentMatches,
        heldOrSuppressed: summary.heldOrSuppressed,
        eligibilityCounts: summary.eligibilityCounts,
        capped: summary.capped,
        capReason: summary.capReason ?? null,
      });
    } },
    "100C": { run: async ({ runDate, requestedLeads, currentDailySendStage }) => {
      if (env.VELTEX_100C_ALLOW_100G !== "true" || env.VELTEX_100C_ALLOW_ACTIVE_CAMPAIGN !== "true") return disabled("100C");
      const campaigns = (campaignsFile as { campaigns: ApprovedCampaign[] }).campaigns;
      const campaign = selectApprovedCampaign(required(env, "VELTEX_100C_CAMPAIGN_CONFIG_ID"), campaigns, required(env, "VELTEX_100C_ENVIRONMENT_ID"));
      const db = client(required(env, "VELTEX_100C_SUPABASE_URL"), required(env, "VELTEX_100C_SUPABASE_ANON_KEY"), required(env, "VELTEX_100C_WORKER_JWT"));
      // Replenish no faster than the controller's audited daily stage. This keeps queue writes
      // synchronized with the send cap while allowing conservative 1 -> 3 -> 5 progression.
      const remainingCapacity = await remainingCampaignCapacity(db, campaign, runDate);
      const capacity = Math.max(0, Math.min(requestedLeads, currentDailySendStage, remainingCapacity));
      if (capacity <= 0) {
        const reason = requestedLeads <= 0
          ? "no outbound synchronization requested"
          : currentDailySendStage <= 0
            ? "audited daily send stage does not permit synchronization"
            : "approved campaign daily or total sync cap reached";
        return { stage: "100C", status: "skipped", produced: 0, reason };
      }
      const config = load100CConfig(env, "instantly");
      config.limits.maxLeadsSubmitted = capacity;
      config.limits.maxInstantlyWriteRequests = capacity;
      config.limits.maxContactsConsidered = Math.max(config.limits.maxContactsConsidered, capacity);
      // One campaign read, up to one write plus one ambiguity reconciliation per candidate,
      // one conditional activation, and a small fixed margin.
      config.limits.maxProviderRequestsPerRun = Math.max(config.limits.maxProviderRequestsPerRun, (capacity * 2) + 4);
      const summary = await run100C(config, { provider: new InstantlyOutboundProvider(required(env, "VELTEX_100C_INSTANTLY_API_KEY")), repository: new SupabaseSyncRepository(db), diagnostics: new CDiagnostics(db), campaign }, "100g");
      return result("100C", summary.submitted, `submitted ${summary.submitted} eligible leads`);
    } },
  };
}
