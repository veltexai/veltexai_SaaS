import type { CompanyContext, SuppressionResolver, SuppressionSignals } from "./types";

const EMPTY: SuppressionSignals = {
  unsubscribed: false, hardBounced: false, blocked: false,
  activeInCampaign: false, alreadyReceivedCampaign: false, emailGloballySuppressed: false,
};

// Default resolver: no suppression data (e.g., a fresh pilot DB). Fails OPEN only on
// suppression (returns "no known suppression"); the eligibility evaluator still requires
// positive verification before a contact is outreach-ready.
export class NullSuppressionResolver implements SuppressionResolver {
  async resolve(): Promise<SuppressionSignals> { return { ...EMPTY }; }
}

export interface SuppressionSeed {
  unsubscribed?: string[]; hardBounced?: string[]; blocked?: string[];
  globallySuppressed?: string[]; activeInCampaign?: string[]; alreadyReceivedCampaign?: string[];
}
// In-memory resolver seeded from known suppression lists (used by fixtures/tests and as the
// shape a future production suppression service will satisfy). Emails compared case-insensitively.
export class InMemorySuppressionResolver implements SuppressionResolver {
  private readonly sets: Record<keyof SuppressionSeed, Set<string>>;
  constructor(seed: SuppressionSeed = {}) {
    const norm = (xs?: string[]) => new Set((xs ?? []).map((e) => e.trim().toLowerCase()));
    this.sets = {
      unsubscribed: norm(seed.unsubscribed), hardBounced: norm(seed.hardBounced), blocked: norm(seed.blocked),
      globallySuppressed: norm(seed.globallySuppressed), activeInCampaign: norm(seed.activeInCampaign),
      alreadyReceivedCampaign: norm(seed.alreadyReceivedCampaign),
    };
  }
  async resolve(_company: CompanyContext, normalizedEmail: string | null): Promise<SuppressionSignals> {
    if (!normalizedEmail) return { ...EMPTY };
    const e = normalizedEmail.toLowerCase();
    return {
      unsubscribed: this.sets.unsubscribed.has(e), hardBounced: this.sets.hardBounced.has(e), blocked: this.sets.blocked.has(e),
      activeInCampaign: this.sets.activeInCampaign.has(e), alreadyReceivedCampaign: this.sets.alreadyReceivedCampaign.has(e),
      emailGloballySuppressed: this.sets.globallySuppressed.has(e),
    };
  }
}
