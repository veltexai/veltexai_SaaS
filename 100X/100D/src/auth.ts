import { timingSafeEqual } from "node:crypto";

// Shared-secret webhook authentication (Part 3). Instantly V2 exposes NO official signed-webhook
// mechanism (verified 2026-08: the Webhook object has a custom `headers` field but no signing secret),
// so 100D authenticates via a dedicated custom header `X-Veltex-100D-Secret` compared timing-safely to
// a server-only environment secret. Never log the secret or the header value.

export const SECRET_HEADER = "x-veltex-100d-secret";

export interface AuthResult { ok: boolean; reason: string }

// Timing-safe constant-comparison. Rejects missing/blank/malformed/incorrect values. The comparison is
// length-padded through SHA-256 so it does not early-exit on length and does not leak via timing.
export function verifySharedSecret(providedRaw: string | null | undefined, expected: string | undefined): AuthResult {
  if (!expected || expected.trim().length < 16) {
    // Fail closed if the server secret is unset or too weak to be meaningful.
    return { ok: false, reason: "server secret is not configured" };
  }
  if (typeof providedRaw !== "string") return { ok: false, reason: "missing credential" };
  const provided = providedRaw.trim();
  if (!provided) return { ok: false, reason: "blank credential" };
  // Compare fixed-width digests so timingSafeEqual never sees mismatched lengths (which would throw and
  // leak length information). This keeps the comparison constant-time w.r.t. the secret.
  const a = sha256(provided);
  const b = sha256(expected);
  const equal = timingSafeEqual(a, b);
  return equal ? { ok: true, reason: "ok" } : { ok: false, reason: "invalid credential" };
}

import { createHash } from "node:crypto";
function sha256(s: string): Buffer { return createHash("sha256").update(s, "utf8").digest(); }
