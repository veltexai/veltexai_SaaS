import { resolveContactFrom, type AssignmentRow } from "../src/contact-resolution";
import { ingestInstantlyEvent, type IngestDeps } from "../src/ingest";
import { InMemoryIngestRepository } from "../src/in-memory-repository";
import type { AllowlistCampaign } from "../src/allowlist";

const rows = (over: Partial<AssignmentRow>[] = []): AssignmentRow[] => over.map((o) => ({ contactId: "c1", campaignConfigId: "cfg", normalizedEmail: "dir@co.example", hasLeadMapping: false, ...o }));

describe("100D contact resolution (pure)", () => {
  it("matches via lead mapping (preferred) then assignment", () => {
    const r = resolveContactFrom("dir@co.example", "cfg", rows([{ hasLeadMapping: true }]));
    expect(r).toMatchObject({ status: "matched", contactId: "c1" });
  });
  it("matches via a plain campaign assignment", () => {
    const r = resolveContactFrom("dir@co.example", "cfg", rows([{ hasLeadMapping: false }]));
    expect(r.status).toBe("matched");
  });
  it("is unmatched when no assignment exists for the email in the campaign", () => {
    const r = resolveContactFrom("nobody@co.example", "cfg", rows([{}]));
    expect(r.status).toBe("unmatched");
  });
  it("is ambiguous when two contacts share the email in the campaign", () => {
    const r = resolveContactFrom("dir@co.example", "cfg", rows([{ contactId: "c1" }, { contactId: "c2" }]));
    expect(r.status).toBe("ambiguous");
    expect(r.contactId).toBeNull();
  });
  it("flags wrong_campaign when the email belongs to a different campaign", () => {
    const r = resolveContactFrom("dir@co.example", "cfg", rows([{ campaignConfigId: "other" }]));
    expect(r.status).toBe("wrong_campaign");
  });
  it("never partial-name matches and fails closed on no email", () => {
    expect(resolveContactFrom(null, "cfg", rows([{}])).status).toBe("unmatched");
  });
});

describe("100D resolution through the pipeline holds unknown contacts", () => {
  const WS = "698b2090-f4d5-484b-a0b1-44016fee7515";
  const CID = "c01e55de-f1c8-4a0c-9817-13fe7456ab66";
  const campaigns: AllowlistCampaign[] = [{ configId: "cfg", instantlyCampaignId: CID, expectedWorkspaceId: WS, approved: true, active: true }];
  const deps = (repo: InMemoryIngestRepository): IngestDeps => ({ campaigns, repository: repo, now: () => new Date("2026-08-10T00:00:00Z"), enabled: true, runId: "00000000-0000-4000-8000-000000000000" });
  it("records an unmatched event as held, not processed", async () => {
    const repo = new InMemoryIngestRepository([]); // no assignments
    const r = await ingestInstantlyEvent({ event_type: "email_opened", workspace: WS, campaign_id: CID, lead_email: "ghost@co.example", timestamp: "2026-08-10T00:01:00.000Z" }, deps(repo));
    expect(r.outcome).toBe("held_unmatched");
    expect(repo.unmatchedCount()).toBe(1);
  });
});
