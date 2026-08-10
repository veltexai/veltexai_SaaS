import { resolveContactFrom, type AssignmentRow } from "./contact-resolution";
import type {
  ApplyEventResult, ContactResolution, DiagnosticEvent, IngestRepository, NormalizedOutboundEvent, SuppressionKind,
} from "./types";

// Deterministic, offline repository backing every 100D test and the fixture-preview operator mode.
// It mirrors the migration-004 atomic semantics: idempotent receipts (unique providerEventId),
// append-only idempotent suppression (dedupe key), unmatched hold, and processing outcomes. No external
// calls, no clock of its own beyond what callers pass into events.

interface ReceiptRow { providerEventId: string; contactId: string | null; eventType: string; suppresses: boolean; occurredAt: string }
interface ProcessingRow { providerEventId: string; outcome: string; resolution: string; contactId: string | null }

const suppressionKey = (kind: string, email: string, source: string, occurredAt: string) =>
  `${kind}|email|${email.toLowerCase()}||${source}|${occurredAt}`;

export class InMemoryIngestRepository implements IngestRepository {
  private receipts = new Map<string, ReceiptRow>();
  private suppressions = new Set<string>();
  private unmatched = new Map<string, NormalizedOutboundEvent>();
  readonly processing: ProcessingRow[] = [];
  readonly diagnostics: DiagnosticEvent[] = [];

  constructor(private assignments: AssignmentRow[] = []) {}

  // Test/reconciliation helper: make a contact linkable after the fact (simulates a late 100C sync).
  addAssignment(row: AssignmentRow): void { this.assignments.push(row); }

  async resolveContact(normalizedEmail: string | null, campaignConfigId: string | null): Promise<ContactResolution> {
    return resolveContactFrom(normalizedEmail, campaignConfigId, this.assignments);
  }

  async applyEvent(event: NormalizedOutboundEvent): Promise<ApplyEventResult> {
    const res = resolveContactFrom(event.normalizedEmail, event.campaignConfigId, this.assignments);
    const matched = res.status === "matched";
    let inserted = false;
    if (!this.receipts.has(event.providerEventId)) {
      this.receipts.set(event.providerEventId, { providerEventId: event.providerEventId, contactId: res.contactId, eventType: event.rawEventType, suppresses: event.suppresses, occurredAt: event.occurredAt });
      inserted = true;
    }
    let suppressionInserted = false;
    if (event.suppresses && event.normalizedEmail && event.suppressionKind) {
      const key = suppressionKey(event.suppressionKind, event.normalizedEmail, "100d_instantly", event.occurredAt);
      if (!this.suppressions.has(key)) { this.suppressions.add(key); suppressionInserted = true; }
    }
    if (inserted) {
      this.processing.push({ providerEventId: event.providerEventId, outcome: matched ? "processed" : "held_unmatched", resolution: res.status, contactId: res.contactId });
      if (!matched) this.unmatched.set(event.providerEventId, event);
    }
    return { inserted, suppressionInserted, matched, resolution: res.status };
  }

  async applyCustomerStatus(kind: SuppressionKind, normalizedEmail: string, source: string, _externalReference: string | null, occurredAt: string): Promise<{ inserted: boolean }> {
    const key = suppressionKey(kind, normalizedEmail, source, occurredAt);
    if (this.suppressions.has(key)) return { inserted: false };
    this.suppressions.add(key);
    return { inserted: true };
  }

  async listUnmatched(): Promise<Array<{ providerEventId: string; event: NormalizedOutboundEvent }>> {
    return [...this.unmatched.entries()].map(([providerEventId, event]) => ({ providerEventId, event }));
  }

  async markReconciled(providerEventId: string, contactId: string): Promise<{ reconciled: boolean }> {
    if (!this.unmatched.has(providerEventId)) return { reconciled: false };
    this.unmatched.delete(providerEventId);
    const receipt = this.receipts.get(providerEventId);
    if (receipt) receipt.contactId = contactId;
    this.processing.push({ providerEventId, outcome: "reconciled", resolution: "matched", contactId });
    return { reconciled: true };
  }

  async emitDiagnostic(event: DiagnosticEvent): Promise<void> { this.diagnostics.push(event); }

  // Read-only test assertions.
  suppressionCount(): number { return this.suppressions.size; }
  receiptCount(): number { return this.receipts.size; }
  unmatchedCount(): number { return this.unmatched.size; }
  hasSuppression(kind: string, email: string, source: string, occurredAt: string): boolean { return this.suppressions.has(suppressionKey(kind, email, source, occurredAt)); }
  receiptContact(providerEventId: string): string | null | undefined { return this.receipts.get(providerEventId)?.contactId; }
}
