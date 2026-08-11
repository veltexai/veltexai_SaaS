import { load100AConfig } from "../src/config";
import { APPROVED_PILOT_LIMITS, parseOperatorArgs, preflightOperator, validatePilotLimits, type ApprovedEnvironment, type ApprovedGeography } from "../operator/command";

const geography: ApprovedGeography = { id: "sea", label: "Seattle, WA", approved: true, approvalReference: "GEO-1" };
const pilot: ApprovedEnvironment = { id: "pilot-1", label: "Pilot", expectedSupabaseHostname: "pilot.supabase.co", approved: true, approvalReference: "ENV-1", controlledWritesAllowed: true, type: "pilot" };
const jwt = `x.${Buffer.from(JSON.stringify({ role: "veltex_100a_worker" })).toString("base64url")}.x`;
const writeArgs = ["--mode=write", "--geography=sea", "--target=pilot-1", "--confirm-target=pilot-1", "--confirm-writes=WRITE_MAX_5"];
const writeEnv = { GOOGLE_PLACES_API_KEY: "google-secret", VELTEX_100A_ENABLED: "true", VELTEX_100A_TARGET_ENVIRONMENT: "pilot-1", NEXT_PUBLIC_SUPABASE_URL: "https://pilot.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-secret", SUPABASE_100A_WORKER_JWT: jwt };

describe("approved environment allowlist", () => {
  it("rejects a missing target argument", () => expect(() => parseOperatorArgs(["--mode=dry-run", "--geography=sea"])).toThrow("--target"));
  it("rejects an unknown environment", () => expect(() => preflightOperator(["--mode=dry-run", "--geography=sea", "--target=unknown"], {}, [geography], [pilot])).toThrow("not configured"));
  it("rejects an unapproved environment", () => expect(() => preflightOperator(writeArgs, writeEnv, [geography], [{ ...pilot, approved: false }])).toThrow("not approved"));
  it("rejects a missing environment approval reference", () => expect(() => preflightOperator(writeArgs, writeEnv, [geography], [{ ...pilot, approvalReference: null }])).toThrow("approval reference"));
  it("rejects disabled controlled writes", () => expect(() => preflightOperator(writeArgs, writeEnv, [geography], [{ ...pilot, controlledWritesAllowed: false }])).toThrow("writes are disabled"));
  it("rejects a CLI target mismatch", () => expect(() => preflightOperator(writeArgs.map((arg) => arg === "--target=pilot-1" ? "--target=other" : arg), writeEnv, [geography], [pilot])).toThrow("not configured"));
  it("rejects an environment-variable mismatch", () => expect(() => preflightOperator(writeArgs, { ...writeEnv, VELTEX_100A_TARGET_ENVIRONMENT: "other" }, [geography], [pilot])).toThrow("variable"));
  it("rejects a confirmation mismatch", () => expect(() => preflightOperator(writeArgs.map((arg) => arg.startsWith("--confirm-target") ? "--confirm-target=other" : arg), writeEnv, [geography], [pilot])).toThrow("confirmation"));
  it("rejects a Supabase project mismatch", () => expect(() => preflightOperator(writeArgs, { ...writeEnv, NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" }, [geography], [pilot])).toThrow("project"));
  it("rejects production unconditionally", () => expect(() => preflightOperator(writeArgs, writeEnv, [geography], [{ ...pilot, type: "production" }])).toThrow("production"));
  it("accepts the complete approved pilot", () => expect(preflightOperator(writeArgs, writeEnv, [geography], [pilot])).toMatchObject({ environment: { id: "pilot-1" }, geography: { id: "sea" } }));
});

describe("every approved pilot limit", () => {
  const valid = load100AConfig({ VELTEX_100A_ENABLED: "true" }, [geography]);
  it("accepts the complete approved configuration", () => { expect(APPROVED_PILOT_LIMITS).toBeDefined(); expect(() => validatePilotLimits(valid)).not.toThrow(); });
  it.each([
    ["new prospect", { maxNewProspectsPerRun: 6 }],
    ["source-record", { maxSourceRecordsPerRun: 6 }],
    ["candidate", { maxCandidatesPerRun: 51 }],
    ["Places request", { maxPlacesRequestsPerRun: 7 }],
    ["page", { maxPagesPerSearch: 2 }],
    ["runtime", { maxRunDurationMs: 600_001 }],
  ])("rejects %s limit above approval", (_name, override) => {
    expect(() => validatePilotLimits({ ...valid, limits: { ...valid.limits, ...override } })).toThrow();
  });
  it("rejects an incorrect lock TTL", () => expect(() => validatePilotLimits({ ...valid, lockTtlMs: 899_999 })).toThrow("lock TTL"));
});
