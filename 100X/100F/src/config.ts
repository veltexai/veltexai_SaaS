import { RAMP_STAGES, type RampPolicy } from "./types";

const positive = (value: string | undefined, fallback: number, name: string): number => {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be positive`);
  return parsed;
};
const rate = (value: string | undefined, fallback: number, name: string): number => {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) throw new Error(`${name} must be greater than zero and at most one`);
  return parsed;
};
const positiveInteger = (value: string | undefined, fallback: number, name: string): number => {
  const parsed = positive(value, fallback, name);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`);
  return parsed;
};

export interface RampConfig {
  enabled: boolean;
  executeMutations: boolean;
  campaignId: string | null;
  policy: RampPolicy;
}

export function load100FConfig(env: Record<string, string | undefined>): RampConfig {
  const maximumSpamComplaints = Number(env.VELTEX_100F_MAX_SPAM_COMPLAINTS ?? "0");
  if (!Number.isInteger(maximumSpamComplaints) || maximumSpamComplaints < 0) throw new Error("maximum spam complaints must be a non-negative integer");
  return {
    enabled: env.VELTEX_100F_ENABLED === "true",
    executeMutations: env.VELTEX_100F_EXECUTE_MUTATIONS === "true",
    campaignId: env.VELTEX_100F_CAMPAIGN_ID ?? null,
    policy: {
      stages: RAMP_STAGES,
      minimumDaysAtStage: positive(env.VELTEX_100F_MIN_DAYS_AT_STAGE, 3, "minimum days at stage"),
      minimumDeliveredAtStage: positive(env.VELTEX_100F_MIN_DELIVERED_AT_STAGE, 10, "minimum delivered at stage"),
      maximumBounceRate: positive(env.VELTEX_100F_MAX_BOUNCE_RATE, 0.02, "maximum bounce rate"),
      maximumUnsubscribeRate: rate(env.VELTEX_100F_MAX_UNSUBSCRIBE_RATE, 0.05, "maximum unsubscribe rate"),
      minimumUnsubscribeSampleSize: positiveInteger(env.VELTEX_100F_MIN_UNSUBSCRIBE_SAMPLE_SIZE, 20, "minimum unsubscribe sample size"),
      maximumSpamComplaints,
      minimumAccountHealth: positive(env.VELTEX_100F_MIN_ACCOUNT_HEALTH, 95, "minimum account health"),
      perAccountDailyLimit: positive(env.VELTEX_100F_PER_ACCOUNT_DAILY_LIMIT, 25, "per-account daily limit"),
      requireZeroWebhookFailures: env.VELTEX_100F_ALLOW_WEBHOOK_FAILURES !== "true",
    },
  };
}
