import { InstantlyOutboundProvider, InstantlyError } from "../src/instantly-provider";
import { INSTANTLY_BASE_URL, INSTANTLY_ENDPOINTS, mapCampaignStatus } from "../src/instantly-config";
import type { OutboundLead } from "../src/types";

const KEY = "instantly-secret-key-999";
const CID = "22222222-2222-4222-8222-222222222222";
const res = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
const lead: OutboundLead = { campaignConfigId: "cfg1", workEmail: "dir@biz.example.com", firstName: "Dana", lastName: "Director", companyName: "Biz", website: "https://biz.example.com", jobTitle: "Director of Operations", personalization: null, attribution: { canonicalContactId: "c1", campaignConfigId: "cfg1" } };

function router(handlers: { campaign?: (url: string) => Response | Promise<Response>; create?: (body: any) => Response | Promise<Response>; list?: (body: any) => Response | Promise<Response> }) {
  const createBodies: any[] = []; const urls: string[] = [];
  const fetchImpl = jest.fn(async (url: any, init: any) => {
    urls.push(url);
    const body = init.body ? JSON.parse(init.body) : undefined;
    if (typeof url === "string" && url.includes("/campaigns/")) return handlers.campaign ? handlers.campaign(url) : res({ id: CID, status: 0 });
    if (url === INSTANTLY_ENDPOINTS.createLead) { createBodies.push(body); return handlers.create ? handlers.create(body) : res({ id: "lead-1" }); }
    if (url === INSTANTLY_ENDPOINTS.listLeads) return handlers.list ? handlers.list(body) : res({ items: [] });
    throw new Error("unexpected url " + url);
  });
  return { fetchImpl, createBodies, urls };
}
const provider = (fetchImpl: any, opts: Record<string, unknown> = {}) => new InstantlyOutboundProvider(KEY, fetchImpl, { sleep: async () => {}, ...opts });

describe("Instantly V2 adapter — endpoints, payload, mapping", () => {
  it("uses only V2 endpoints (no V1) with Bearer auth", async () => {
    const r = router({});
    await provider(r.fetchImpl).getCampaignState(CID, 4);
    expect(INSTANTLY_BASE_URL).toBe("https://api.instantly.ai/api/v2");
    expect(r.urls[0]).toBe(`${INSTANTLY_BASE_URL}/campaigns/${CID}`);
    expect(r.urls.every((u) => u.includes("/api/v2/"))).toBe(true);
    expect(r.fetchImpl.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${KEY}`);
  });
  it("maps numeric campaign status to normalized state", () => {
    expect(mapCampaignStatus(0)).toBe("draft"); expect(mapCampaignStatus(1)).toBe("active"); expect(mapCampaignStatus(2)).toBe("paused");
    expect(mapCampaignStatus(3)).toBe("completed"); expect(mapCampaignStatus(-99)).toBe("account_suspended"); expect(mapCampaignStatus(42)).toBe("unknown");
  });
  it("creates a lead with explicit duplicate-skip flags, verification off, and no phone/metadata", async () => {
    const r = router({ create: () => res({ id: "lead-77" }) });
    const out = await provider(r.fetchImpl).createLead(CID, lead, 4);
    const body = r.createBodies[0];
    expect(r.urls.includes(INSTANTLY_ENDPOINTS.createLead)).toBe(true);
    expect(body.campaign).toBe(CID);
    expect(body.email).toBe("dir@biz.example.com");
    expect(body.skip_if_in_workspace).toBe(true);
    expect(body.skip_if_in_campaign).toBe(true);
    expect(body.skip_if_in_list).toBe(true);
    expect(body.verify_leads_on_import).toBe(false);
    expect(body).not.toHaveProperty("phone");
    expect(body.custom_variables).toEqual({ veltex_contact_id: "c1", veltex_campaign_config_id: "cfg1" });
    expect(out).toMatchObject({ disposition: "submitted", providerLeadId: "lead-77" });
  });
  it("treats a provider skip response as skipped_duplicate", async () => {
    const r = router({ create: () => res({ skipped: true }) });
    expect((await provider(r.fetchImpl).createLead(CID, lead, 4)).disposition).toBe("skipped_duplicate");
  });
  it("reconciles read-only via leads/list", async () => {
    const r = router({ list: () => res({ items: [{ id: "lead-9", email: "dir@biz.example.com" }] }) });
    const out = await provider(r.fetchImpl).reconcileLead(CID, "dir@biz.example.com", 4);
    expect(out).toMatchObject({ existsInCampaign: true, providerLeadId: "lead-9" });
    expect(r.urls.includes(INSTANTLY_ENDPOINTS.listLeads)).toBe(true);
  });
});

describe("Instantly V2 adapter — error classification & ambiguity", () => {
  it.each([[401, "auth"], [403, "scope"], [402, "payment"], [404, "campaign_not_found"]])("campaign read HTTP %s -> %s (no retry)", async (status, kind) => {
    const r = router({ campaign: () => res({}, status) });
    await expect(provider(r.fetchImpl).getCampaignState(CID, 4)).rejects.toMatchObject({ kind });
  });
  it.each([[422, "invalid_lead"], [409, "duplicate"]])("create HTTP %s -> %s (terminal)", async (status, kind) => {
    const r = router({ create: () => res({}, status) });
    await expect(provider(r.fetchImpl).createLead(CID, lead, 4)).rejects.toMatchObject({ kind });
  });
  it("retries a rate-limited read and honors Retry-After", async () => {
    const r = router({ campaign: () => res({}, 429, { "retry-after": "1" }) });
    await expect(provider(r.fetchImpl, { maxAttemptsPerRequest: 3 }).getCampaignState(CID, 5)).rejects.toMatchObject({ kind: "rate_limit" });
    expect(r.fetchImpl).toHaveBeenCalledTimes(3);
  });
  it("treats a create timeout as AMBIGUOUS and never retries it", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const fetchImpl = jest.fn(async (url: any) => { if (String(url).includes("/leads")) throw abort; return res({ id: CID, status: 0 }); });
    await expect(provider(fetchImpl, { maxAttemptsPerRequest: 3, timeoutMs: 1 }).createLead(CID, lead, 4)).rejects.toMatchObject({ kind: "ambiguous" });
    expect(fetchImpl).toHaveBeenCalledTimes(1); // no blind retry
  });
  it("treats a create 5xx as AMBIGUOUS (server may have accepted)", async () => {
    const r = router({ create: () => res({}, 503) });
    await expect(provider(r.fetchImpl).createLead(CID, lead, 4)).rejects.toMatchObject({ kind: "ambiguous" });
  });
  it("rejects a malformed campaign response", async () => {
    const r = router({ campaign: () => res({ no_status: true }) });
    await expect(provider(r.fetchImpl).getCampaignState(CID, 4)).rejects.toMatchObject({ kind: "malformed" });
  });
  it("counts physical retries against the budget and stops at request_cap", async () => {
    const r = router({ campaign: () => res({}, 503) });
    await expect(provider(r.fetchImpl, { maxAttemptsPerRequest: 5 }).getCampaignState(CID, 2)).rejects.toBeInstanceOf(InstantlyError);
    expect(r.fetchImpl).toHaveBeenCalledTimes(2); // budget 2 exhausted before 5 attempts
  });
});

describe("Instantly V2 adapter — secrets, scopes", () => {
  it("keeps the API key out of thrown errors and never logs", async () => {
    const spies = ["log", "error", "info", "warn"].map((m) => jest.spyOn(console, m as any).mockImplementation(() => {}));
    const r = router({ campaign: () => res({}, 403) });
    const err = await provider(r.fetchImpl).getCampaignState(CID, 4).catch((e) => e as InstantlyError);
    expect(err.message).not.toContain(KEY);
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    for (const s of spies) s.mockRestore();
  });
  it("requires an API key and declares least-privilege V2 scopes", () => {
    expect(() => new InstantlyOutboundProvider("", async () => res({}))).toThrow("INSTANTLY_API_KEY");
    const scopes = InstantlyOutboundProvider.requiredScopes();
    expect(scopes.campaignsRead).toBe("campaigns:read");
    expect(scopes.leadsCreate).toBe("leads:create");
    expect(scopes.leadsRead).toBe("leads:read");
  });
  it("accounts campaign reads, lead writes, reconcile reads, and ambiguity separately", async () => {
    const r = router({ create: () => res({ id: "L1" }) });
    const p = provider(r.fetchImpl);
    await p.getCampaignState(CID, 4); await p.createLead(CID, lead, 4); await p.reconcileLead(CID, lead.workEmail, 4);
    expect(p.getAccounting()).toMatchObject({ campaignReads: 1, leadWrites: 1, reconcileReads: 1 });
  });
});
