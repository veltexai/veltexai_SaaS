import { DuplicateContactSourceError, WORKFLOW_ID } from "./types";
import type {
  CanonicalContact, CompanyContext, ContactIdentitySignals, ContactRepository,
  ContactSourceRecord, NormalizedContact, PersistContactInput, PersistContactResult,
} from "./types";

export class InMemoryContactRepository implements ContactRepository {
  readonly contacts: Array<CanonicalContact & { id: string }> = [];
  readonly contactSources: Array<ContactSourceRecord & { id: string }> = [];
  readonly writeLog: string[] = [];
  private cursor = 0;
  private lock: { runId: string; expiresAt: string } | null = null;
  constructor(private readonly companies: CompanyContext[] = [], private readonly now: () => Date = () => new Date()) {}

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
  async loadTargets(prospectIds: string[]): Promise<CompanyContext[]> {
    const byId = new Map(this.companies.map((c) => [c.prospectId, c]));
    return prospectIds.map((id) => byId.get(id)).filter((c): c is CompanyContext => Boolean(c));
  }
  async inspectContactIdentity(prospectId: string, contact: NormalizedContact): Promise<ContactIdentitySignals> {
    const source = this.contactSources.find((s) => s.provider === contact.provider && s.providerRecordId === contact.providerRecordId);
    const emailContactIds = contact.normalizedEmail
      ? this.contacts.filter((c) => c.prospectId === prospectId && c.normalizedEmail === contact.normalizedEmail).map(({ id }) => id)
      : [];
    return { sourceRecordId: source?.id, sourceContactId: source?.contactId, emailContactIds };
  }
  async touchContactSource(runId: string, sourceRecordId: string, observedAt: string): Promise<void> {
    if (this.lock?.runId !== runId) throw new Error("source touch requires the run-owned lock");
    const source = this.contactSources.find(({ id }) => id === sourceRecordId);
    if (!source) throw new Error("contact source not found");
    source.lastObservedAt = observedAt; this.writeLog.push("source.touch");
  }
  async persistContact(runId: string, input: PersistContactInput): Promise<PersistContactResult> {
    if (this.lock?.runId !== runId) throw new Error("contact persistence requires the run-owned lock");
    if (this.contactSources.some((s) => s.provider === input.source.provider && s.providerRecordId === input.source.providerRecordId)) throw new DuplicateContactSourceError();
    let contactId = input.matchedContactId;
    let contactCreated = false;
    if (!contactId) {
      contactId = `contact-${this.contacts.length + 1}`;
      this.contacts.push({ ...input.canonical, id: contactId });
      contactCreated = true; this.writeLog.push("contact.insert");
    }
    const sourceRecordId = `contact-source-${this.contactSources.length + 1}`;
    this.contactSources.push({ ...input.source, id: sourceRecordId, contactId });
    this.writeLog.push("source.insert");
    return { contactId, sourceRecordId, contactCreated, sourceCreated: true };
  }
}
