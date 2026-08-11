# 100G — Acquisition Orchestrator

100G is the guarded replenishment controller for 100A discovery, 100B enrichment, and 100C campaign
synchronization. It calculates a seven-day eligible-lead queue from the active 100F sending stage,
runs stages in order, stops downstream work after any failure, and records one idempotent run per day.

It does not weaken the independent locks, caps, eligibility checks, suppression checks, or provider
budgets owned by 100A–100C. `VELTEX_100G_ENABLED=true` enables evaluation; the separate
`VELTEX_100G_EXECUTE_STAGES=true` gate authorizes stage execution. Both default to false.

The current foundation defines the orchestration contract and safety behavior. Production adapters must
invoke explicitly authorized 100G entrypoints for 100A–100C; their existing manual operator commands
remain manual-only.
