import type { IngestRepository } from "./types";

// Provider-neutral reconciliation (Part 13). Re-examines held unmatched events and links any whose
// contact now resolves (e.g. after a later 100C sync). It NEVER resends email, creates an Instantly
// lead, or modifies a campaign — it only completes internal linkage and reports. Already-processed
// events are safe no-ops.

export interface ReconciliationReport {
  examined: number;
  reconciled: number;
  stillUnmatched: number;
  stillAmbiguous: number;
  details: Array<{ providerEventId: string; status: string; reason: string }>;
}

export async function reconcileUnmatched(repo: IngestRepository): Promise<ReconciliationReport> {
  const held = await repo.listUnmatched();
  const report: ReconciliationReport = { examined: held.length, reconciled: 0, stillUnmatched: 0, stillAmbiguous: 0, details: [] };
  for (const { providerEventId, event } of held) {
    const res = await repo.resolveContact(event.normalizedEmail, event.campaignConfigId);
    if (res.status === "matched" && res.contactId) {
      const r = await repo.markReconciled(providerEventId, res.contactId);
      if (r.reconciled) report.reconciled += 1;
      report.details.push({ providerEventId, status: "reconciled", reason: res.reason });
    } else if (res.status === "ambiguous") {
      report.stillAmbiguous += 1;
      report.details.push({ providerEventId, status: "ambiguous", reason: res.reason });
    } else {
      report.stillUnmatched += 1;
      report.details.push({ providerEventId, status: res.status, reason: res.reason });
    }
  }
  return report;
}
