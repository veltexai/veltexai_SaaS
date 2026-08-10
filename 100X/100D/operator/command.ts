import type { AllowlistCampaign } from "../src/allowlist";

// 100D operator command parsing + preflight gating. All modes are OFFLINE and non-live: no webhook is
// registered, no endpoint is deployed, no real event is ingested, no email is sent.

export type OperatorMode = "dry-run" | "fixture-preview" | "local-route-test" | "reconciliation-preview";
const MODES = new Set<OperatorMode>(["dry-run", "fixture-preview", "local-route-test", "reconciliation-preview"]);

export interface OperatorRequest { mode: OperatorMode }

export function parseOperatorArgs(args: string[]): OperatorRequest {
  const values = new Map<string, string>();
  for (const a of args) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) values.set(m[1], m[2]);
  }
  const mode = values.get("mode") as OperatorMode | undefined;
  if (!mode || !MODES.has(mode)) throw new Error(`--mode is required and must be one of: ${[...MODES].join(", ")}`);
  return { mode };
}

// Load the authoritative allowlist from 100C's approved campaigns (single source of truth). 100D never
// accepts an arbitrary campaign id — an event must match an approved+active campaign here.
export function toAllowlist(campaignsFile: { campaigns?: Array<Record<string, unknown>> }): AllowlistCampaign[] {
  const rows = Array.isArray(campaignsFile?.campaigns) ? campaignsFile.campaigns : [];
  return rows.map((c) => ({
    configId: String(c.configId ?? ""),
    instantlyCampaignId: (c.instantlyCampaignId as string | null) ?? null,
    expectedWorkspaceId: (c.expectedWorkspaceId as string | null) ?? null,
    approved: Boolean(c.approved),
    active: Boolean(c.active),
  }));
}
