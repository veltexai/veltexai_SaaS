import { assertCampaignStateSafe } from "../src/campaign-allowlist";
import { run100C } from "../src/run";
import type {
  ApprovedCampaign, DiagnosticEvent, DiagnosticSink, OutboundSyncProvider, SyncRepository, SyncSummary,
} from "../src/types";
import { preflightOperator, type ApprovedEnvironment, type OperatorPreflight } from "./command";

export interface LocalSyncContext { provider: OutboundSyncProvider; repository: SyncRepository; campaign: ApprovedCampaign }
export interface ProviderInspectContext { provider: OutboundSyncProvider; campaign: ApprovedCampaign }
export interface OperatorFactories {
  createFixtureContext(): LocalSyncContext;                                                                          // fixture-preview: mock adapter + in-memory + synthetic campaign
  createProviderContext(env: Record<string, string | undefined>, campaignConfigId: string, environmentId: string): ProviderInspectContext; // provider-preview: live read-only campaign inspection
  createControlledContext(env: Record<string, string | undefined>, campaignConfigId: string, environmentId: string): LocalSyncContext;      // controlled-write: live adapter + Supabase repo
}
export interface OperatorOutput { info(record: Record<string, unknown>): void }
export interface OperatorExecutionResult { plan: Record<string, unknown>; summary?: SyncSummary; campaign?: { configId: string; state: string; safe: boolean } }

function buildPlan(preflight: OperatorPreflight): Record<string, unknown> {
  return {
    event: "operator.plan", workflow: "100C", mode: preflight.request.mode, target: preflight.environment.id,
    provider: preflight.request.provider, campaign: preflight.request.campaignConfigId,
    limits: preflight.config.limits, enabled: preflight.config.enabled,
    credentialPresence: preflight.credentialPresence, // booleans only, never secret values
  };
}

export async function executeOperator(
  args: string[], env: Record<string, string | undefined>, environments: ApprovedEnvironment[],
  factories: OperatorFactories, output: OperatorOutput,
): Promise<OperatorExecutionResult> {
  const preflight = preflightOperator(args, env, environments);
  const plan = buildPlan(preflight);
  output.info(plan);

  if (preflight.request.mode === "dry-run") {
    output.info({ event: "operator.summary", mode: "dry-run", outcome: "validated-no-call", externalClientsConstructed: 0, databaseWrites: 0 });
    return { plan };
  }

  const sink: DiagnosticSink = { emit: (e) => output.info(e as unknown as Record<string, unknown>) };

  if (preflight.request.mode === "fixture-preview") {
    const ctx = factories.createFixtureContext();
    const summary = await run100C(preflight.config, { provider: ctx.provider, repository: ctx.repository, diagnostics: sink, campaign: ctx.campaign }, "manual");
    output.info({ event: "operator.summary", mode: "fixture-preview", summary });
    return { plan, summary };
  }

  if (preflight.request.mode === "provider-preview") {
    // READ-ONLY campaign inspection. No lead creation, no Supabase, no write.
    output.info({ event: "operator.warning", mode: "provider-preview", warning: "Read-only Instantly campaign inspection; no lead creation; Supabase disabled" });
    const ctx = factories.createProviderContext(env, preflight.request.campaignConfigId!, preflight.environment.id);
    const state = await ctx.provider.getCampaignState(ctx.campaign.instantlyCampaignId!, preflight.config.limits.maxProviderRequestsPerRun);
    let safe = true;
    try { assertCampaignStateSafe(ctx.campaign, state.state); } catch { safe = false; }
    output.info({ event: "operator.provider_preview_digest", mode: "provider-preview", campaignConfigId: ctx.campaign.configId, campaignState: state.state, pilotSafe: safe, providerRequests: state.requestsUsed });
    return { plan, campaign: { configId: ctx.campaign.configId, state: state.state, safe } };
  }

  // controlled-write (disabled by default; reached only after every gate in preflight passed).
  const ctx = factories.createControlledContext(env, preflight.request.campaignConfigId!, preflight.environment.id);
  const summary = await run100C(preflight.config, { provider: ctx.provider, repository: ctx.repository, diagnostics: sink, campaign: ctx.campaign }, "manual");
  output.info({ event: "operator.summary", mode: "controlled-write", summary });
  return { plan, summary };
}
