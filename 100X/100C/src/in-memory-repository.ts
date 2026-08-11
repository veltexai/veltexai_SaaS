import { WORKFLOW_ID } from "./types";
import type {
  AssignmentRecord, ReserveResult, SubmissionState, SuppressionEvent, SuppressionRegistryEntry,
  SyncCandidate, SyncRepository,
} from "./types";

// An in-memory suppression-registry row: the durable entry plus the value it matches on.
export interface InMemorySuppressionRow { normalizedEmail?: string | null; normalizedDomain?: string | null; entry: SuppressionRegistryEntry }

// Offline sync store for fixture-preview and tests. Enforces the same invariants as the SQL model:
// a run-owned lock gates mutations, and (contact_id, campaign_config_id) is unique (idempotency).
export class InMemorySyncRepository implements SyncRepository {
  readonly assignments: AssignmentRecord[] = [];
  readonly attempts: Array<{ assignmentId: string; outcome: string; errorCategory: string | null; at: string }> = [];
  readonly leadMappings: Array<{ assignmentId: string; providerLeadId: string }> = [];
  readonly writeLog: string[] = [];
  private lock: { runId: string; expiresAt: string } | null = null;

  constructor(
    private readonly candidates: SyncCandidate[] = [],
    private readonly suppression: Record<string, SuppressionEvent[]> = {},
    private readonly now: () => Date = () => new Date(),
    private readonly registryRows: InMemorySuppressionRow[] = [],
  ) {}

  async acquireLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    if (workflow !== WORKFLOW_ID) return false;
    if (this.lock && new Date(this.lock.expiresAt).getTime() > this.now().getTime()) return false;
    this.lock = { runId, expiresAt }; this.writeLog.push("lock.acquire"); return true;
  }
  async renewLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    if (workflow !== WORKFLOW_ID || this.lock?.runId !== runId || new Date(this.lock.expiresAt).getTime() <= this.now().getTime()) return false;
    this.lock.expiresAt = expiresAt; this.writeLog.push("lock.renew"); return true;
  }
  async releaseLock(workflow: typeof WORKFLOW_ID, runId: string): Promise<void> {
    if (workflow === WORKFLOW_ID && this.lock?.runId === runId) { this.lock = null; this.writeLog.push("lock.release"); }
  }
  async loadCandidates(_campaignConfigId: string, limit: number): Promise<SyncCandidate[]> {
    return this.candidates.slice(0, limit);
  }
  async loadSuppressionEvents(contactId: string): Promise<SuppressionEvent[]> {
    return this.suppression[contactId] ?? [];
  }
  async loadSuppressionRegistry(normalizedEmail: string | null, normalizedDomain: string | null): Promise<SuppressionRegistryEntry[]> {
    const email = normalizedEmail?.toLowerCase() ?? null;
    const domain = normalizedDomain?.toLowerCase() ?? null;
    return this.registryRows
      .filter((r) => (r.entry.matchedBy === "email" && email !== null && (r.normalizedEmail ?? "").toLowerCase() === email)
        || (r.entry.matchedBy === "domain" && domain !== null && (r.normalizedDomain ?? "").toLowerCase() === domain))
      .map((r) => r.entry);
  }
  async findAssignment(contactId: string, campaignConfigId: string): Promise<AssignmentRecord | null> {
    return this.assignments.find((a) => a.contactId === contactId && a.campaignConfigId === campaignConfigId) ?? null;
  }
  async reserveAssignment(runId: string, contactId: string, campaignConfigId: string): Promise<ReserveResult> {
    if (this.lock?.runId !== runId) throw new Error("reservation requires the run-owned lock");
    const existing = this.assignments.find((a) => a.contactId === contactId && a.campaignConfigId === campaignConfigId);
    if (existing) return { assignmentId: existing.id, reserved: false, existingState: existing.state };
    const id = `assignment-${this.assignments.length + 1}`;
    this.assignments.push({ id, contactId, campaignConfigId, state: "reserved", providerLeadId: null, reason: null, updatedAt: this.now().toISOString() });
    this.writeLog.push("assignment.reserve");
    return { assignmentId: id, reserved: true, existingState: null };
  }
  async transitionAssignment(runId: string, assignmentId: string, state: SubmissionState, reason: string | null, providerLeadId: string | null = null): Promise<void> {
    if (this.lock?.runId !== runId) throw new Error("transition requires the run-owned lock");
    const a = this.assignments.find((x) => x.id === assignmentId);
    if (!a) throw new Error("assignment not found");
    a.state = state; a.reason = reason; if (providerLeadId) a.providerLeadId = providerLeadId; a.updatedAt = this.now().toISOString();
    this.writeLog.push(`assignment.${state}`);
  }
  async recordAttempt(runId: string, assignmentId: string, outcome: string, errorCategory: string | null): Promise<void> {
    if (this.lock?.runId !== runId) throw new Error("attempt logging requires the run-owned lock");
    this.attempts.push({ assignmentId, outcome, errorCategory, at: this.now().toISOString() }); this.writeLog.push("attempt.record");
  }
  async recordLeadMapping(runId: string, assignmentId: string, providerLeadId: string): Promise<void> {
    if (this.lock?.runId !== runId) throw new Error("lead mapping requires the run-owned lock");
    this.leadMappings.push({ assignmentId, providerLeadId }); this.writeLog.push("lead.map");
  }
}
