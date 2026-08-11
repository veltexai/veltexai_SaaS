import type { Geography } from "./types";

export const DEFAULT_SEARCH_TERMS = ["commercial janitorial", "commercial cleaning", "office cleaning", "building cleaning", "maid services", "residential cleaning"] as const;
export interface DiscoveryLimits {
  maxCandidatesPerRun: number; maxNewProspectsPerRun: number; maxSourceRecordsPerRun: number;
  maxPlacesRequestsPerRun: number; maxPagesPerSearch: number; maxRunDurationMs?: number;
}
export interface DiscoveryConfig {
  enabled: boolean; manualOnly: true; lockTtlMs: number; geographies: Geography[];
  orchestrationEnabled?: boolean;
  searchTerms: readonly string[]; limits: DiscoveryLimits;
}
function positiveInt(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}
export function load100AConfig(env: Record<string, string | undefined>, geographies: Geography[]): DiscoveryConfig {
  if (geographies.length === 0) throw new Error("100A requires at least one geography");
  if (new Set(geographies.map(({ id }) => id)).size !== geographies.length) throw new Error("100A geography ids must be unique");
  const lockTtlMs = positiveInt(env.VELTEX_100A_LOCK_TTL_MS, 15 * 60 * 1000, "lock TTL");
  const maxRunDurationMs = positiveInt(env.VELTEX_100A_MAX_RUN_DURATION_MS, 10 * 60 * 1000, "max run duration");
  if (maxRunDurationMs >= lockTtlMs) throw new Error("100A max run duration must be below lock TTL");
  return {
    enabled: env.VELTEX_100A_ENABLED === "true", manualOnly: true, orchestrationEnabled: env.VELTEX_100A_ALLOW_100G === "true", lockTtlMs, geographies,
    searchTerms: DEFAULT_SEARCH_TERMS,
    limits: {
      maxCandidatesPerRun: positiveInt(env.VELTEX_100A_MAX_CANDIDATES, 50, "candidate cap"),
      maxNewProspectsPerRun: positiveInt(env.VELTEX_100A_MAX_NEW_PROSPECTS, 5, "new prospect cap"),
      maxSourceRecordsPerRun: positiveInt(env.VELTEX_100A_MAX_SOURCE_RECORDS, 5, "source record cap"),
      maxPlacesRequestsPerRun: positiveInt(env.VELTEX_100A_MAX_PLACES_REQUESTS, 6, "Places request cap"),
      maxPagesPerSearch: positiveInt(env.VELTEX_100A_MAX_PAGES_PER_SEARCH, 1, "Places page cap"),
      maxRunDurationMs,
    },
  };
}
export function assertSafeToRun(config: DiscoveryConfig, trigger: string): void {
  if (!config.enabled) throw new Error("100A is inactive; set VELTEX_100A_ENABLED=true for a manual run");
  if (trigger === "100g" && config.orchestrationEnabled) return;
  if (trigger !== "manual") throw new Error("100A permits manual execution only unless 100G orchestration is explicitly enabled");
}
