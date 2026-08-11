export const APPROVED_PILOT_SUPABASE_HOST = "wzpgbbwdqtpyfiojowdj.supabase.co";
export const REPLY_JWT_ROLE = "veltex_100e_reply";
export const DEFAULT_MAX_REPLY_CHARS = 32_000;

export interface Reply100EConfig {
  enabled: boolean;
  maxReplyChars: number;
}

export function load100EConfig(env: Record<string, string | undefined>): Reply100EConfig {
  const parsed = Number.parseInt(env.VELTEX_100E_MAX_REPLY_CHARS ?? "", 10);
  return {
    enabled: env.VELTEX_100E_ENABLED === "true",
    maxReplyChars: Number.isFinite(parsed) && parsed > 0 && parsed <= DEFAULT_MAX_REPLY_CHARS ? parsed : DEFAULT_MAX_REPLY_CHARS,
  };
}

export function resolve100EPilotTarget(env: Record<string, string | undefined>):
  | { ok: true; url: string; anonKey: string; jwt: string }
  | { ok: false; reason: string } {
  const url = env.VELTEX_100E_SUPABASE_URL;
  const anonKey = env.VELTEX_100E_SUPABASE_ANON_KEY;
  const jwt = env.VELTEX_100E_REPLY_JWT;
  if (!url || !anonKey || !jwt) return { ok: false, reason: "missing 100E pilot credentials" };
  try {
    if (new URL(url).hostname.toLowerCase() !== APPROVED_PILOT_SUPABASE_HOST) return { ok: false, reason: "100E target is not the approved pilot" };
  } catch { return { ok: false, reason: "invalid 100E Supabase URL" }; }
  if (!hasRole(jwt, REPLY_JWT_ROLE)) return { ok: false, reason: "100E JWT role is invalid" };
  return { ok: true, url, anonKey, jwt };
}

function hasRole(jwt: string, role: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8")) as { role?: string };
    return payload.role === role;
  } catch { return false; }
}
