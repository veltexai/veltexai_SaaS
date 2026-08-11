import { FixtureEnrichmentProvider } from "../src/fixture-provider";
import { InMemoryContactRepository } from "../src/in-memory-repository";
import { NullSuppressionResolver } from "../src/suppression";
import type { CompanyContext } from "../src/types";
import type { ApprovedEnvironment } from "../operator/command";
import { executeOperator, type LocalContext, type OperatorFactories } from "../operator/runtime";

const pilot: ApprovedEnvironment = { id: "100b-pilot", label: "Pilot", expectedSupabaseHostname: "pilot.supabase.co", approved: true, approvalReference: "ENV-1", controlledWritesAllowed: true, type: "pilot" };
const jwt = `x.${Buffer.from(JSON.stringify({ role: "veltex_100b_worker" })).toString("base64url")}.x`;
const company: CompanyContext = { prospectId: "p1", companyName: "Evergreen", companyType: "commercial_cleaning", websiteDomain: "evergreen.example", eligibleCleaningCompany: true, isCustomer: false, isGloballySuppressed: false };
const records: Record<string, unknown>[] = [];
const output = { info: (r: Record<string, unknown>) => records.push(r) };
const localContext = (): LocalContext => ({ companies: [company], prospectIds: ["p1"], suppression: new NullSuppressionResolver(), provider: new FixtureEnrichmentProvider({ p1: [{ providerRecordId: "a1", firstName: "Dana", title: "Owner", email: "dana@evergreen.example", providerVerificationStatus: "verified" }] }) });

function factories(): OperatorFactories & { createFixtureContext: jest.Mock; createProviderContext: jest.Mock; createControlledProvider: jest.Mock; createSupabase: jest.Mock } {
  return {
    createFixtureContext: jest.fn(localContext),
    createProviderContext: jest.fn(localContext),
    createControlledProvider: jest.fn(() => new FixtureEnrichmentProvider({ p1: [] })),
    createSupabase: jest.fn(() => ({ repository: new InMemoryContactRepository([company]), diagnostics: { emit: jest.fn() } })),
  };
}
beforeEach(() => records.splice(0));

describe("100B operator mode isolation and preflight ordering", () => {
  it("true dry-run constructs no provider, no Supabase, and reports validated-no-call", async () => {
    const f = factories();
    const result = await executeOperator(["--mode=dry-run", "--target=100b-pilot"], {}, [pilot], f, output);
    expect(f.createFixtureContext).not.toHaveBeenCalled(); expect(f.createProviderContext).not.toHaveBeenCalled();
    expect(f.createControlledProvider).not.toHaveBeenCalled(); expect(f.createSupabase).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("summary");
    expect(records).toContainEqual(expect.objectContaining({ outcome: "validated-no-call", externalClientsConstructed: 0, databaseWrites: 0 }));
  });

  it("fixture-preview uses fixtures + in-memory only, never Supabase", async () => {
    const f = factories();
    const result = await executeOperator(["--mode=fixture-preview", "--target=100b-pilot"], {}, [pilot], f, output);
    expect(f.createFixtureContext).toHaveBeenCalledTimes(1); expect(f.createSupabase).not.toHaveBeenCalled();
    expect(result.summary).toMatchObject({ contactsCreated: 1, readyForOutreach: 1 });
  });

  it("provider-preview constructs the provider but never Supabase", async () => {
    const f = factories();
    await executeOperator(["--mode=provider-preview", "--target=100b-pilot", "--provider=apollo", "--prospects=p1"], { APOLLO_API_KEY: "key" }, [pilot], f, output);
    expect(f.createProviderContext).toHaveBeenCalledTimes(1); expect(f.createSupabase).not.toHaveBeenCalled();
    expect(records).toContainEqual(expect.objectContaining({ event: "operator.warning", warning: expect.stringContaining("Supabase is disabled") }));
  });

  it("controlled-write constructs clients only after every gate passes", async () => {
    const f = factories();
    const env = { VELTEX_100B_ENABLED: "true", VELTEX_100B_TARGET_ENVIRONMENT: "100b-pilot", NEXT_PUBLIC_SUPABASE_URL: "https://pilot.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_100B_WORKER_JWT: jwt };
    await executeOperator(["--mode=controlled-write", "--target=100b-pilot", "--provider=fixture", "--prospects=p1", "--confirm-target=100b-pilot", "--confirm-writes=CONTACTS_MAX_10"], env, [pilot], f, output);
    expect(f.createControlledProvider).toHaveBeenCalledTimes(1); expect(f.createSupabase).toHaveBeenCalledTimes(1);
  });

  it("constructs nothing on any failed gate", async () => {
    const cases: Array<[string[], Record<string, string | undefined>]> = [
      [["--mode=dry-run", "--target=bad"], {}],
      [["--mode=controlled-write", "--target=100b-pilot", "--provider=fixture", "--prospects=p1"], {}],
      [["--mode=provider-preview", "--target=100b-pilot", "--provider=apollo", "--prospects=p1"], {}],
    ];
    for (const [args, env] of cases) {
      const f = factories();
      await expect(executeOperator(args, env, [pilot], f, output)).rejects.toThrow();
      expect(f.createFixtureContext).not.toHaveBeenCalled(); expect(f.createProviderContext).not.toHaveBeenCalled();
      expect(f.createControlledProvider).not.toHaveBeenCalled(); expect(f.createSupabase).not.toHaveBeenCalled();
    }
  });

  it("redacts recognizable secrets from plans and summaries", async () => {
    const f = factories();
    const secrets = ["APOLLO-SECRET-123", "ANON-SECRET-456", jwt];
    await executeOperator(["--mode=dry-run", "--target=100b-pilot"], { APOLLO_API_KEY: secrets[0], NEXT_PUBLIC_SUPABASE_URL: "https://pilot.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: secrets[1], SUPABASE_100B_WORKER_JWT: secrets[2] }, [pilot], f, output);
    const serialized = JSON.stringify(records);
    for (const s of secrets) expect(serialized).not.toContain(s);
    expect(serialized).toContain('"apolloApiKey":true');
  });
});
