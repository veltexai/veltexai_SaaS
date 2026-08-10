import { verifySharedSecret, SECRET_HEADER } from "../src/auth";
import { load100DConfig } from "../src/config";
import { ingestCustomerStatus, ingestInstantlyEvent, type IngestDeps } from "../src/ingest";
import { reconcileUnmatched } from "../src/reconciliation";
import { InMemoryIngestRepository } from "../src/in-memory-repository";
import type { AssignmentRow } from "../src/contact-resolution";
import type { AllowlistCampaign } from "../src/allowlist";
import type { CustomerStatusPayload, InstantlyWebhookPayload } from "../src/types";

export interface FixtureFile {
  assignments: AssignmentRow[];
  instantlyEvents: InstantlyWebhookPayload[];
  customerStatusEvents?: CustomerStatusPayload[];
  lateAssignments?: AssignmentRow[]; // become available for reconciliation-preview
}

export interface OperatorOutput { info: (record: Record<string, unknown>) => void }

// Deterministic clock for offline previews (no Date.now in the operator path).
const fixedClock = () => new Date("2026-08-10T00:00:00.000Z");
const RUN_ID = "00000000-0000-4000-8000-000000000000";

export async function executeOperator(
  args: string[], env: Record<string, string | undefined>,
  campaigns: AllowlistCampaign[], loadFixture: () => FixtureFile, output: OperatorOutput,
): Promise<void> {
  const mode = requireMode(args);
  const config = load100DConfig(env);

  if (mode === "dry-run") {
    // Validate config + allowlist only. Construct no repository, make no call, write nothing.
    const approved = campaigns.filter((c) => c.approved && c.active && c.instantlyCampaignId && c.expectedWorkspaceId);
    output.info({ mode, outcome: "validated-no-call", enabled: config.enabled, webhookSecretPresent: config.webhookSecretPresent, approvedCampaigns: approved.length, secretHeader: SECRET_HEADER, externalClientsConstructed: 0, databaseWrites: 0 });
    return;
  }

  const fixture = loadFixture();
  const repo = new InMemoryIngestRepository([...fixture.assignments]);
  const deps: IngestDeps = { campaigns, repository: repo, now: fixedClock, enabled: true, runId: RUN_ID };

  if (mode === "fixture-preview") {
    const events = [];
    for (const p of fixture.instantlyEvents) events.push(await ingestInstantlyEvent(p, deps));
    const customer = [];
    for (const c of fixture.customerStatusEvents ?? []) customer.push(await ingestCustomerStatus(c, deps));
    output.info({ mode, outcome: "offline-preview", instantly: summarize(events), customerStatus: customer.map((c) => ({ outcome: c.outcome, kind: c.kind })), suppressions: repo.suppressionCount(), receipts: repo.receiptCount(), unmatched: repo.unmatchedCount() });
    return;
  }

  if (mode === "local-route-test") {
    // Exercise auth + pipeline against synthetic request-like inputs. No server, no network.
    const expected = env.VELTEX_100D_WEBHOOK_SECRET;
    const authCases = [
      { name: "missing-secret", provided: undefined },
      { name: "blank-secret", provided: "   " },
      { name: "wrong-secret", provided: "definitely-not-the-secret-value" },
      { name: "correct-secret", provided: expected },
    ].map((c) => ({ case: c.name, auth: verifySharedSecret(c.provided, expected).ok }));
    const first = fixture.instantlyEvents[0];
    const valid = first ? await ingestInstantlyEvent(first, deps) : null;
    const wrongWorkspace = first ? await ingestInstantlyEvent({ ...first, workspace: "00000000-0000-4000-8000-000000000999" }, deps) : null;
    output.info({ mode, outcome: "offline-route-simulation", header: SECRET_HEADER, auth: authCases, validEvent: valid?.outcome ?? null, wrongWorkspace: wrongWorkspace?.outcome ?? null });
    return;
  }

  // reconciliation-preview: ingest events (some unmatched), then make late assignments available and reconcile.
  for (const p of fixture.instantlyEvents) await ingestInstantlyEvent(p, deps);
  const beforeUnmatched = repo.unmatchedCount();
  for (const a of fixture.lateAssignments ?? []) repo.addAssignment(a);
  const report = await reconcileUnmatched(repo);
  output.info({ mode, outcome: "offline-reconciliation", unmatchedBefore: beforeUnmatched, examined: report.examined, reconciled: report.reconciled, stillUnmatched: report.stillUnmatched, stillAmbiguous: report.stillAmbiguous });
}

function requireMode(args: string[]): "dry-run" | "fixture-preview" | "local-route-test" | "reconciliation-preview" {
  const m = /^--mode=(.*)$/.exec(args.find((a) => a.startsWith("--mode=")) ?? "");
  const mode = m?.[1];
  if (mode !== "dry-run" && mode !== "fixture-preview" && mode !== "local-route-test" && mode !== "reconciliation-preview") {
    throw new Error("--mode must be one of: dry-run, fixture-preview, local-route-test, reconciliation-preview");
  }
  return mode;
}

function summarize(results: Array<{ outcome: string; suppressionApplied: boolean }>): Record<string, number> {
  const acc: Record<string, number> = { processed: 0, duplicate: 0, held_unmatched: 0, rejected_allowlist: 0, rejected_invalid: 0, suppressionsApplied: 0 };
  for (const r of results) { acc[r.outcome] = (acc[r.outcome] ?? 0) + 1; if (r.suppressionApplied) acc.suppressionsApplied += 1; }
  return acc;
}
