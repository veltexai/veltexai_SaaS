import { resolve100DPilotTarget, validateIngestJwtRole, APPROVED_PILOT_SUPABASE_HOST, INGEST_JWT_ROLE } from "../src/config";

// A JWT is header.payload.signature; only the payload's role claim is inspected (Supabase verifies the
// signature). Build unsigned test tokens with a base64url payload.
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const tokenWithRole = (role: string) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role })}.sig`;

const PILOT_URL = `https://${APPROVED_PILOT_SUPABASE_HOST}`;
const GOOD_JWT = tokenWithRole(INGEST_JWT_ROLE);
const base = { VELTEX_100D_SUPABASE_URL: PILOT_URL, VELTEX_100D_SUPABASE_ANON_KEY: "anon-pub-key", VELTEX_100D_INGEST_JWT: GOOD_JWT };

describe("100D deploy target is pinned to the approved pilot Supabase project", () => {
  it("accepts the approved pilot host + a correctly-scoped JWT", () => {
    const r = resolve100DPilotTarget(base);
    expect(r.ok).toBe(true);
    expect(r.url).toBe(PILOT_URL);
  });
  it("rejects any non-pilot Supabase project (e.g. production)", () => {
    for (const host of ["vzhasjprwsvxpzbzyfsl.supabase.co", "iwoaaljitifloolszxlu.supabase.co", "evil.example.com"]) {
      const r = resolve100DPilotTarget({ ...base, VELTEX_100D_SUPABASE_URL: `https://${host}` });
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/not the approved pilot/);
    }
  });
  it("rejects an invalid URL", () => {
    expect(resolve100DPilotTarget({ ...base, VELTEX_100D_SUPABASE_URL: "not a url" }).ok).toBe(false);
  });
  it("fails closed when any dedicated var is missing", () => {
    expect(resolve100DPilotTarget({ ...base, VELTEX_100D_SUPABASE_URL: undefined }).ok).toBe(false);
    expect(resolve100DPilotTarget({ ...base, VELTEX_100D_SUPABASE_ANON_KEY: undefined }).ok).toBe(false);
    expect(resolve100DPilotTarget({ ...base, VELTEX_100D_INGEST_JWT: undefined }).ok).toBe(false);
  });
  it("does NOT fall back to the shared NEXT_PUBLIC_SUPABASE_URL", () => {
    // Only the shared prod URL is set — must still fail closed (no dedicated pilot var).
    const r = resolve100DPilotTarget({ NEXT_PUBLIC_SUPABASE_URL: "https://vzhasjprwsvxpzbzyfsl.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x", VELTEX_100D_INGEST_JWT: GOOD_JWT });
    expect(r.ok).toBe(false);
  });
  it("rejects an ingest JWT with the wrong or missing role", () => {
    expect(resolve100DPilotTarget({ ...base, VELTEX_100D_INGEST_JWT: tokenWithRole("service_role") }).ok).toBe(false);
    expect(resolve100DPilotTarget({ ...base, VELTEX_100D_INGEST_JWT: tokenWithRole("authenticated") }).ok).toBe(false);
    expect(resolve100DPilotTarget({ ...base, VELTEX_100D_INGEST_JWT: "garbage" }).ok).toBe(false);
  });
  it("validateIngestJwtRole only accepts the veltex_100d_ingest role", () => {
    expect(validateIngestJwtRole(GOOD_JWT)).toBe(true);
    expect(validateIngestJwtRole(tokenWithRole("postgres"))).toBe(false);
    expect(validateIngestJwtRole(undefined)).toBe(false);
    expect(validateIngestJwtRole("")).toBe(false);
  });
});
