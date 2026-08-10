import { normalizeCustomerStatus } from "../src/customer-status";
import { ingestCustomerStatus, type IngestDeps } from "../src/ingest";
import { InMemoryIngestRepository } from "../src/in-memory-repository";

const NOW = new Date("2026-08-10T00:00:00.000Z");
const deps = (repo: InMemoryIngestRepository): IngestDeps => ({ campaigns: [], repository: repo, now: () => NOW, enabled: true, runId: "00000000-0000-4000-8000-000000000000" });

describe("100D customer/trial status mapping", () => {
  it("maps trial_started and subscription_trialing to active_trial", () => {
    expect(normalizeCustomerStatus({ status: "trial_started", email: "a@co.example" }, NOW)).toMatchObject({ ok: true, kind: "active_trial" });
    expect(normalizeCustomerStatus({ status: "subscription_trialing", email: "a@co.example" }, NOW)).toMatchObject({ ok: true, kind: "active_trial" });
  });
  it("maps subscription_active and customer_confirmed to existing_customer", () => {
    expect(normalizeCustomerStatus({ status: "subscription_active", email: "a@co.example" }, NOW)).toMatchObject({ ok: true, kind: "existing_customer" });
    expect(normalizeCustomerStatus({ status: "customer_confirmed", email: "a@co.example" }, NOW)).toMatchObject({ ok: true, kind: "existing_customer" });
  });
  it("rejects an unknown status", () => {
    expect(normalizeCustomerStatus({ status: "subscription_paused", email: "a@co.example" }, NOW).ok).toBe(false);
  });
  it("rejects an invalid/missing email", () => {
    expect(normalizeCustomerStatus({ status: "subscription_active", email: "not-an-email" }, NOW).ok).toBe(false);
    expect(normalizeCustomerStatus({ status: "subscription_active", email: null }, NOW).ok).toBe(false);
  });
});

describe("100D customer/trial ingestion applies suppression idempotently", () => {
  it("applies an existing_customer suppression once (duplicate is a no-op)", async () => {
    const repo = new InMemoryIngestRepository([]);
    const a = await ingestCustomerStatus({ status: "subscription_active", email: "owner@co.example", occurredAt: "2026-08-09T12:00:00.000Z" }, deps(repo));
    const b = await ingestCustomerStatus({ status: "subscription_active", email: "owner@co.example", occurredAt: "2026-08-09T12:00:00.000Z" }, deps(repo));
    expect(a.outcome).toBe("processed");
    expect(b.outcome).toBe("duplicate");
    expect(repo.suppressionCount()).toBe(1);
  });
  it("holds an active trial as a suppression", async () => {
    const repo = new InMemoryIngestRepository([]);
    const r = await ingestCustomerStatus({ status: "trial_started", email: "trial@co.example" }, deps(repo));
    expect(r.outcome).toBe("processed");
    expect(r.kind).toBe("active_trial");
  });
  it("persists no billing data — only kind/email/source/reference reach the registry", async () => {
    const repo = new InMemoryIngestRepository([]);
    await ingestCustomerStatus({ status: "subscription_active", email: "owner@co.example", externalReference: "sub_123" }, deps(repo));
    // The in-memory registry key encodes only kind|match|email|source|occurredAt — no card/customer/amount.
    expect(repo.suppressionCount()).toBe(1);
    const diag = JSON.stringify(repo.diagnostics);
    expect(diag).not.toContain("card");
    expect(diag).not.toContain("payment");
  });
});
