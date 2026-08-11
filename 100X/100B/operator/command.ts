import { load100BConfig, type EnrichmentConfig } from "../src/config";
import type { Provider } from "../src/types";

export type OperatorMode = "dry-run" | "fixture-preview" | "provider-preview" | "controlled-write";
export type EnvironmentType = "pilot" | "staging" | "production";
export interface ApprovedEnvironment {
  id: string; label: string; expectedSupabaseHostname: string | null; approved: boolean;
  approvalReference: string | null; controlledWritesAllowed: boolean; type: EnvironmentType;
}
export interface OperatorRequest {
  mode: OperatorMode; target: string; provider: Provider; prospectIds: string[];
  confirmTarget?: string; confirmWrites?: string;
}

export const APPROVED_PILOT_LIMITS = Object.freeze({
  maxCompaniesPerRun: 5, maxContactsPerRun: 25, maxNewContactsPerRun: 10, maxSourceRecordsPerRun: 10,
  maxProviderRequestsPerRun: 6, maxContactsPerCompany: 5, maxRunDurationMs: 600_000, lockTtlMs: 900_000,
});
const WRITE_PHRASE = "CONTACTS_MAX_10";

export function parseOperatorArgs(args: string[]): OperatorRequest {
  const values = new Map(args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => {
    const i = a.indexOf("="); return [a.slice(2, i), a.slice(i + 1)];
  }));
  const mode = values.get("mode");
  if (mode !== "dry-run" && mode !== "fixture-preview" && mode !== "provider-preview" && mode !== "controlled-write") {
    throw new Error("--mode must be dry-run, fixture-preview, provider-preview, or controlled-write");
  }
  const target = values.get("target");
  if (!target) throw new Error("--target is required");
  const providerRaw = values.get("provider") ?? "fixture";
  if (providerRaw !== "fixture" && providerRaw !== "apollo") throw new Error("--provider must be fixture or apollo");
  const prospectIds = (values.get("prospects") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return { mode, target, provider: providerRaw, prospectIds, confirmTarget: values.get("confirm-target"), confirmWrites: values.get("confirm-writes") };
}

export function selectApprovedEnvironment(request: OperatorRequest, environments: ApprovedEnvironment[]): ApprovedEnvironment {
  const environment = environments.find(({ id }) => id === request.target);
  if (!environment) throw new Error("target environment is not configured");
  if (environment.type === "production") throw new Error("production is prohibited for 100B pilot operations");
  if (!environment.approved) throw new Error("target environment is not approved");
  if (!environment.approvalReference) throw new Error("target environment approval reference is required");
  if (!environment.expectedSupabaseHostname) throw new Error("target environment Supabase hostname is required");
  if (request.mode === "controlled-write" && !environment.controlledWritesAllowed) throw new Error("controlled writes are disabled for target environment");
  if (request.mode === "controlled-write" && environment.type !== "pilot") throw new Error("controlled writes are restricted to an approved pilot environment");
  return environment;
}

export function validatePilotLimits(config: EnrichmentConfig): void {
  const { limits } = config;
  const checks: Array<[boolean, string]> = [
    [limits.maxCompaniesPerRun <= APPROVED_PILOT_LIMITS.maxCompaniesPerRun, "company cap exceeds five"],
    [limits.maxContactsPerRun <= APPROVED_PILOT_LIMITS.maxContactsPerRun, "contact cap exceeds 25"],
    [limits.maxNewContactsPerRun <= APPROVED_PILOT_LIMITS.maxNewContactsPerRun, "new-contact cap exceeds ten"],
    [limits.maxSourceRecordsPerRun <= APPROVED_PILOT_LIMITS.maxSourceRecordsPerRun, "source-record cap exceeds ten"],
    [limits.maxProviderRequestsPerRun <= APPROVED_PILOT_LIMITS.maxProviderRequestsPerRun, "provider request cap exceeds six"],
    [limits.maxContactsPerCompany <= APPROVED_PILOT_LIMITS.maxContactsPerCompany, "contacts-per-company cap exceeds five"],
    [(limits.maxRunDurationMs ?? Infinity) <= APPROVED_PILOT_LIMITS.maxRunDurationMs, "runtime exceeds ten minutes"],
    [config.lockTtlMs === APPROVED_PILOT_LIMITS.lockTtlMs, "lock TTL must equal fifteen minutes"],
  ];
  const failure = checks.find(([valid]) => !valid);
  if (failure) throw new Error(failure[1]);
}

function hostname(url: string): string { try { return new URL(url).hostname.toLowerCase(); } catch { throw new Error("Supabase URL is invalid"); } }
function validateWorkerJwt(jwt: string): void {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8")) as { role?: string };
    if (payload.role !== "veltex_100b_worker") throw new Error();
  } catch { throw new Error("worker JWT role is invalid"); }
}

export interface OperatorPreflight {
  request: OperatorRequest; environment: ApprovedEnvironment; config: EnrichmentConfig;
  credentialPresence: { apolloApiKey: boolean; supabaseUrl: boolean; supabaseAnonKey: boolean; workerJwt: boolean };
}
export function preflightOperator(args: string[], env: Record<string, string | undefined>, environments: ApprovedEnvironment[]): OperatorPreflight {
  const request = parseOperatorArgs(args);
  const environment = selectApprovedEnvironment(request, environments);
  const config = load100BConfig(request.mode === "controlled-write" ? env : { ...env, VELTEX_100B_ENABLED: "true" }, request.provider);
  validatePilotLimits(config);
  const credentialPresence = {
    apolloApiKey: Boolean(env.APOLLO_API_KEY), supabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY), workerJwt: Boolean(env.SUPABASE_100B_WORKER_JWT),
  };
  if (env.NEXT_PUBLIC_SUPABASE_URL && hostname(env.NEXT_PUBLIC_SUPABASE_URL) !== environment.expectedSupabaseHostname!.toLowerCase()) {
    throw new Error("Supabase project does not match approved environment");
  }
  if (request.mode === "fixture-preview" && request.provider !== "fixture") throw new Error("fixture-preview requires --provider=fixture");
  if (request.mode === "provider-preview") {
    if (request.provider !== "apollo") throw new Error("provider-preview requires a live provider (--provider=apollo)");
    if (!credentialPresence.apolloApiKey) throw new Error("APOLLO_API_KEY is required for provider-preview");
    if (request.prospectIds.length === 0) throw new Error("--prospects is required for provider-preview");
  }
  if (request.mode === "controlled-write") {
    if (env.VELTEX_100B_ENABLED !== "true") throw new Error("VELTEX_100B_ENABLED=true is required for controlled writes");
    if (env.VELTEX_100B_TARGET_ENVIRONMENT !== environment.id) throw new Error("target environment variable does not match approved environment");
    if (request.confirmTarget !== environment.id) throw new Error("explicit target confirmation does not match approved environment");
    if (request.confirmWrites !== WRITE_PHRASE) throw new Error(`--confirm-writes=${WRITE_PHRASE} is required`);
    if (request.prospectIds.length === 0) throw new Error("--prospects is required for controlled writes");
    if (request.provider === "apollo" && !credentialPresence.apolloApiKey) throw new Error("APOLLO_API_KEY is required when --provider=apollo");
    if (!credentialPresence.supabaseUrl || !credentialPresence.supabaseAnonKey || !credentialPresence.workerJwt) throw new Error("complete Supabase worker credentials are required for controlled writes");
    validateWorkerJwt(env.SUPABASE_100B_WORKER_JWT!);
  }
  return { request, environment, config, credentialPresence };
}
