import type { Provider } from "./types";

export interface EnrichmentLimits {
  maxCompaniesPerRun: number; maxContactsPerRun: number;
  maxNewContactsPerRun: number; maxSourceRecordsPerRun: number;
  maxProviderRequestsPerRun: number; maxContactsPerCompany: number; maxRunDurationMs?: number;
}
export interface EnrichmentConfig {
  enabled: boolean; manualOnly: true; lockTtlMs: number;
  orchestrationEnabled?: boolean;
  provider: Provider; limits: EnrichmentLimits;
}
function positiveInt(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}
export function load100BConfig(env: Record<string, string | undefined>, provider: Provider): EnrichmentConfig {
  const lockTtlMs = positiveInt(env.VELTEX_100B_LOCK_TTL_MS, 15 * 60 * 1000, "lock TTL");
  const maxRunDurationMs = positiveInt(env.VELTEX_100B_MAX_RUN_DURATION_MS, 10 * 60 * 1000, "max run duration");
  if (maxRunDurationMs >= lockTtlMs) throw new Error("100B max run duration must be below lock TTL");
  return {
    enabled: env.VELTEX_100B_ENABLED === "true", manualOnly: true, orchestrationEnabled: env.VELTEX_100B_ALLOW_100G === "true", lockTtlMs, provider,
    limits: {
      maxCompaniesPerRun: positiveInt(env.VELTEX_100B_MAX_COMPANIES, 5, "company cap"),
      maxContactsPerRun: positiveInt(env.VELTEX_100B_MAX_CONTACTS, 25, "contact cap"),
      maxNewContactsPerRun: positiveInt(env.VELTEX_100B_MAX_NEW_CONTACTS, 10, "new contact cap"),
      maxSourceRecordsPerRun: positiveInt(env.VELTEX_100B_MAX_SOURCE_RECORDS, 10, "source record cap"),
      maxProviderRequestsPerRun: positiveInt(env.VELTEX_100B_MAX_PROVIDER_REQUESTS, 6, "provider request cap"),
      maxContactsPerCompany: positiveInt(env.VELTEX_100B_MAX_CONTACTS_PER_COMPANY, 5, "contacts-per-company cap"),
      maxRunDurationMs,
    },
  };
}
export function assertSafeToRun(config: EnrichmentConfig, trigger: string): void {
  if (!config.enabled) throw new Error("100B is inactive; set VELTEX_100B_ENABLED=true for a manual run");
  if (trigger === "100g" && config.orchestrationEnabled) return;
  if (trigger !== "manual") throw new Error("100B permits manual execution only unless 100G orchestration is explicitly enabled");
}
