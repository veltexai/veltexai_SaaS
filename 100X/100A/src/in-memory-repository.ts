import { DuplicateSourceRecordError, WORKFLOW_ID, type CanonicalProspect, type IdentitySignals, type PersistObservationInput, type PersistObservationResult, type ProspectRepository, type ProviderSourceRecord } from "./types";

export class InMemoryProspectRepository implements ProspectRepository {
  readonly prospects: Array<CanonicalProspect & { id: string }> = [];
  readonly sourceRecords: Array<ProviderSourceRecord & { id: string }> = [];
  readonly writeLog: string[] = [];
  private cursor = 0;
  private lock: { runId: string; expiresAt: string } | null = null;
  constructor(private readonly now: () => Date = () => new Date()) {}

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
  async getCursor(): Promise<number> { return this.cursor; }
  async setCursor(workflow: typeof WORKFLOW_ID, runId: string, nextIndex: number): Promise<void> {
    if (workflow !== WORKFLOW_ID || this.lock?.runId !== runId) throw new Error("cursor update requires the run-owned lock");
    this.cursor = nextIndex; this.writeLog.push("cursor.set");
  }
  async inspectIdentity(candidate: { provider: "google_places"; providerRecordId: string; websiteDomain: string | null; normalizedPhone: string | null; companyName: string; city: string | null; state: string | null }): Promise<IdentitySignals> {
    const source = this.sourceRecords.find((item) => item.provider === candidate.provider && item.providerRecordId === candidate.providerRecordId);
    const normalizedName = candidate.companyName.trim().toLowerCase();
    return {
      sourceRecordId: source?.id, sourceProspectId: source?.prospectId,
      domainProspectIds: candidate.websiteDomain ? this.prospects.filter((item) => item.websiteDomain === candidate.websiteDomain).map(({ id }) => id) : [],
      phoneProspectIds: candidate.normalizedPhone ? this.prospects.filter((item) => item.normalizedPhone === candidate.normalizedPhone).map(({ id }) => id) : [],
      nameLocationProspectIds: candidate.city && candidate.state ? this.sourceRecords.filter((item) =>
        item.observedCompanyName.trim().toLowerCase() === normalizedName && item.city?.toLowerCase() === candidate.city?.toLowerCase() && item.state?.toLowerCase() === candidate.state?.toLowerCase(),
      ).map(({ prospectId }) => prospectId) : [],
    };
  }
  async touchSourceRecord(runId: string, sourceRecordId: string, observedAt: string): Promise<void> {
    if (this.lock?.runId !== runId) throw new Error("source touch requires the run-owned lock");
    const source = this.sourceRecords.find(({ id }) => id === sourceRecordId);
    if (!source) throw new Error("source record not found");
    source.lastObservedAt = observedAt; this.writeLog.push("source.touch");
  }
  async persistObservation(runId: string, input: PersistObservationInput): Promise<PersistObservationResult> {
    if (this.lock?.runId !== runId) throw new Error("observation persistence requires the run-owned lock");
    if (this.sourceRecords.some((item) => item.provider === input.source.provider && item.providerRecordId === input.source.providerRecordId)) throw new DuplicateSourceRecordError();
    let prospectId = input.matchedProspectId;
    let canonicalCreated = false;
    if (!prospectId) {
      prospectId = `prospect-${this.prospects.length + 1}`;
      this.prospects.push({ ...input.canonical, id: prospectId });
      canonicalCreated = true; this.writeLog.push("prospect.insert");
    }
    const sourceRecordId = `source-${this.sourceRecords.length + 1}`;
    this.sourceRecords.push({ ...input.source, id: sourceRecordId, prospectId });
    this.writeLog.push("source.insert");
    return { prospectId, sourceRecordId, canonicalCreated, sourceCreated: true };
  }
}
