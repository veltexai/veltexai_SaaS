// PII-safe helpers: email normalization + a stable timestamp normalizer used by both the fingerprint
// and the normalized event. Deterministic and pure.

export function normalizeEmail(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;
  // Reject obvious malformed shapes; keep the whole address (do not strip +tags — a tagged address is
  // a distinct deliverable identity).
  const [local, domain] = trimmed.split("@");
  if (!local || !domain || domain.indexOf(".") < 1) return null;
  return `${local}@${domain}`;
}

export function emailDomain(normalizedEmail: string | null): string | null {
  if (!normalizedEmail) return null;
  const domain = normalizedEmail.split("@")[1] ?? "";
  return domain || null;
}

// Canonical, stable ISO-8601 (UTC, millisecond precision) for a provider timestamp. Returns null when
// the value is missing or unparseable — callers fail closed on a null occurredAt.
export function normalizeTimestamp(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const ms = typeof raw === "number" ? raw : Date.parse(String(raw));
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}
