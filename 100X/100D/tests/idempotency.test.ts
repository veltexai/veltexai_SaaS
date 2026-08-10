import { ingestInstantlyEvent, type IngestDeps } from "../src/ingest";
import { InMemoryIngestRepository } from "../src/in-memory-repository";
import type { AllowlistCampaign } from "../src/allowlist";
import type { AssignmentRow } from "../src/contact-resolution";

const WS = "698b2090-f4d5-484b-a0b1-44016fee7515";
const CID = "c01e55de-f1c8-4a0c-9817-13fe7456ab66";
const campaigns: AllowlistCampaign[] = [{ configId: "cfg", instantlyCampaignId: CID, expectedWorkspaceId: WS, approved: true, active: true }];
const assignment: AssignmentRow = { contactId: "c1", campaignConfigId: "cfg", normalizedEmail: "dir@co.example", hasLeadMapping: true };
const evt = (over: Record<string, unknown> = {}) => ({ event_type: "email_sent", workspace: WS, campaign_id: CID, lead_email: "dir@co.example", timestamp: "2026-08-10T00:01:00.000Z", ...over });
const deps = (repo: InMemoryIngestRepository): IngestDeps => ({ campaigns, repository: repo, now: () => new Date("2026-08-10T00:00:00Z"), enabled: true, runId: "00000000-0000-4000-8000-000000000000" });

describe("100D idempotency", () => {
  it("an identical webhook replay is a no-op (duplicate)", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    const first = await ingestInstantlyEvent(evt(), deps(repo));
    const second = await ingestInstantlyEvent(evt(), deps(repo));
    expect(first.outcome).toBe("processed");
    expect(second.outcome).toBe("duplicate");
    expect(repo.receiptCount()).toBe(1);
  });
  it("a duplicate provider fingerprint collapses to one receipt", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    await ingestInstantlyEvent(evt(), deps(repo));
    await ingestInstantlyEvent(evt(), deps(repo));
    await ingestInstantlyEvent(evt(), deps(repo));
    expect(repo.receiptCount()).toBe(1);
  });
  it("a retry after a database timeout (same event re-sent) does not double-apply", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    const bounce = () => evt({ event_type: "email_bounced", timestamp: "2026-08-10T00:03:00.000Z" });
    const a = await ingestInstantlyEvent(bounce(), deps(repo));
    const b = await ingestInstantlyEvent(bounce(), deps(repo));
    expect(a.suppressionApplied).toBe(true);
    expect(b.suppressionApplied).toBe(false); // suppression not re-inserted on replay
    expect(repo.suppressionCount()).toBe(1);
    expect(repo.receiptCount()).toBe(1);
  });
  it("two distinct legitimate events produce two receipts", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    await ingestInstantlyEvent(evt({ event_type: "email_sent" }), deps(repo));
    await ingestInstantlyEvent(evt({ event_type: "email_opened", timestamp: "2026-08-10T00:02:00.000Z" }), deps(repo));
    expect(repo.receiptCount()).toBe(2);
  });
  it("concurrent duplicate delivery still yields exactly one receipt", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    const results = await Promise.all([ingestInstantlyEvent(evt(), deps(repo)), ingestInstantlyEvent(evt(), deps(repo))]);
    const processed = results.filter((r) => r.outcome === "processed").length;
    const duplicate = results.filter((r) => r.outcome === "duplicate").length;
    expect(processed).toBe(1);
    expect(duplicate).toBe(1);
    expect(repo.receiptCount()).toBe(1);
  });
});
