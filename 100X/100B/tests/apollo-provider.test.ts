import { ApolloEnrichmentProvider, ApolloError } from "../src/apollo-provider";
import { APOLLO_ENDPOINTS } from "../src/apollo-config";
import { normalizeContact } from "../src/normalize";
import { evaluateEligibility } from "../src/eligibility";
import type { CompanyContext, SuppressionSignals } from "../src/types";

const SEARCH = APOLLO_ENDPOINTS.peopleSearch;
const MATCH = APOLLO_ENDPOINTS.peopleEnrichment;
const KEY = "secret-key-123";

const company: CompanyContext = { prospectId: "p1", companyName: "Evergreen", companyType: "commercial_cleaning", websiteDomain: "evergreen.example.com", eligibleCleaningCompany: true, isCustomer: false, isGloballySuppressed: false };
const noDomain: CompanyContext = { ...company, websiteDomain: null };
const noSuppression: SuppressionSignals = { unsubscribed: false, hardBounced: false, blocked: false, activeInCampaign: false, alreadyReceivedCampaign: false, emailGloballySuppressed: false };

const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const sp = (id: string, title: string, extra: Record<string, unknown> = {}) => ({ id, first_name: "Fx", last_name: id, name: `Fx ${id}`, title, ...extra });

interface Handlers { search?: (body: any) => Response | Promise<Response>; match?: (body: any, index: number) => Response | Promise<Response> }
function router(h: Handlers) {
  const searchBodies: any[] = [];
  const matchBodies: any[] = [];
  const fetchImpl = jest.fn(async (url: any, init: any) => {
    const body = JSON.parse(init.body);
    if (url === SEARCH) { searchBodies.push(body); return h.search ? h.search(body) : res({ people: [] }); }
    if (url === MATCH) { matchBodies.push(body); return h.match ? h.match(body, matchBodies.length - 1) : res({ person: {} }); }
    throw new Error(`unexpected url: ${url}`);
  });
  return { fetchImpl, searchBodies, matchBodies };
}
const provider = (fetchImpl: any, opts: Record<string, unknown> = {}) => new ApolloEnrichmentProvider(KEY, fetchImpl, { sleep: async () => {}, ...opts });
const evalOf = (candidate: any) => evaluateEligibility({ company, contact: normalizeContact(candidate, "apollo"), suppression: noSuppression, identityConflict: false, providerError: false });

describe("Apollo two-stage adapter — Stage 1 People Search", () => {
  it("uses the People Search endpoint with a domain-constrained, decision-maker-title body", async () => {
    const r = router({ search: () => res({ people: [sp("a1", "Owner")] }), match: () => res({ person: { email: "owner@evergreen.example.com", email_status: "verified" } }) });
    await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(r.fetchImpl.mock.calls[0][0]).toBe(SEARCH);
    expect(r.searchBodies[0].q_organization_domains_list).toEqual(["evergreen.example.com"]);
    expect(Array.isArray(r.searchBodies[0].person_titles)).toBe(true);
    expect(r.searchBodies[0].person_titles).toContain("Owner");
    expect(r.searchBodies[0].page).toBe(1);
    expect(typeof r.searchBodies[0].per_page).toBe("number");
  });

  it("fails closed with no request when the company has no domain", async () => {
    const r = router({});
    await expect(provider(r.fetchImpl).enrichCompany(noDomain, 6)).rejects.toMatchObject({ kind: "permanent" });
    expect(r.fetchImpl).not.toHaveBeenCalled();
  });

  it("returns no candidates and never enriches when search has no matches", async () => {
    const r = router({ search: () => res({ people: [] }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.candidates).toHaveLength(0);
    expect(r.matchBodies).toHaveLength(0);
    expect(r.searchBodies).toHaveLength(2);
    expect(out.accounting).toMatchObject({ searchRequests: 2, fallbackSearchRequests: 1 });
  });

  it("uses one bounded, domain-constrained related-title fallback after a strict zero result", async () => {
    const r = router({
      search: (body) => body.include_similar_titles
        ? res({ people: [sp("principal", "Managing Principal")] })
        : res({ people: [] }),
      match: () => res({ person: { email: "principal@evergreen.example.com", email_status: "verified" } }),
    });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(r.searchBodies).toHaveLength(2);
    expect(r.searchBodies[1]).toMatchObject({
      q_organization_domains_list: ["evergreen.example.com"],
      include_similar_titles: true,
    });
    expect(r.searchBodies[1].person_titles).toContain("Managing Member");
    expect(out.accounting).toMatchObject({ searchRequests: 2, fallbackSearchRequests: 1, enrichmentRequests: 1 });
    expect(out.candidates[0]?.email).toBe("principal@evergreen.example.com");
  });

  it("does not use fallback or enrichment after the shared one-request budget is exhausted", async () => {
    const r = router({ search: () => res({ people: [] }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 1);
    expect(r.searchBodies).toHaveLength(1);
    expect(r.matchBodies).toHaveLength(0);
    expect(out.accounting).toMatchObject({ searchRequests: 1, fallbackSearchRequests: 0 });
  });

  it("does not spend enrichment requests on unrelated fallback titles", async () => {
    const r = router({
      search: (body) => body.include_similar_titles
        ? res({ people: [sp("marketing", "Marketing Coordinator")] })
        : res({ people: [] }),
    });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.candidates).toHaveLength(0);
    expect(r.matchBodies).toHaveLength(0);
  });

  it("skips search results without a person id defensively", async () => {
    const r = router({ search: () => res({ people: [{ first_name: "NoId", title: "Owner" }, sp("has-id", "Owner")] }), match: () => res({ person: { email: "x@evergreen.example.com", email_status: "verified" } }) });
    await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(r.matchBodies).toHaveLength(1);
    expect(r.matchBodies[0].id).toBe("has-id");
  });

  it("treats a search response without people[] as malformed", async () => {
    const r = router({ search: () => res({ nope: true }) });
    await expect(provider(r.fetchImpl).enrichCompany(company, 6)).rejects.toMatchObject({ kind: "malformed" });
  });
});

describe("Apollo two-stage adapter — decision-maker ranking", () => {
  it("deduplicates repeated Apollo person ids before credit-bearing enrichment", async () => {
    const r = router({ search: () => res({ people: [sp("same", "Owner"), sp("same", "Owner")] }), match: () => res({ person: { email: "owner@evergreen.example.com", email_status: "verified" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(r.matchBodies).toHaveLength(1);
    expect(out.candidates).toHaveLength(1);
  });

  it("ranks decision-makers before enrichment and enriches the strongest first", async () => {
    const r = router({ search: () => res({ people: [sp("gen", "info"), sp("mgr", "Office Manager"), sp("own", "Owner")] }), match: (_b, i) => res({ person: { email: `e${i}@evergreen.example.com`, email_status: "verified" } }) });
    await provider(r.fetchImpl, { maxCandidatesEnrichedPerCompany: 1 }).enrichCompany(company, 6);
    expect(r.matchBodies).toHaveLength(1);
    expect(r.matchBodies[0].id).toBe("own");
  });

  it("enriches at most three candidates per company", async () => {
    const people = ["a", "b", "c", "d", "e"].map((x) => sp(x, "Owner"));
    const r = router({ search: () => res({ people }), match: (_b, i) => res({ person: { email: `e${i}@evergreen.example.com`, email_status: "verified" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 20);
    expect(r.matchBodies).toHaveLength(3);
    expect(out.candidates).toHaveLength(3);
    expect(out.accounting?.enrichmentRequests).toBe(3);
  });
});

describe("Apollo two-stage adapter — Stage 2 People Enrichment", () => {
  it("enriches via People Match with disabled cost/PII flags, no webhook, feeding the search id", async () => {
    const r = router({ search: () => res({ people: [sp("person-77", "Owner")] }), match: () => res({ person: { email: "owner@evergreen.example.com", email_status: "verified" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(r.fetchImpl.mock.calls[1][0]).toBe(MATCH);
    const body = r.matchBodies[0];
    expect(body.id).toBe("person-77");
    expect(body.reveal_personal_emails).toBe(false);
    expect(body.reveal_phone_number).toBe(false);
    expect(body.run_waterfall_email).toBe(false);
    expect(body.run_waterfall_phone).toBe(false);
    expect(body).not.toHaveProperty("webhook_url");
    expect(out.candidates[0]).toMatchObject({ providerRecordId: "person-77", email: "owner@evergreen.example.com", providerVerificationStatus: "verified", phone: null });
  });

  it("never treats a search-response email as usable; email comes only from enrichment", async () => {
    const r = router({ search: () => res({ people: [sp("a1", "Owner", { email: "leak-from-search@evergreen.example.com", email_status: "verified" })] }), match: () => res({ person: { id: "a1" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.candidates).toHaveLength(1);
    expect(out.candidates[0].email).toBeNull();
  });

  it("skips a candidate when enrichment returns no match", async () => {
    const r = router({ search: () => res({ people: [sp("a", "Owner"), sp("b", "Owner")] }), match: (_b, i) => (i === 0 ? res({}) : res({ person: { email: "b@evergreen.example.com", email_status: "verified" } })) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.candidates).toHaveLength(1);
    expect(out.candidates[0].email).toBe("b@evergreen.example.com");
  });

  it("never surfaces a phone even if enrichment returns one", async () => {
    const r = router({ search: () => res({ people: [sp("a1", "Owner")] }), match: () => res({ person: { email: "a@evergreen.example.com", email_status: "verified", phone_number: "+1-555-0100" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.candidates[0].phone).toBeNull();
  });
});

describe("Apollo two-stage adapter — normalization + fail-closed eligibility", () => {
  it("maps a verified enrichment email through the runner to ready_for_outreach", async () => {
    const r = router({ search: () => res({ people: [sp("a1", "Owner")] }), match: () => res({ person: { email: "Owner@Evergreen.Example.com", email_status: "verified" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    const contact = normalizeContact(out.candidates[0], "apollo");
    expect(contact.verificationStatus).toBe("verified");
    expect(contact.normalizedEmail).toBe("owner@evergreen.example.com");
    expect(evalOf(out.candidates[0]).eligibility).toBe("ready_for_outreach");
  });

  it.each(["likely to engage", "unavailable", "unknown", "extrapolated"])("fails closed on a non-verified enrichment status: %s", async (status) => {
    const r = router({ search: () => res({ people: [sp("a1", "Owner")] }), match: () => res({ person: { email: "owner@evergreen.example.com", email_status: status } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(evalOf(out.candidates[0]).eligibility).toBe("unverified");
  });

  it("fails closed to needs_enrichment when enrichment returns no email", async () => {
    const r = router({ search: () => res({ people: [sp("a1", "Owner")] }), match: () => res({ person: { id: "a1", email_status: null } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.candidates[0].email).toBeNull();
    expect(evalOf(out.candidates[0]).eligibility).toBe("needs_enrichment");
  });
});

describe("Apollo two-stage adapter — budgets, retries, accounting", () => {
  it("counts every physical retry against the budget and accounting", async () => {
    let s = 0;
    const r = router({ search: () => { s += 1; return s === 1 ? res({}, 503) : res({ people: [sp("a1", "Owner")] }); }, match: () => res({ person: { email: "owner@evergreen.example.com", email_status: "verified" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.accounting?.searchRequests).toBe(2);
    expect(out.accounting?.retryAttempts).toBe(1);
    expect(out.requestsUsed).toBe(3);
  });

  it("stops before enrichment when the shared budget is consumed by search", async () => {
    const r = router({ search: () => res({ people: [sp("a1", "Owner")] }), match: () => res({ person: { email: "x@evergreen.example.com", email_status: "verified" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 1);
    expect(r.matchBodies).toHaveLength(0);
    expect(out.candidates).toHaveLength(0);
    expect(out.accounting?.searchRequests).toBe(1);
    expect(out.accounting?.enrichmentRequests).toBe(0);
  });

  it("caps enrichment by the shared budget independently of the per-company cap", async () => {
    const people = ["a", "b", "c"].map((x) => sp(x, "Owner"));
    const r = router({ search: () => res({ people }), match: (_b, i) => res({ person: { email: `e${i}@evergreen.example.com`, email_status: "verified" } }) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 2);
    expect(r.matchBodies).toHaveLength(1);
    expect(out.accounting?.enrichmentRequests).toBe(1);
    expect(out.accounting?.searchRequests).toBe(1);
  });

  it("estimates one credit-consuming match per enrichment that returns an email", async () => {
    const r = router({ search: () => res({ people: [sp("a", "Owner"), sp("b", "Owner")] }), match: (_b, i) => (i === 0 ? res({ person: { email: "a@evergreen.example.com", email_status: "verified" } }) : res({ person: { id: "b" } })) });
    const out = await provider(r.fetchImpl).enrichCompany(company, 6);
    expect(out.accounting?.successfulEnrichments).toBe(1);
    expect(out.accounting?.estimatedCreditConsumingMatches).toBe(1);
  });
});

describe("Apollo two-stage adapter — error classification", () => {
  it.each([[401, "auth"], [402, "credit"], [403, "permission"]])("does not retry search HTTP %s (%s)", async (status, kind) => {
    const r = router({ search: () => res({}, status) });
    await expect(provider(r.fetchImpl).enrichCompany(company, 6)).rejects.toMatchObject({ kind });
    expect(r.searchBodies).toHaveLength(1);
    expect(r.matchBodies).toHaveLength(0);
  });

  it("retries a rate-limited search and counts attempts", async () => {
    const r = router({ search: () => res({}, 429) });
    await expect(provider(r.fetchImpl, { maxAttemptsPerRequest: 3 }).enrichCompany(company, 6)).rejects.toMatchObject({ kind: "rate_limit" });
    expect(r.searchBodies).toHaveLength(3);
  });

  it("throws after search retry exhaustion on repeated 5xx", async () => {
    const r = router({ search: () => res({}, 503) });
    await expect(provider(r.fetchImpl, { maxAttemptsPerRequest: 3 }).enrichCompany(company, 6)).rejects.toBeInstanceOf(ApolloError);
    expect(r.searchBodies).toHaveLength(3);
  });

  it("classifies a search timeout and bounds retries", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fetchImpl = jest.fn(async () => { throw abort; });
    await expect(provider(fetchImpl, { maxAttemptsPerRequest: 2, timeoutMs: 1 }).enrichCompany(company, 6)).rejects.toMatchObject({ kind: "timeout", attempts: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects a malformed search response body", async () => {
    const r = router({ search: () => new Response("{", { status: 200 }) });
    await expect(provider(r.fetchImpl).enrichCompany(company, 6)).rejects.toMatchObject({ kind: "malformed" });
  });

  it("continues after a transient enrichment failure and records a provider error", async () => {
    const r = router({ search: () => res({ people: [sp("a", "Owner"), sp("b", "Owner")] }), match: (_b, i) => (i === 0 ? res({}, 503) : res({ person: { email: "b@evergreen.example.com", email_status: "verified" } })) });
    const out = await provider(r.fetchImpl, { maxAttemptsPerRequest: 1 }).enrichCompany(company, 6);
    expect(out.accounting?.providerErrors).toBe(1);
    expect(out.candidates.map((c) => c.email)).toEqual(["b@evergreen.example.com"]);
  });

  it("returns no candidates when search succeeds but all enrichment attempts fail", async () => {
    const r = router({ search: () => res({ people: [sp("a", "Owner"), sp("b", "Owner")] }), match: () => res({}, 503) });
    const out = await provider(r.fetchImpl, { maxAttemptsPerRequest: 1 }).enrichCompany(company, 6);
    expect(out.candidates).toHaveLength(0);
    expect(out.accounting?.providerErrors).toBeGreaterThanOrEqual(1);
    expect(out.accounting?.searchRequests).toBe(1);
  });

  it("stops immediately on a systemic auth error during enrichment", async () => {
    const r = router({ search: () => res({ people: [sp("a", "Owner"), sp("b", "Owner")] }), match: () => res({}, 401) });
    await expect(provider(r.fetchImpl).enrichCompany(company, 6)).rejects.toMatchObject({ kind: "auth" });
    expect(r.matchBodies).toHaveLength(1);
  });
});

describe("Apollo two-stage adapter — secrets, redaction, capabilities", () => {
  it("keeps the API key out of thrown errors and never logs", async () => {
    const spies = ["log", "error", "info", "warn"].map((m) => jest.spyOn(console, m as any).mockImplementation(() => {}));
    const r = router({ search: () => res({}, 403) });
    let err: ApolloError | undefined;
    try { await provider(r.fetchImpl).enrichCompany(company, 6); }
    catch (error) { err = error as ApolloError; }
    expect(err).toBeInstanceOf(ApolloError);
    expect(err?.message).not.toContain(KEY);
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    for (const s of spies) s.mockRestore();
  });

  it("requires an API key", () => { expect(() => new ApolloEnrichmentProvider("", async () => res({}))).toThrow("APOLLO_API_KEY"); });

  it("declares least-privilege Apollo capabilities", () => {
    const caps = ApolloEnrichmentProvider.requiredCapabilities();
    expect(caps.peopleSearch).toBe("mixed_people_api_search");
    expect(caps.peopleEnrichment).toBe("people_match");
  });
});
