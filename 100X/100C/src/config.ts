import type { OutboundProvider } from "./types";
import { assertOutboundComplianceReady, loadOutboundCompliance, type OutboundComplianceConfig } from "./compliance";

// Centralized, conservative 100C pilot limits — the single source of truth. Retries count as
// physical provider requests. Nothing here is active by default.
export interface SyncLimits {
  maxContactsConsidered: number;      // <= 5
  maxLeadsSubmitted: number;          // <= 1
  maxInstantlyWriteRequests: number;  // <= 1
  maxProviderRequestsPerRun: number;  // <= 4 (campaign read + reconcile + write + margin)
  maxRunDurationMs: number;           // <= 10 min
  maxEligibilityAgeMs: number;        // staleness bound on the 100B verification snapshot
}
export interface SyncConfig {
  enabled: boolean;
  manualOnly: true;
  orchestrationEnabled?: boolean;
  allowActiveCampaign?: boolean;
  lockTtlMs: number;                  // exactly 15 min
  provider: OutboundProvider;
  limits: SyncLimits;
  compliance?: OutboundComplianceConfig;
}

export const APPROVED_PILOT_SYNC_LIMITS = Object.freeze({
  maxContactsConsidered: 5,
  maxLeadsSubmitted: 1,
  maxInstantlyWriteRequests: 1,
  maxProviderRequestsPerRun: 4,
  maxRunDurationMs: 600_000,
  lockTtlMs: 900_000,
  maxEligibilityAgeMs: 14 * 24 * 60 * 60 * 1000, // 14 days: re-verify older snapshots
});

function positiveInt(value: string | undefined, fallback: number, name: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function load100CConfig(env: Record<string, string | undefined>, provider: OutboundProvider): SyncConfig {
  const lockTtlMs = positiveInt(env.VELTEX_100C_LOCK_TTL_MS, APPROVED_PILOT_SYNC_LIMITS.lockTtlMs, "lock TTL");
  const maxRunDurationMs = positiveInt(env.VELTEX_100C_MAX_RUN_DURATION_MS, APPROVED_PILOT_SYNC_LIMITS.maxRunDurationMs, "max run duration");
  if (maxRunDurationMs >= lockTtlMs) throw new Error("100C max run duration must be below lock TTL");
  return {
    enabled: env.VELTEX_100C_ENABLED === "true",
    manualOnly: true,
    orchestrationEnabled: env.VELTEX_100C_ALLOW_100G === "true",
    allowActiveCampaign: env.VELTEX_100C_ALLOW_ACTIVE_CAMPAIGN === "true",
    lockTtlMs,
    provider,
    compliance: loadOutboundCompliance(env),
    limits: {
      maxContactsConsidered: positiveInt(env.VELTEX_100C_MAX_CONTACTS, APPROVED_PILOT_SYNC_LIMITS.maxContactsConsidered, "contacts-considered cap"),
      maxLeadsSubmitted: positiveInt(env.VELTEX_100C_MAX_LEADS, APPROVED_PILOT_SYNC_LIMITS.maxLeadsSubmitted, "leads-submitted cap"),
      maxInstantlyWriteRequests: positiveInt(env.VELTEX_100C_MAX_WRITES, APPROVED_PILOT_SYNC_LIMITS.maxInstantlyWriteRequests, "write-request cap"),
      maxProviderRequestsPerRun: positiveInt(env.VELTEX_100C_MAX_PROVIDER_REQUESTS, APPROVED_PILOT_SYNC_LIMITS.maxProviderRequestsPerRun, "provider request cap"),
      maxRunDurationMs,
      maxEligibilityAgeMs: positiveInt(env.VELTEX_100C_MAX_ELIGIBILITY_AGE_MS, APPROVED_PILOT_SYNC_LIMITS.maxEligibilityAgeMs, "eligibility age bound"),
    },
  };
}

export function assertSafeToRun(config: SyncConfig, trigger: string): void {
  if (!config.enabled) throw new Error("100C is inactive; set VELTEX_100C_ENABLED=true for a manual run");
  if (trigger !== "manual" && !(trigger === "100g" && config.orchestrationEnabled)) {
    throw new Error("100C permits manual execution only unless 100G orchestration is explicitly enabled");
  }
  // Fixture/offline runs may exercise workflow logic without sender credentials. Any real
  // Instantly run must prove the complete compliance configuration before the first write.
  if (config.provider === "instantly") {
    if (!config.compliance) throw new Error("outbound compliance configuration is required");
    assertOutboundComplianceReady(config.compliance);
    if (process.env.VELTEX_100C_GLOBAL_SEND_PAUSE === "true") throw new Error("global outbound sending pause is active");
    if (process.env.VELTEX_100C_NEW_AUDIENCE_PAUSE === "true") throw new Error("new-audience sending pause is active");
  }
}
