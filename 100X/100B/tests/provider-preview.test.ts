import { readFileSync } from "fs";
import { resolve } from "path";
import { loadProviderPreviewTargets, selectApprovedTargets, type ProviderPreviewTargetFile } from "../operator/provider-preview";
import { executeOperator, type LocalContext, type OperatorFactories } from "../operator/runtime";
import { ApolloEnrichmentProvider } from "../src/apollo-provider";
import { APOLLO_ENDPOINTS } from "../src/apollo-config";
import { NullSuppressionResolver } from "../src/suppression";
import type { ApprovedEnvironment } from "../operator/command";

const read = (name: string) => readFileSync(resolve(process.cwd(), `100X/100B/operator/${name}`), "utf8");
const targetsFile = () => JSON.parse(read("provider-preview-targets.json"));
const fixturesFile = () => JSON.parse(read("enrichment-fixtures.json"));
const pilot: ApprovedEnvironment = { id: "100b-pilot", label: "Pilot", expectedSupabaseHostname: "pilot.supabase.co", approved: true, approvalReference: "ENV-1", controlledWritesAllowed: true, type: "pilot" };
const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const REAL_IDS = ["3920f34e-ddde-40ce-8bc9-1af92f536b53", "687ddcd1-5d0f-4ba3-b89d-d43c5528abb7", "e26a220b-9990-440b-911f-b5e93547c669", "907f8851-0784-4575-964c-73c20d73ecd7", "3f4ac58c-8293-4a94-82a0-973c8b54c016"];
const REAL_DOMAINS = ["premiumserviceswa.us", "buildingcleaningnw.com", "noblejanitorial.com", "mercuryclean.com", "shinebrightcleaningsllc.com"];

describe("provider-preview target separation", () => {
  it("fixture-preview input uses only synthetic reserved example.com domains", () => {
    const domains = fixturesFile().companies.map((c: any) => c.websiteDomain);
    expect(domains.length).toBe(5);
    for (const d of domains) expect(d).toMatch(/\.example\.com$/);
  });

  it("provider-preview input uses only approved real (non-example) domains", () => {
    const t = targetsFile();
    const domains = t.companies.map((c: any) => c.websiteDomain);
    expect(domains.sort()).toEqual([...REAL_DOMAINS].sort());
    for (const d of domains) expect(d).not.toMatch(/example\.(com|org|net)$/i);
    expect(t.prospectIds.sort()).toEqual([...REAL_IDS].sort());
  });

  it("keeps prospect IDs identical to the fixture keys (same companies, different binding)", () => {
    expect(targetsFile().prospectIds.sort()).toEqual(fixturesFile().prospectIds.sort());
  });

  it("carries no contact PII or secrets in the approved target file", () => {
    const raw = read("provider-preview-targets.json");
    expect(raw).not.toMatch(/@/);                       // no email addresses
    expect(raw).not.toMatch(/"email"|"phone"|"apiKey"|"jwt"|"person_id"|"apollo"/i);
    expect(raw).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);   // no JWT
  });

  it("the two input files cannot be interchanged: the targets loader rejects example.com domains", () => {
    const reader = (name: string) => (name === "provider-preview-targets.json" ? read("enrichment-fixtures.json") : read(name));
    expect(() => loadProviderPreviewTargets(reader)).toThrow(/reserved example domain/);
  });
});

describe("provider-preview approved-target selection (fail closed)", () => {
  const targets = (): ProviderPreviewTargetFile => loadProviderPreviewTargets(read);

  it("accepts approved prospect IDs and returns their real domains", () => {
    const { companies, prospectIds } = selectApprovedTargets(targets(), [REAL_IDS[0], REAL_IDS[1]]);
    expect(prospectIds).toEqual([REAL_IDS[0], REAL_IDS[1]]);
    expect(companies.map((c) => c.websiteDomain)).toEqual(["premiumserviceswa.us", "buildingcleaningnw.com"]);
  });

  it("rejects an unknown prospect ID", () => {
    expect(() => selectApprovedTargets(targets(), ["not-a-real-id"])).toThrow(/not in the approved provider-preview targets/);
  });

  it("defaults to all approved targets when none are requested", () => {
    expect(selectApprovedTargets(targets(), []).prospectIds.sort()).toEqual([...REAL_IDS].sort());
  });
});

// Integration through the operator: real approved targets + real Apollo adapter + MOCK fetch.
function providerPreviewFactories(mockFetch: any) {
  const searchDomains: string[] = [];
  const wrapped = (async (url: any, init: any) => {
    if (url === APOLLO_ENDPOINTS.peopleSearch) searchDomains.push(JSON.parse(init.body).q_organization_domains_list[0]);
    return mockFetch(url, init);
  }) as unknown as typeof fetch;
  const createProviderContext = jest.fn((env: Record<string, string | undefined>, requestedIds: string[]): LocalContext => {
    const { companies, prospectIds } = selectApprovedTargets(loadProviderPreviewTargets(read), requestedIds); // fail-closed BEFORE provider
    const provider = new ApolloEnrichmentProvider(env.APOLLO_API_KEY ?? "test-key-xyz", wrapped, { sleep: async () => {} });
    return { companies, prospectIds, suppression: new NullSuppressionResolver(), provider };
  });
  const createSupabase = jest.fn(() => { throw new Error("SUPABASE_CONSTRUCTED"); });
  const f: OperatorFactories & { createProviderContext: jest.Mock; createSupabase: jest.Mock } = {
    createFixtureContext: jest.fn(() => { throw new Error("FIXTURE_CONSTRUCTED"); }),
    createProviderContext,
    createControlledProvider: jest.fn(() => { throw new Error("CONTROLLED_CONSTRUCTED"); }),
    createSupabase,
  };
  return { f, searchDomains };
}

const apolloMock = (async (url: any, init: any) => {
  if (url === APOLLO_ENDPOINTS.peopleSearch) {
    return res({ people: [{ id: "apollo-person-1", first_name: "Redacted", last_name: "Person", name: "Redacted Person", title: "Owner" }] });
  }
  return res({ person: { id: "apollo-person-1", email: "private-owner@realbiz.example-not-printed.com", email_status: "verified", phone_number: "+1-555-9999" } });
}) as unknown as typeof fetch;

describe("provider-preview operator run (real targets, mocked Apollo)", () => {
  it("caps at two companies, uses the approved real domains, and never constructs Supabase", async () => {
    const records: Record<string, unknown>[] = [];
    const output = { info: (r: Record<string, unknown>) => records.push(r) };
    const { f, searchDomains } = providerPreviewFactories(apolloMock);
    await executeOperator(["--mode=provider-preview", "--target=100b-pilot", "--provider=apollo", `--prospects=${REAL_IDS.slice(0, 3).join(",")}`], { APOLLO_API_KEY: "test-key-xyz" }, [pilot], f, output);
    expect(f.createProviderContext).toHaveBeenCalledTimes(1);
    expect(f.createSupabase).not.toHaveBeenCalled();
    expect(searchDomains).toEqual(["premiumserviceswa.us", "buildingcleaningnw.com"]); // 2 real domains, capped
    for (const d of searchDomains) expect(d).not.toMatch(/example/);
    const summary = records.find((r) => r.event === "operator.summary")?.summary as any;
    expect(summary.companiesProcessed).toBe(2);
  });

  it("rejects an unknown prospect ID before constructing the Apollo client", async () => {
    const records: Record<string, unknown>[] = [];
    const output = { info: (r: Record<string, unknown>) => records.push(r) };
    let apolloConstructed = 0;
    const createProviderContext = jest.fn((_env: any, requestedIds: string[]): LocalContext => {
      const sel = selectApprovedTargets(loadProviderPreviewTargets(read), requestedIds); // throws before the next line
      apolloConstructed += 1;
      return { companies: sel.companies, prospectIds: sel.prospectIds, suppression: new NullSuppressionResolver(), provider: new ApolloEnrichmentProvider("k", apolloMock, { sleep: async () => {} }) };
    });
    const f: OperatorFactories = { createFixtureContext: jest.fn(), createProviderContext, createControlledProvider: jest.fn(), createSupabase: jest.fn() };
    await expect(executeOperator(["--mode=provider-preview", "--target=100b-pilot", "--provider=apollo", "--prospects=bogus-id"], { APOLLO_API_KEY: "k" }, [pilot], f, output)).rejects.toThrow(/not in the approved provider-preview targets/);
    expect(apolloConstructed).toBe(0);
  });

  it("emits a redacted digest and never prints an email, phone, API key, or raw provider response", async () => {
    const records: Record<string, unknown>[] = [];
    const output = { info: (r: Record<string, unknown>) => records.push(r) };
    const { f } = providerPreviewFactories(apolloMock);
    await executeOperator(["--mode=provider-preview", "--target=100b-pilot", "--provider=apollo", `--prospects=${REAL_IDS[0]}`], { APOLLO_API_KEY: "test-key-xyz" }, [pilot], f, output);
    const serialized = JSON.stringify(records);
    expect(serialized).not.toContain("private-owner@realbiz.example-not-printed.com");
    expect(serialized).not.toContain("+1-555-9999");
    expect(serialized).not.toContain("test-key-xyz");
    expect(serialized).not.toMatch(/email_status|phone_number/); // no raw Apollo response fields
    expect(serialized).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/); // no email anywhere
    const digest = records.find((r) => r.event === "operator.provider_preview_digest") as any;
    expect(digest).toBeTruthy();
    expect(digest.contacts[0]).toMatchObject({ hasWorkEmail: true, verificationStatus: "verified", eligibility: "ready_for_outreach" });
    expect(digest.contacts[0]).not.toHaveProperty("email");
    expect(digest.estimatedCreditConsumingMatches).toBe(1);
  });
});
