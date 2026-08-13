export type StageId = "100A" | "100B" | "100C";
export type StageStatus = "completed" | "skipped" | "failed";
export type OrchestrationMode = "dry_run" | "execute";

export interface SupplySnapshot {
  currentDailySendStage: number;
  queuedEligibleLeads: number;
}

export interface StageResult {
  stage: StageId;
  status: StageStatus;
  produced: number;
  reason: string;
}

export interface OrchestrationRun {
  runDate: string;
  mode: OrchestrationMode;
  requestedLeads: number;
  results: StageResult[];
  status: "completed" | "failed";
}

export interface StageRunner {
  run(input: { runDate: string; requestedLeads: number; currentDailySendStage: number }): Promise<StageResult>;
}

export interface OrchestrationRepository {
  getSupplySnapshot(): Promise<SupplySnapshot>;
  findRun(runDate: string, mode: OrchestrationMode): Promise<OrchestrationRun | null>;
  recordRun(run: OrchestrationRun): Promise<boolean>;
}

export interface OrchestrationDependencies {
  repository: OrchestrationRepository;
  stages: Record<StageId, StageRunner>;
  now?: () => Date;
}
