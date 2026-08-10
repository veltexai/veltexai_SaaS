import { ingestInstantlyEvent, type IngestDeps } from "../src/ingest";
import { InMemoryIngestRepository } from "../src/in-memory-repository";
import type { AllowlistCampaign } from "../src/allowlist";
import type { AssignmentRow } from "../src/contact-resolution";

const WS = "698b2090-f4d5-484b-a0b1-44016fee7515";
const CID = "c01e55de-f1c8-4a0c-9817-13fe7456ab66";
const campaigns: AllowlistCampaign[] = [{ configId: "cfg", instantlyCampaignId: CID, expectedWorkspaceId: WS, approved: true, active: true }];
const assignment: AssignmentRow = { contactId: "c1", campaignConfigId: "cfg", normalizedEmail: "dir@co.example", hasLeadMapping: true };
const deps = (repo: InMemoryIngestRepository): IngestDeps => ({ campaigns, repository: repo, now: () => new Date("2026-08-10T00:00:00Z"), enabled: true, runId: "00000000-0000-4000-8000-000000000000" });
const evt = (event_type: string, over: Record<string, unknown> = {}) => ({ event_type, workspace: WS, campaign_id: CID, lead_email: "dir@co.example", timestamp: "2026-08-10T00:03:00.000Z", ...over });

describe("100D automatic suppression", () => {
  it("a hard bounce creates a hard_bounce suppression", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    const r = await ingestInstantlyEvent(evt("email_bounced"), deps(repo));
    expect(r.suppressionApplied).toBe(true);
    expect(repo.hasSuppression("hard_bounce", "dir@co.example", "100d_instantly", "2026-08-10T00:03:00.000Z")).toBe(true);
  });
  it("an unsubscribe creates an unsubscribed suppression", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    const r = await ingestInstantlyEvent(evt("lead_unsubscribed"), deps(repo));
    expect(r.suppressionApplied).toBe(true);
    expect(repo.suppressionCount()).toBe(1);
  });
  it("a spam complaint and do_not_contact suppress", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    await ingestInstantlyEvent(evt("spam_complaint"), deps(repo));
    await ingestInstantlyEvent(evt("do_not_contact", { timestamp: "2026-08-10T00:04:00.000Z" }), deps(repo));
    expect(repo.suppressionCount()).toBe(2);
  });
  it("an open does NOT suppress", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    const r = await ingestInstantlyEvent(evt("email_opened"), deps(repo));
    expect(r.suppressionApplied).toBe(false);
    expect(repo.suppressionCount()).toBe(0);
  });
  it("a click does NOT suppress", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    await ingestInstantlyEvent(evt("email_link_clicked"), deps(repo));
    expect(repo.suppressionCount()).toBe(0);
  });
  it("a reply does NOT remove an existing suppression", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    await ingestInstantlyEvent(evt("email_bounced"), deps(repo));
    await ingestInstantlyEvent(evt("reply_received", { timestamp: "2026-08-10T00:05:00.000Z" }), deps(repo));
    expect(repo.suppressionCount()).toBe(1); // reply added no suppression and removed none
  });
  it("a contact-level unsubscribe never suppresses the whole domain (email match only)", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    await ingestInstantlyEvent(evt("lead_unsubscribed"), deps(repo));
    // Suppression is email-keyed; a different address on the same domain is not suppressed.
    expect(repo.hasSuppression("unsubscribed", "dir@co.example", "100d_instantly", "2026-08-10T00:03:00.000Z")).toBe(true);
    expect(repo.hasSuppression("unsubscribed", "someone-else@co.example", "100d_instantly", "2026-08-10T00:03:00.000Z")).toBe(false);
  });
  it("a replayed suppression is a no-op (idempotent)", async () => {
    const repo = new InMemoryIngestRepository([assignment]);
    await ingestInstantlyEvent(evt("email_bounced"), deps(repo));
    const again = await ingestInstantlyEvent(evt("email_bounced"), deps(repo));
    expect(again.suppressionApplied).toBe(false);
    expect(repo.suppressionCount()).toBe(1);
  });
  it("suppresses an unmatched bounce by email while holding the event for reconciliation", async () => {
    const repo = new InMemoryIngestRepository([]); // no assignment -> unmatched
    const r = await ingestInstantlyEvent(evt("email_bounced", { lead_email: "ghost@co.example" }), deps(repo));
    expect(r.outcome).toBe("held_unmatched");
    expect(r.suppressionApplied).toBe(true); // suppression is email-keyed, applied even without a contact
    expect(repo.unmatchedCount()).toBe(1);
  });
});
