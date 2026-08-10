import { normalizeEmail, normalizeTimestamp } from "./normalize";
import type { CustomerStatusPayload, SuppressionKind } from "./types";

// Internal customer/trial status ingestion (Part 9). Maps a Veltex AI subscription/trial status event
// to a durable suppression kind so existing customers and active trials are excluded from cold
// outreach automatically. It carries NO billing data and never queries Stripe. Matching is by
// normalized user email only. Append-only: a trial ending / subscription cancelling does NOT remove
// suppression here — former customers must not silently re-enter cold outreach.

const STATUS_TO_KIND: Record<string, SuppressionKind> = {
  trial_started: "active_trial",
  subscription_trialing: "active_trial",
  subscription_active: "existing_customer",
  customer_confirmed: "existing_customer",
};

// optional-never fields keep both branches' properties accessible so the union narrows under strict
// and non-strict tsconfig settings alike.
export type CustomerStatusResult =
  | { ok: true; kind: SuppressionKind; normalizedEmail: string; occurredAt: string; externalReference: string | null; source: string; field?: never; reason?: never }
  | { ok: false; field: string; reason: string; kind?: never; normalizedEmail?: never; occurredAt?: never; externalReference?: never; source?: never };

export function normalizeCustomerStatus(payload: CustomerStatusPayload, now: Date): CustomerStatusResult {
  if (!payload || typeof payload !== "object") return { ok: false, field: "body", reason: "not an object" };
  const status = typeof payload.status === "string" ? payload.status.trim() : "";
  if (!status) return { ok: false, field: "status", reason: "missing" };
  const kind = STATUS_TO_KIND[status];
  if (!kind) return { ok: false, field: "status", reason: "unknown status" };

  const normalizedEmail = normalizeEmail(payload.email ?? null);
  if (!normalizedEmail) return { ok: false, field: "email", reason: "missing or invalid" };

  const occurredAt = normalizeTimestamp(payload.occurredAt ?? null) ?? now.toISOString();
  const source = typeof payload.source === "string" && payload.source.trim() ? payload.source.trim() : "veltex_customer_status";
  const externalReference = typeof payload.externalReference === "string" && payload.externalReference.trim() ? payload.externalReference.trim() : null;
  return { ok: true, kind, normalizedEmail, occurredAt, externalReference, source };
}
