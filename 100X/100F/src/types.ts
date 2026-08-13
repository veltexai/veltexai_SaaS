export const WORKFLOW_ID = "100F" as const;

export const RAMP_STAGES = [1, 3, 5, 10, 25, 50, 120, 250, 500] as const;
export type RampStage = (typeof RAMP_STAGES)[number];
export type RampAction = "hold" | "advance" | "pause";

export interface DailyRampMetrics {
  date: string;
  campaignId: string;
  campaignStatus: number;
  configuredDailyLimit: number;
  sent: number;
  bounced: number;
  replies: number;
  unsubscribes: number;
  spamComplaints: number;
  webhookFailures: number;
  healthySendingAccounts: number;
  minimumAccountHealth: number;
}

export interface RampState {
  campaignId: string;
  currentStage: RampStage;
  stageStartedAt: string;
  lastDecisionDate: string | null;
  pausedByController: boolean;
}

export interface RampPolicy {
  stages: readonly RampStage[];
  minimumDaysAtStage: number;
  minimumDeliveredAtStage: number;
  maximumBounceRate: number;
  maximumSpamComplaints: number;
  minimumAccountHealth: number;
  perAccountDailyLimit: number;
  requireZeroWebhookFailures: boolean;
}

export interface RampDecision {
  action: RampAction;
  currentStage: RampStage;
  targetStage: RampStage;
  reason: string;
  observedAt: string;
  idempotencyKey: string;
}

export interface RampRepository {
  getState(campaignId: string): Promise<RampState>;
  getMetrics(campaignId: string, days: number): Promise<DailyRampMetrics[]>;
  recordDecision(campaignId: string, decision: RampDecision, metrics: DailyRampMetrics[]): Promise<boolean>;
  updateState(campaignId: string, decision: RampDecision): Promise<void>;
  upsertMetrics?(metrics: DailyRampMetrics): Promise<void>;
  getInternalSignals?(campaignId: string, date: string): Promise<{ spamComplaints: number; webhookFailures: number }>;
}

export interface RampProvider {
  setDailyLimit(campaignId: string, dailyLimit: number): Promise<void>;
  pauseCampaign(campaignId: string): Promise<void>;
}

export interface RampMetricsProvider {
  collect(campaignId: string, date: string): Promise<Omit<DailyRampMetrics, "spamComplaints" | "webhookFailures">>;
}
