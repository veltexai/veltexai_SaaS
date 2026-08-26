# 100G — Acquisition Orchestrator

100G is the guarded replenishment controller for 100A discovery, 100B enrichment, and 100C campaign
synchronization. It calculates a seven-day eligible-lead queue from the active 100F sending stage,
runs stages in order, stops downstream work after any failure, and records one idempotent run per day.

Every run now records a PII-safe supply forecast, low/empty-queue alerts, and structured 100B
yield evidence (targets, candidates, provider requests/errors, duplicates, verification outcomes,
and caps). The protected `/api/internal/100x/health` endpoint combines the latest orchestration
runs with the 100F state, daily metrics, and mutation-decision audit trail. It is read-only.

Production scheduling uses independent daily lanes: outbound first, reconciliation 30 minutes
later, bounded discovery after the send window, and enrichment after discovery. Each lane has its
own idempotent audit record, so acquisition latency cannot delay daily campaign synchronization.
The discovery lane defaults to at most three markets per run; override only with
`VELTEX_100A_MAX_MARKETS_PER_DISCOVERY_RUN` after provider cost and runtime review.

It does not weaken the independent locks, caps, eligibility checks, suppression checks, or provider
budgets owned by 100A–100C. `VELTEX_100G_ENABLED=true` enables evaluation; the separate
`VELTEX_100G_EXECUTE_STAGES=true` gate authorizes stage execution. Both default to false.

The current foundation defines the orchestration contract and safety behavior. Production adapters must
invoke explicitly authorized 100G entrypoints for 100A–100C; their existing manual operator commands
remain manual-only.
