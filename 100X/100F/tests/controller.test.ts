import { runRampController } from "../src/controller";
import type { DailyRampMetrics, RampDecision, RampPolicy, RampProvider, RampRepository, RampState } from "../src/types";

const policy: RampPolicy = { stages: [1, 3, 5, 10, 25, 50, 120, 250, 500], minimumDaysAtStage: 1, minimumDeliveredAtStage: 1, maximumBounceRate: 0.02, maximumUnsubscribeRate: 0.05, minimumUnsubscribeSampleSize: 20, maximumSpamComplaints: 0, minimumAccountHealth: 95, perAccountDailyLimit: 25, requireZeroWebhookFailures: true };
const state: RampState = { campaignId: "pilot", currentStage: 1, stageStartedAt: "2026-08-01T00:00:00Z", lastDecisionDate: null, pausedByController: false };
const metrics: DailyRampMetrics[] = [{ date: "2026-08-11", campaignId: "pilot", campaignStatus: 1, configuredDailyLimit: 1, sent: 1, bounced: 0, replies: 0, unsubscribes: 0, spamComplaints: 0, webhookFailures: 0, healthySendingAccounts: 4, minimumAccountHealth: 100 }];
const supply = { queuedEligibleLeads: 20, minimumQueueDays: 3 };

class MemoryRepository implements RampRepository {
  decisions: RampDecision[] = [];
  current = { ...state };
  async getState() { return this.current; }
  async getMetrics() { return metrics; }
  async recordDecision(_campaignId: string, decision: RampDecision) {
    if (this.decisions.some((d) => d.idempotencyKey === decision.idempotencyKey)) return false;
    this.decisions.push(decision); return true;
  }
  async updateState(_campaignId: string, decision: RampDecision) {
    if (decision.action === "advance") this.current.currentStage = decision.targetStage;
    this.current.lastDecisionDate = decision.observedAt.slice(0, 10);
  }
}

class MemoryProvider implements RampProvider {
  limits: number[] = []; pauses = 0;
  async setDailyLimit(_id: string, limit: number) { this.limits.push(limit); }
  async pauseCampaign() { this.pauses += 1; }
}

describe("100F controller", () => {
  it("records dry-run decisions without mutating the provider", async () => {
    const repository = new MemoryRepository(); const provider = new MemoryProvider();
    expect(await runRampController("pilot", { enabled: true, executeMutations: false, policy, repository, provider, supply, now: () => new Date("2026-08-11T12:00:00Z") })).toMatchObject({ action: "advance", targetStage: 3 });
    expect(provider.limits).toEqual([]);
    expect(repository.decisions).toHaveLength(1);
    expect(repository.current.currentStage).toBe(1);
  });

  it("updates the provider only when mutation execution is enabled", async () => {
    const repository = new MemoryRepository(); const provider = new MemoryProvider();
    await runRampController("pilot", { enabled: true, executeMutations: true, policy, repository, provider, supply, now: () => new Date("2026-08-11T12:00:00Z") });
    expect(provider.limits).toEqual([3]);
  });

  it("makes a replay a no-op", async () => {
    const repository = new MemoryRepository(); const provider = new MemoryProvider();
    const deps = { enabled: true, executeMutations: false, policy, repository, provider, supply, now: () => new Date("2026-08-11T12:00:00Z") };
    await runRampController("pilot", deps);
    expect((await runRampController("pilot", deps)).action).toBe("hold");
  });

  it("does not record or mutate while disabled", async () => {
    const repository = new MemoryRepository(); const provider = new MemoryProvider();
    expect((await runRampController("pilot", { enabled: false, executeMutations: true, policy, repository, provider, now: () => new Date("2026-08-11T12:00:00Z") })).reason).toBe("100F is disabled");
    expect(repository.decisions).toHaveLength(0);
    expect(provider.limits).toEqual([]);
  });

  it("uses the completed observation date for the decision key", async () => {
    const repository = new MemoryRepository(); const provider = new MemoryProvider();
    const decision = await runRampController("pilot", {
      enabled: true,
      executeMutations: false,
      policy,
      repository,
      provider,
      now: () => new Date("2026-08-12T03:00:00Z"),
      evaluationDate: "2026-08-11",
    });
    expect(decision.observedAt).toBe("2026-08-11T12:00:00.000Z");
  });
});
