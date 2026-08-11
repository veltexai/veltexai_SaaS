import { InMemoryProspectRepository } from "../src/in-memory-repository";
import { RulesCleaningQualifier } from "../src/qualifier";
import { run100A } from "../src/run";
import type { DiagnosticSink, PlacesClient, ProspectRepository, RunSummary } from "../src/types";
import { preflightOperator, type ApprovedEnvironment, type ApprovedGeography, type OperatorPreflight } from "./command";

export interface OperatorFactories {
  createGoogle(apiKey: string): PlacesClient;
  createSupabase(env: Record<string, string | undefined>): { repository: ProspectRepository; diagnostics: DiagnosticSink };
}
export interface OperatorOutput { info(record: Record<string, unknown>): void }
export interface OperatorExecutionResult { plan: Record<string, unknown>; summary?: RunSummary; preview?: { prospects: unknown[]; sourceRecords: unknown[] } }

export function buildExecutionPlan(preflight: OperatorPreflight): Record<string, unknown> {
  const { request, environment, geography, config, credentialPresence } = preflight;
  return {
    event: "operator.plan", mode: request.mode,
    environment: { id: environment.id, label: environment.label, type: environment.type, expectedSupabaseHostname: environment.expectedSupabaseHostname, approvalReference: environment.approvalReference },
    geography: { id: geography.id, label: geography.label, approvalReference: geography.approvalReference },
    searchTerms: config.searchTerms, limits: { ...config.limits, lockTtlMs: config.lockTtlMs },
    credentialsPresent: credentialPresence,
    effects: { googleMayBeCalled: request.mode !== "dry-run", databaseWritesMayOccur: request.mode === "write" },
    integrations: { instantly: "disabled", apollo: "disabled", hubspot: "disabled", dataAxle: "disabled", email: "disabled" },
  };
}

export async function executeOperator(
  args: string[], env: Record<string, string | undefined>, geographies: ApprovedGeography[], environments: ApprovedEnvironment[],
  factories: OperatorFactories, output: OperatorOutput,
): Promise<OperatorExecutionResult> {
  const preflight = preflightOperator(args, env, geographies, environments);
  const plan = buildExecutionPlan(preflight);
  output.info(plan);
  if (preflight.request.mode === "dry-run") {
    const result = { plan };
    output.info({ event: "operator.summary", mode: "dry-run", outcome: "validated-no-call", externalClientsConstructed: 0, databaseWrites: 0 });
    return result;
  }
  const places = factories.createGoogle(env.GOOGLE_PLACES_API_KEY!);
  if (preflight.request.mode === "google-preview") {
    output.info({ event: "operator.warning", mode: "google-preview", warning: "Google Places quota may be consumed; Supabase is disabled" });
    const repository = new InMemoryProspectRepository();
    const summary = await run100A(preflight.config, { places, repository, qualifier: new RulesCleaningQualifier(), diagnostics: { emit: (event) => output.info(event as unknown as Record<string, unknown>) } }, "manual");
    const preview = { prospects: repository.prospects, sourceRecords: repository.sourceRecords };
    output.info({ event: "operator.summary", mode: "google-preview", summary, preview });
    return { plan, summary, preview };
  }
  const database = factories.createSupabase(env);
  const summary = await run100A(preflight.config, { places, repository: database.repository, qualifier: new RulesCleaningQualifier(), diagnostics: database.diagnostics }, "manual");
  output.info({ event: "operator.summary", mode: "write", summary });
  return { plan, summary };
}
