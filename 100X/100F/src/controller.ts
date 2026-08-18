import { evaluateRamp } from "./policy";
import type { RampDecision, RampPolicy, RampProvider, RampRepository } from "./types";

export interface ControllerDependencies {
  enabled: boolean;
  executeMutations: boolean;
  policy: RampPolicy;
  repository: RampRepository;
  provider: RampProvider;
  now?: () => Date;
  evaluationDate?: string;
}

export async function runRampController(campaignId: string, deps: ControllerDependencies): Promise<RampDecision> {
  const now = deps.now?.() ?? new Date();
  const today = deps.evaluationDate ?? now.toISOString().slice(0, 10);
  const state = await deps.repository.getState(campaignId);
  const metrics = await deps.repository.getMetrics(campaignId, Math.max(7, deps.policy.minimumDaysAtStage + 1));
  const decision = evaluateRamp(state, metrics, deps.policy, today);

  if (!deps.enabled) return { ...decision, action: "hold", targetStage: state.currentStage, reason: "100F is disabled" };
  const inserted = await deps.repository.recordDecision(campaignId, decision, metrics);
  if (!inserted) return { ...decision, action: "hold", targetStage: state.currentStage, reason: "duplicate decision" };

  if (deps.executeMutations) {
    if (decision.action === "pause") await deps.provider.pauseCampaign(campaignId);
    if (decision.action === "advance") await deps.provider.setDailyLimit(campaignId, decision.targetStage);
  }
  // Dry-run recommendations must never make the persisted stage look applied.
  if (decision.action === "hold" || deps.executeMutations) {
    await deps.repository.updateState(campaignId, decision);
  }
  return decision;
}
