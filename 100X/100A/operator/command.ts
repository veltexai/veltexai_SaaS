import { load100AConfig, type DiscoveryConfig } from "../src/config";
import type { Geography } from "../src/types";

export type OperatorMode = "dry-run" | "google-preview" | "write";
export type EnvironmentType = "pilot" | "staging" | "production";
export interface ApprovedGeography extends Geography { approved: boolean; approvalReference: string | null }
export interface ApprovedEnvironment {
  id: string; label: string; expectedSupabaseHostname: string | null; approved: boolean;
  approvalReference: string | null; controlledWritesAllowed: boolean; type: EnvironmentType;
}
export interface OperatorRequest { mode: OperatorMode; geographyId: string; target: string; confirmTarget?: string; confirmWrites?: string }

export const APPROVED_PILOT_LIMITS = Object.freeze({
  maxNewProspectsPerRun: 5, maxSourceRecordsPerRun: 5, maxCandidatesPerRun: 50,
  maxPlacesRequestsPerRun: 6, maxPagesPerSearch: 1, maxRunDurationMs: 600_000,
  lockTtlMs: 900_000,
});

export function parseOperatorArgs(args: string[]): OperatorRequest {
  const values = new Map(args.filter((arg) => arg.startsWith("--") && arg.includes("=")).map((arg) => {
    const index = arg.indexOf("="); return [arg.slice(2, index), arg.slice(index + 1)];
  }));
  const mode = values.get("mode");
  if (mode !== "dry-run" && mode !== "google-preview" && mode !== "write") throw new Error("--mode must be dry-run, google-preview, or write");
  const geographyId = values.get("geography"); const target = values.get("target");
  if (!geographyId) throw new Error("--geography is required");
  if (!target) throw new Error("--target is required");
  return { mode, geographyId, target, confirmTarget: values.get("confirm-target"), confirmWrites: values.get("confirm-writes") };
}

export function selectApprovedEnvironment(request: OperatorRequest, environments: ApprovedEnvironment[]): ApprovedEnvironment {
  const environment = environments.find(({ id }) => id === request.target);
  if (!environment) throw new Error("target environment is not configured");
  if (environment.type === "production") throw new Error("production is prohibited for 100A pilot operations");
  if (!environment.approved) throw new Error("target environment is not approved");
  if (!environment.approvalReference) throw new Error("target environment approval reference is required");
  if (!environment.expectedSupabaseHostname) throw new Error("target environment Supabase hostname is required");
  if (request.mode === "write" && !environment.controlledWritesAllowed) throw new Error("controlled writes are disabled for target environment");
  if (request.mode === "write" && environment.type !== "pilot") throw new Error("controlled writes are restricted to an approved pilot environment");
  return environment;
}

export function selectApprovedGeography(request: OperatorRequest, geographies: ApprovedGeography[]): ApprovedGeography {
  const geography = geographies.find(({ id }) => id === request.geographyId);
  if (!geography) throw new Error("geography is not configured");
  if (!geography.approved) throw new Error("geography is not approved");
  if (!geography.approvalReference) throw new Error("geography approval reference is required");
  return geography;
}

export function validatePilotLimits(config: DiscoveryConfig): void {
  const { limits } = config;
  const checks: Array<[boolean, string]> = [
    [limits.maxNewProspectsPerRun <= APPROVED_PILOT_LIMITS.maxNewProspectsPerRun, "new prospect cap exceeds five"],
    [limits.maxSourceRecordsPerRun <= APPROVED_PILOT_LIMITS.maxSourceRecordsPerRun, "source-record cap exceeds five"],
    [limits.maxCandidatesPerRun <= APPROVED_PILOT_LIMITS.maxCandidatesPerRun, "candidate cap exceeds 50"],
    [limits.maxPlacesRequestsPerRun <= APPROVED_PILOT_LIMITS.maxPlacesRequestsPerRun, "Places request cap exceeds six"],
    [limits.maxPagesPerSearch === APPROVED_PILOT_LIMITS.maxPagesPerSearch, "page cap must equal one"],
    [(limits.maxRunDurationMs ?? Infinity) <= APPROVED_PILOT_LIMITS.maxRunDurationMs, "runtime exceeds ten minutes"],
    [config.lockTtlMs === APPROVED_PILOT_LIMITS.lockTtlMs, "lock TTL must equal fifteen minutes"],
  ];
  const failure = checks.find(([valid]) => !valid);
  if (failure) throw new Error(failure[1]);
}

function hostname(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); }
  catch { throw new Error("Supabase URL is invalid"); }
}
function validateWorkerJwt(jwt: string): void {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8")) as { role?: string };
    if (payload.role !== "veltex_100a_worker") throw new Error();
  } catch { throw new Error("worker JWT role is invalid"); }
}

export interface OperatorPreflight {
  request: OperatorRequest; environment: ApprovedEnvironment; geography: ApprovedGeography;
  config: DiscoveryConfig; credentialPresence: { googleApiKey: boolean; supabaseUrl: boolean; supabaseAnonKey: boolean; workerJwt: boolean };
}
export function preflightOperator(args: string[], env: Record<string, string | undefined>, geographies: ApprovedGeography[], environments: ApprovedEnvironment[]): OperatorPreflight {
  const request = parseOperatorArgs(args);
  const environment = selectApprovedEnvironment(request, environments);
  const geography = selectApprovedGeography(request, geographies);
  const config = load100AConfig(request.mode === "write" ? env : { ...env, VELTEX_100A_ENABLED: "true" }, [geography]);
  validatePilotLimits(config);
  const credentialPresence = { googleApiKey: Boolean(env.GOOGLE_PLACES_API_KEY), supabaseUrl: Boolean(env.NEXT_PUBLIC_SUPABASE_URL), supabaseAnonKey: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY), workerJwt: Boolean(env.SUPABASE_100A_WORKER_JWT) };
  if (env.NEXT_PUBLIC_SUPABASE_URL && hostname(env.NEXT_PUBLIC_SUPABASE_URL) !== environment.expectedSupabaseHostname!.toLowerCase()) throw new Error("Supabase project does not match approved environment");
  if (request.mode === "google-preview" && !credentialPresence.googleApiKey) throw new Error("Google API credential is required for google-preview");
  if (request.mode === "write") {
    if (env.VELTEX_100A_ENABLED !== "true") throw new Error("VELTEX_100A_ENABLED=true is required for controlled writes");
    if (env.VELTEX_100A_TARGET_ENVIRONMENT !== environment.id) throw new Error("target environment variable does not match approved environment");
    if (request.confirmTarget !== environment.id) throw new Error("explicit target confirmation does not match approved environment");
    if (request.confirmWrites !== "WRITE_MAX_5") throw new Error("--confirm-writes=WRITE_MAX_5 is required");
    if (!credentialPresence.googleApiKey) throw new Error("Google API credential is required for controlled writes");
    if (!credentialPresence.supabaseUrl || !credentialPresence.supabaseAnonKey || !credentialPresence.workerJwt) throw new Error("complete Supabase worker credentials are required for controlled writes");
    validateWorkerJwt(env.SUPABASE_100A_WORKER_JWT!);
  }
  return { request, environment, geography, config, credentialPresence };
}
