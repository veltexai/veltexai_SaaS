import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

interface UnsubscribeClaims { email: string; exp: number; nonce: string }
const encode = (value: string): string => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string): string => Buffer.from(value, "base64url").toString("utf8");
const signature = (body: string, secret: string): string => createHmac("sha256", secret).update(body).digest("base64url");

export function createUnsubscribeToken(email: string, secret: string, now = Date.now(), ttlSeconds = 60 * 60 * 24 * 30): string {
  const claims: UnsubscribeClaims = { email: email.trim().toLowerCase(), exp: Math.floor(now / 1000) + ttlSeconds, nonce: randomUUID() };
  const body = encode(JSON.stringify(claims));
  return `${body}.${signature(body, secret)}`;
}

export function verifyUnsubscribeToken(token: string, secret: string, now = Date.now()): string | null {
  try {
    const [body, supplied] = token.split(".");
    if (!body || !supplied) return null;
    const expected = signature(body, secret);
    const a = Buffer.from(supplied); const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const claims = JSON.parse(decode(body)) as UnsubscribeClaims;
    if (!claims || typeof claims.email !== "string" || !claims.email.includes("@") || !Number.isInteger(claims.exp) || claims.exp < Math.floor(now / 1000)) return null;
    return claims.email;
  } catch { return null; }
}
