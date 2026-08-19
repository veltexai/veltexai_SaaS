export interface OrchestrationConfig {
  enabled: boolean;
  executeStages: boolean;
  queueDays: number;
  maximumRequestedLeads: number;
  databaseBuildTarget: number;
  minimumQueueDaysForAlert: number;
}

const positive = (raw: string | undefined, fallback: number, name: string): number => {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};
const nonNegative = (raw: string | undefined, fallback: number, name: string): number => {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  return value;
};

export function load100GConfig(env: Record<string, string | undefined>): OrchestrationConfig {
  return {
    enabled: env.VELTEX_100G_ENABLED === "true",
    executeStages: env.VELTEX_100G_EXECUTE_STAGES === "true",
    queueDays: positive(env.VELTEX_100G_QUEUE_DAYS, 7, "queue days"),
    maximumRequestedLeads: positive(env.VELTEX_100G_MAX_REQUESTED_LEADS, 500, "maximum requested leads"),
    databaseBuildTarget: nonNegative(env.VELTEX_100G_DATABASE_BUILD_TARGET, 0, "database build target"),
    minimumQueueDaysForAlert: positive(env.VELTEX_100G_MIN_QUEUE_DAYS_ALERT, 3, "minimum queue days for alert"),
  };
}
