import { createHash } from "node:crypto";
import { FINGERPRINT_VERSION } from "./types";
import { normalizeEmail, normalizeTimestamp } from "./normalize";

// Deterministic event identity (Part 5). Instantly's V2 webhook payload has NO stable per-event id, so
// 100D derives a SHA-256 fingerprint from a canonical, versioned subset of the event. Requirements:
//   - canonical ordering + explicit version + stable timestamp normalization
//   - NO raw email in the fingerprint input (the email is hashed first)
//   - identical replay -> identical id (idempotent no-op); distinct legitimate events -> distinct ids
//
// The versioned subset: provider, workspace, campaign_id, event_type, sha256(normalized email),
// normalized timestamp, and (only when present) email_id, step, variant.

const sha256hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

export interface FingerprintInput {
  provider: string;
  workspace: string | null | undefined;
  campaignId: string | null | undefined;
  eventType: string;
  leadEmail: string | null | undefined;
  timestamp: string | number | null | undefined;
  emailId?: string | null;
  step?: number | string | null;
  variant?: number | string | null;
}

// Canonical field list — order is FIXED and part of the contract. Absent optional fields are encoded as
// the literal null so presence/absence is itself deterministic (never omitted, never reordered).
export function computeEventFingerprint(input: FingerprintInput): string {
  const emailNorm = normalizeEmail(input.leadEmail ?? null);
  const emailHash = emailNorm ? sha256hex(emailNorm) : "";
  const ts = normalizeTimestamp(input.timestamp ?? null) ?? "";
  const canonical = JSON.stringify([
    ["v", FINGERPRINT_VERSION],
    ["provider", String(input.provider)],
    ["workspace", input.workspace ?? null],
    ["campaign_id", input.campaignId ?? null],
    ["event_type", String(input.eventType)],
    ["email_sha256", emailHash],
    ["timestamp", ts],
    ["email_id", input.emailId ?? null],
    ["step", input.step ?? null],
    ["variant", input.variant ?? null],
  ]);
  return `${FINGERPRINT_VERSION}:${sha256hex(canonical)}`;
}
