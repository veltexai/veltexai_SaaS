// 100D configuration. Everything is disabled by default; a real run/route requires explicit env.
// Secrets are read from the environment but their VALUES never leave this module (only presence flags).

export interface Ingest100DConfig {
  enabled: boolean;              // VELTEX_100D_ENABLED === "true"
  maxBodyBytes: number;          // request body cap (default 64 KiB)
  webhookSecretPresent: boolean; // presence only — never the value
}

export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

export function load100DConfig(env: Record<string, string | undefined>): Ingest100DConfig {
  const maxBodyBytes = positiveInt(env.VELTEX_100D_MAX_BODY_BYTES, DEFAULT_MAX_BODY_BYTES);
  return {
    enabled: env.VELTEX_100D_ENABLED === "true",
    maxBodyBytes,
    webhookSecretPresent: Boolean(env.VELTEX_100D_WEBHOOK_SECRET && env.VELTEX_100D_WEBHOOK_SECRET.trim().length >= 16),
  };
}

function positiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// The ONLY Supabase project 100D may ever talk to. The deployed app's shared NEXT_PUBLIC_SUPABASE_URL
// points at production, so 100D must NOT use it — it reads DEDICATED pilot vars and pins the hostname.
export const APPROVED_PILOT_SUPABASE_HOST = "wzpgbbwdqtpyfiojowdj.supabase.co";
// The role claim the ingest JWT must carry (least-privilege EXECUTE-only role from migration 004).
export const INGEST_JWT_ROLE = "veltex_100d_ingest";

export interface Pilot100DTarget {
  ok: boolean;
  reason: string;
  url?: string;
  anonKey?: string;
  jwt?: string;
}

// Resolve + validate the 100D pilot Supabase target from dedicated env vars. Fails closed unless the URL
// host is exactly the approved pilot project and a JWT with the correct role claim is present. There is
// NO fallback to NEXT_PUBLIC_SUPABASE_URL — that would risk pointing 100D at production.
export function resolve100DPilotTarget(env: Record<string, string | undefined>): Pilot100DTarget {
  const url = env.VELTEX_100D_SUPABASE_URL;
  const anonKey = env.VELTEX_100D_SUPABASE_ANON_KEY;
  const jwt = env.VELTEX_100D_INGEST_JWT;
  if (!url || !anonKey || !jwt) return { ok: false, reason: "missing 100D pilot Supabase credentials" };
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return { ok: false, reason: "invalid 100D Supabase URL" }; }
  if (host !== APPROVED_PILOT_SUPABASE_HOST) return { ok: false, reason: "100D Supabase project is not the approved pilot" };
  if (!validateIngestJwtRole(jwt)) return { ok: false, reason: "ingest JWT role is invalid" };
  return { ok: true, reason: "ok", url, anonKey, jwt };
}

// Decode the JWT payload (no signature check — Supabase verifies the signature) and confirm the role
// claim. Fails closed on any malformed token so an invalid/mis-scoped JWT never reaches the provider.
export function validateIngestJwtRole(jwt: string | undefined): boolean {
  try {
    const part = (jwt ?? "").split(".")[1] ?? "";
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { role?: string };
    return payload.role === INGEST_JWT_ROLE;
  } catch { return false; }
}
