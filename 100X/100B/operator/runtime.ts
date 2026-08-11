import { APOLLO_PILOT_LIMITS } from "../src/apollo-config";
import { InMemoryContactRepository } from "../src/in-memory-repository";
import { NullSuppressionResolver } from "../src/suppression";
import { run100B } from "../src/run";
import type { CompanyContext, ContactRepository, DiagnosticSink, EnrichmentProvider, RunSummary, SuppressionResolver } from "../src/types";
import { preflightOperator, type ApprovedEnvironment, type OperatorPreflight } from "./command";

export interface LocalContext { companies: CompanyContext[]; prospectIds: string[]; suppression: SuppressionResolver; provider: EnrichmentProvider }
export interface OperatorFactories {
  createFixtureContext(): LocalContext;                                   // fixture-preview: offline provider + synthetic companies
  createProviderContext(env: Record<string, string | undefined>, requestedProspectIds: string[]): LocalContext; // provider-preview: live provider + APPROVED REAL targets
  createControlledProvider(preflight: OperatorPreflight, env: Record<string, string | undefined>): EnrichmentProvider;
  createSupabase(env: Record<string, string | undefined>): { repository: ContactRepository; diagnostics: DiagnosticSink };
}
export interface OperatorOutput { info(record: Record<string, unknown>): void }
export interface OperatorExecutionResult { plan: Record<string, unknown>; summary?: RunSummary; preview?: { contacts: unknown[]; sources: unknown[] } }

export function buildExecutionPlan(preflight: OperatorPreflight): Record<string, unknown> {
  const { request, environment, config, credentialPresence } = preflight;
  const providerMayBeCalled = request.mode === "provider-preview" || (request.mode === "controlled-write" && request.provider === "apollo");
  return {
    event: "operator.plan", mode: request.mode, provider: request.provider,
    environment: { id: environment.id, label: environment.label, type: environment.type, expectedSupabaseHostname: environment.expectedSupabaseHostname, approvalReference: environment.approvalReference },
    prospects: request.prospectIds.length, limits: { ...config.limits, lockTtlMs: config.lockTtlMs },
    credentialsPresent: credentialPresence,
    effects: { providerMayBeCalled, databaseWritesMayOccur: request.mode === "controlled-write" },
    integrations: { instantly: "disabled", apollo: request.provider === "apollo" ? "read-only" : "disabled", hubspot: "disabled", dataAxle: "disabled", email: "disabled" },
  };
}

export async function executeOperator(
  args: string[], env: Record<string, string | undefined>, environments: ApprovedEnvironment[],
  factories: OperatorFactories, output: OperatorOutput,
): Promise<OperatorExecutionResult> {
  const preflight = preflightOperator(args, env, environments);
  const plan = buildExecutionPlan(preflight);
  output.info(plan);

  if (preflight.request.mode === "dry-run") {
    output.info({ event: "operator.summary", mode: "dry-run", outcome: "validated-no-call", externalClientsConstructed: 0, databaseWrites: 0 });
    return { plan };
  }

  const sink: DiagnosticSink = { emit: (e) => output.info(e as unknown as Record<string, unknown>) };

  if (preflight.request.mode === "fixture-preview") {
    const ctx = factories.createFixtureContext();
    const repository = new InMemoryContactRepository(ctx.companies);
    const summary = await run100B(preflight.config, { provider: ctx.provider, suppression: ctx.suppression, repository, diagnostics: sink, prospectIds: ctx.prospectIds }, "manual");
    output.info({ event: "operator.summary", mode: "fixture-preview", summary });
    return { plan, summary, preview: { contacts: repository.contacts, sources: repository.contactSources } };
  }

  if (preflight.request.mode === "provider-preview") {
    output.info({ event: "operator.warning", mode: "provider-preview", warning: "Provider quota may be consumed; Supabase is disabled" });
    // Approved-target binding + unknown-id fail-closed happen inside the factory, BEFORE the provider
    // client is constructed. The factory returns only approved real 100A companies.
    const ctx = factories.createProviderContext(env, preflight.request.prospectIds);
    // Provider preview enriches at most APOLLO_PILOT_LIMITS.maxCompaniesPerProviderPreview companies.
    const previewIds = ctx.prospectIds.slice(0, APOLLO_PILOT_LIMITS.maxCompaniesPerProviderPreview);
    if (previewIds.length < ctx.prospectIds.length) {
      output.info({ event: "operator.warning", mode: "provider-preview", warning: `provider preview capped to ${APOLLO_PILOT_LIMITS.maxCompaniesPerProviderPreview} companies`, requested: ctx.prospectIds.length });
    }
    const repository = new InMemoryContactRepository(ctx.companies);
    const summary = await run100B(preflight.config, { provider: ctx.provider, suppression: ctx.suppression, repository, diagnostics: sink, prospectIds: previewIds }, "manual");
    // Redacted digest: report ONLY nonsensitive fields — never an email, name, or phone. A live
    // provider preview may retrieve real business contacts; the operator output must not print them.
    const contacts = repository.contacts.map((c) => ({
      prospectId: c.prospectId, roleCategory: c.roleCategory, hasWorkEmail: Boolean(c.email),
      verificationStatus: c.emailVerificationStatus, eligibility: c.outreachEligibility, isDecisionMaker: c.isCurrentContact,
    }));
    output.info({
      event: "operator.provider_preview_digest", mode: "provider-preview",
      companiesProcessed: summary.companiesProcessed, providerRequests: summary.providerRequests,
      candidates: summary.candidates, readyForOutreach: summary.readyForOutreach,
      estimatedCreditConsumingMatches: contacts.filter((c) => c.hasWorkEmail).length,
      contacts,
    });
    output.info({ event: "operator.summary", mode: "provider-preview", summary });
    return { plan, summary, preview: { contacts: repository.contacts, sources: repository.contactSources } };
  }

  // controlled-write
  const provider = factories.createControlledProvider(preflight, env);
  const database = factories.createSupabase(env);
  const summary = await run100B(preflight.config, { provider, suppression: new NullSuppressionResolver(), repository: database.repository, diagnostics: database.diagnostics, prospectIds: preflight.request.prospectIds }, "manual");
  output.info({ event: "operator.summary", mode: "controlled-write", summary });
  return { plan, summary };
}
