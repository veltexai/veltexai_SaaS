export type StageId = "100A" | "100B" | "100C";
export type StageStatus = "completed" | "skipped" | "failed";
export type OrchestrationMode = "dry_run" | "execute";
export type OrchestrationLane = "full" | "outbound" | "discovery" | "enrichment";

export interface SupplySnapshot {
  currentDailySendStage: number;
  queuedEligibleLeads: number;
}

export interface StageResult {
  stage: StageId;
  status: StageStatus;
  produced: number;
  reason: string;
  evidence?: Record<string, string | number | boolean | null | Record<string, number>>;
}

export type SupplyStatus = "healthy" | "low" | "empty";
export interface SupplyForecast {
  currentDailySendStage: number;
  queuedEligibleLeads: number;
  desiredQueue: number;
  deficit: number;
  runwayDays: number;
  minimumAlertDays: number;
  status: SupplyStatus;
}

export interface OrchestrationAlert {
  code: "ELIGIBLE_SUPPLY_EMPTY" | "ELIGIBLE_SUPPLY_BELOW_DAILY_STAGE" | "ELIGIBLE_SUPPLY_LOW" | "ENRICHMENT_ZERO_YIELD" | "STAGE_FAILED";
  severity: "warning" | "critical";
  message: string;
}

export interface OrchestrationRun {
  runDate: string;
  mode: OrchestrationMode;
  lane: OrchestrationLane;
  requestedLeads: number;
  results: StageResult[];
  supply?: SupplyForecast;
  alerts?: OrchestrationAlert[];
  status: "completed" | "failed";
}

export interface StageRunner {
  run(input: { runDate: string; requestedLeads: number; currentDailySendStage: number; lane: OrchestrationLane }): Promise<StageResult>;
}

export interface OrchestrationRepository {
  getSupplySnapshot(): Promise<SupplySnapshot>;
  findRun(runDate: string, mode: OrchestrationMode, lane: OrchestrationLane): Promise<OrchestrationRun | null>;
  recordRun(run: OrchestrationRun): Promise<boolean>;
}

export interface OrchestrationDependencies {
  repository: OrchestrationRepository;
  stages: Record<StageId, StageRunner>;
  now?: () => Date;
}
