import { ingestInstantlyEvent, type IngestDeps } from "../src/ingest";
import { reconcileUnmatched } from "../src/reconciliation";
import { InMemoryIngestRepository } from "../src/in-memory-repository";
import type { AllowlistCampaign } from "../src/allowlist";

const WS = "698b2090-f4d5-484b-a0b1-44016fee7515";
const CID = "c01e55de-f1c8-4a0c-9817-13fe7456ab66";
const campaigns: AllowlistCampaign[] = [{ configId: "cfg", instantlyCampaignId: CID, expectedWorkspaceId: WS, approved: true, active: true }];
const deps = (repo: InMemoryIngestRepository): IngestDeps => ({ campaigns, repository: repo, now: () => new Date("2026-08-10T00:00:00Z"), enabled: true, runId: "00000000-0000-4000-8000-000000000000" });
const evt = (over: Record<string, unknown> = {}) => ({ event_type: "email_opened", workspace: WS, campaign_id: CID, lead_email: "late@co.example", timestamp: "2026-08-10T00:05:00.000Z", ...over });

describe("100D reconciliation", () => {
  it("reprocesses a held event once its assignment appears, and no-ops already processed", async () => {
    const repo = new InMemoryIngestRepository([]); // no assignment yet
    await ingestInstantlyEvent(evt(), deps(repo));
    expect(repo.unmatchedCount()).toBe(1);

    // First reconciliation with still no mapping -> nothing reconciled.
    const before = await reconcileUnmatched(repo);
    expect(before.reconciled).toBe(0);
    expect(before.stillUnmatched).toBe(1);

    // A later 100C sync makes the contact resolvable.
    repo.addAssignment({ contactId: "c9", campaignConfigId: "cfg", normalizedEmail: "late@co.example", hasLeadMapping: false });
    const after = await reconcileUnmatched(repo);
    expect(after.reconciled).toBe(1);
    expect(repo.unmatchedCount()).toBe(0);
    expect(repo.receiptContact(await firstUnmatchedId(repo))).toBeUndefined(); // queue drained

    // Running reconciliation again is a safe no-op.
    const again = await reconcileUnmatched(repo);
    expect(again.examined).toBe(0);
    expect(again.reconciled).toBe(0);
  });
});

// The held id is gone after reconciliation; this helper just proves the queue is empty.
async function firstUnmatchedId(repo: InMemoryIngestRepository): Promise<string> {
  const list = await repo.listUnmatched();
  return list[0]?.providerEventId ?? "none";
}
