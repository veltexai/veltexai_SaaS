import { InstantlyError } from "./instantly-provider";
import type {
  CampaignState, CampaignStateResult, LeadCreateResult, LeadReconcileResult, OutboundLead,
  OutboundRequestAccounting, OutboundSyncProvider,
} from "./types";

// Deterministic, offline outbound-sync provider for fixture-preview and tests. Makes NO external
// call. Optionally scripts a campaign state, per-email create dispositions, and reconciliation.
export interface FixtureSyncScript {
  campaignState?: CampaignState;
  observedWorkspaceId?: string | null;
  createByEmail?: Record<string, LeadCreateResult["disposition"] | "ambiguous">;
  reconcileByEmail?: Record<string, boolean>;
  activationFails?: boolean;
}

export class FixtureOutboundProvider implements OutboundSyncProvider {
  readonly name = "fixture" as const;
  private readonly accounting: OutboundRequestAccounting = { campaignReads: 0, campaignWrites: 0, leadWrites: 0, reconcileReads: 0, retryAttempts: 0, providerErrors: 0, ambiguousOutcomes: 0 };
  constructor(private readonly script: FixtureSyncScript = {}) {}

  getAccounting(): OutboundRequestAccounting { return { ...this.accounting }; }

  async getCampaignState(_id: string, _budget: number): Promise<CampaignStateResult> {
    this.accounting.campaignReads += 1;
    return { state: this.script.campaignState ?? "draft", observedWorkspaceId: this.script.observedWorkspaceId ?? null, providerStatusRaw: null, requestsUsed: 1 };
  }

  async createLead(_id: string, lead: OutboundLead, _budget: number): Promise<LeadCreateResult> {
    this.accounting.leadWrites += 1;
    const disposition = this.script.createByEmail?.[lead.workEmail] ?? "submitted";
    if (disposition === "ambiguous") { this.accounting.ambiguousOutcomes += 1; throw new InstantlyError("ambiguous", "fixture ambiguous create outcome"); }
    if (disposition === "skipped_duplicate") return { disposition: "skipped_duplicate", providerLeadId: null, requestsUsed: 1 };
    return { disposition: "submitted", providerLeadId: `fixture-lead-${lead.attribution.canonicalContactId}`, requestsUsed: 1 };
  }

  async reconcileLead(_id: string, workEmail: string, _budget: number): Promise<LeadReconcileResult> {
    this.accounting.reconcileReads += 1;
    const exists = this.script.reconcileByEmail?.[workEmail] ?? false;
    return { existsInCampaign: exists, providerLeadId: exists ? `fixture-lead-${workEmail}` : null, requestsUsed: 1 };
  }

  async activateCampaign(_id: string, _budget: number) {
    this.accounting.campaignWrites += 1;
    if (this.script.activationFails) throw new InstantlyError("transient", "fixture activation failure");
    return { activated: true, requestsUsed: 1 };
  }
}
