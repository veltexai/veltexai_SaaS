import { processReply } from "../src/process-reply";
import type { ClassifiedReply, ReplyRepository } from "../src/types";

class MemoryReplyRepository implements ReplyRepository {
  rows = new Map<string, ClassifiedReply>();
  async applyClassification(reply: ClassifiedReply) {
    const inserted = !this.rows.has(reply.providerEventId);
    if (inserted) this.rows.set(reply.providerEventId, reply);
    return { inserted, suppressionInserted: inserted && reply.suppressionKind !== null };
  }
}

const deps = (repository: ReplyRepository) => ({ enabled: true, maxReplyChars: 32_000, campaignConfigId: "pilot", providerEventId: "evt-1", repository, now: () => new Date("2026-08-11T00:00:00Z") });

describe("100E reply processing", () => {
  it("processes once and makes replay a no-op", async () => {
    const repository = new MemoryReplyRepository();
    const payload = { event_type: "reply_received", lead_email: "OWNER@Example.com", reply_text: "Please unsubscribe me", timestamp: "2026-08-10T23:00:00Z" };
    expect(await processReply(payload, deps(repository))).toMatchObject({ outcome: "processed", classification: "unsubscribe" });
    expect(await processReply(payload, deps(repository))).toMatchObject({ outcome: "duplicate" });
    const row = repository.rows.get("evt-1")!;
    expect(row.normalizedEmail).toBe("owner@example.com");
    expect(row).not.toHaveProperty("replyText");
  });

  it("ignores non-reply events", async () => {
    expect(await processReply({ event_type: "email_opened" }, deps(new MemoryReplyRepository()))).toMatchObject({ outcome: "ignored" });
  });

  it("fails closed on missing or oversized content", async () => {
    expect(await processReply({ event_type: "reply_received", lead_email: "a@b.co" }, deps(new MemoryReplyRepository()))).toMatchObject({ outcome: "rejected_invalid" });
    expect(await processReply({ event_type: "reply_received", lead_email: "a@b.co", reply_text: "x".repeat(32_001) }, deps(new MemoryReplyRepository()))).toMatchObject({ outcome: "rejected_invalid" });
  });
});
