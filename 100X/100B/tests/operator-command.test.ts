import { load100BConfig } from "../src/config";
import { APPROVED_PILOT_LIMITS, parseOperatorArgs, preflightOperator, validatePilotLimits, type ApprovedEnvironment } from "../operator/command";

const pilot: ApprovedEnvironment = { id: "100b-pilot", label: "Pilot", expectedSupabaseHostname: "pilot.supabase.co", approved: true, approvalReference: "ENV-1", controlledWritesAllowed: true, type: "pilot" };
const jwt = `x.${Buffer.from(JSON.stringify({ role: "veltex_100b_worker" })).toString("base64url")}.x`;
const writeArgs = ["--mode=controlled-write", "--target=100b-pilot", "--provider=fixture", "--prospects=p1", "--confirm-target=100b-pilot", "--confirm-writes=CONTACTS_MAX_10"];
const writeEnv = { VELTEX_100B_ENABLED: "true", VELTEX_100B_TARGET_ENVIRONMENT: "100b-pilot", NEXT_PUBLIC_SUPABASE_URL: "https://pilot.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_100B_WORKER_JWT: jwt };

describe("100B approved environment allowlist", () => {
  it("rejects a missing target", () => expect(() => parseOperatorArgs(["--mode=dry-run"])).toThrow("--target"));
  it("rejects an unknown environment", () => expect(() => preflightOperator(["--mode=dry-run", "--target=nope"], {}, [pilot])).toThrow("not configured"));
  it("rejects an unapproved environment", () => expect(() => preflightOperator(writeArgs, writeEnv, [{ ...pilot, approved: false }])).toThrow("not approved"));
  it("rejects a missing approval reference", () => expect(() => preflightOperator(writeArgs, writeEnv, [{ ...pilot, approvalReference: null }])).toThrow("approval reference"));
  it("rejects disabled controlled writes", () => expect(() => preflightOperator(writeArgs, writeEnv, [{ ...pilot, controlledWritesAllowed: false }])).toThrow("writes are disabled"));
  it("rejects production unconditionally", () => expect(() => preflightOperator(writeArgs, writeEnv, [{ ...pilot, type: "production" }])).toThrow("production"));
  it("rejects an environment-variable mismatch", () => expect(() => preflightOperator(writeArgs, { ...writeEnv, VELTEX_100B_TARGET_ENVIRONMENT: "other" }, [pilot])).toThrow("variable"));
  it("rejects a confirmation mismatch", () => expect(() => preflightOperator(writeArgs.map((a) => a.startsWith("--confirm-target") ? "--confirm-target=other" : a), writeEnv, [pilot])).toThrow("confirmation"));
  it("rejects the wrong write phrase", () => expect(() => preflightOperator(writeArgs.map((a) => a.startsWith("--confirm-writes") ? "--confirm-writes=NOPE" : a), writeEnv, [pilot])).toThrow("confirm-writes"));
  it("rejects a Supabase hostname mismatch", () => expect(() => preflightOperator(writeArgs, { ...writeEnv, NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" }, [pilot])).toThrow("project"));
  it("rejects missing worker credentials", () => expect(() => preflightOperator(writeArgs, { ...writeEnv, SUPABASE_100B_WORKER_JWT: undefined }, [pilot])).toThrow("Supabase worker credentials"));
  it("rejects an invalid worker JWT role", () => expect(() => preflightOperator(writeArgs, { ...writeEnv, SUPABASE_100B_WORKER_JWT: `x.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.x` }, [pilot])).toThrow("worker JWT"));
  it("accepts the complete approved pilot", () => expect(preflightOperator(writeArgs, writeEnv, [pilot])).toMatchObject({ environment: { id: "100b-pilot" } }));
});

describe("100B provider-mode gates", () => {
  it("rejects fixture-preview with a live provider", () => expect(() => preflightOperator(["--mode=fixture-preview", "--target=100b-pilot", "--provider=apollo"], {}, [pilot])).toThrow("fixture-preview requires"));
  it("rejects provider-preview without a provider key", () => expect(() => preflightOperator(["--mode=provider-preview", "--target=100b-pilot", "--provider=apollo", "--prospects=p1"], {}, [pilot])).toThrow("APOLLO_API_KEY"));
  it("rejects provider-preview without prospects", () => expect(() => preflightOperator(["--mode=provider-preview", "--target=100b-pilot", "--provider=apollo"], { APOLLO_API_KEY: "k" }, [pilot])).toThrow("--prospects"));
});

describe("100B pilot limits", () => {
  const valid = load100BConfig({ VELTEX_100B_ENABLED: "true" }, "fixture");
  it("accepts the approved configuration", () => { expect(APPROVED_PILOT_LIMITS).toBeDefined(); expect(() => validatePilotLimits(valid)).not.toThrow(); });
  it.each([
    ["company", { maxCompaniesPerRun: 6 }], ["contact", { maxContactsPerRun: 26 }], ["new-contact", { maxNewContactsPerRun: 11 }],
    ["source", { maxSourceRecordsPerRun: 11 }], ["provider request", { maxProviderRequestsPerRun: 7 }],
    ["per-company", { maxContactsPerCompany: 6 }], ["runtime", { maxRunDurationMs: 600_001 }],
  ])("rejects %s over approval", (_n, over) => expect(() => validatePilotLimits({ ...valid, limits: { ...valid.limits, ...over } })).toThrow());
  it("rejects an incorrect lock TTL", () => expect(() => validatePilotLimits({ ...valid, lockTtlMs: 899_999 })).toThrow("lock TTL"));
});
