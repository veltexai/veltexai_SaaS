# 100F Sending Ramp Controller

100F converts daily campaign health measurements into a deterministic `hold`, `pause`, or one-stage `advance` decision. It is disabled by default and separates evaluation from live mutations.

## Safety model

- Stages: 1, 3, 5, 10, 25, 50, 120, 250, and 500 emails/day. The 3 and 5 stages provide conservative live evidence before double-digit volume.
- An increase requires dwell time, observed volume, healthy inbox capacity, acceptable bounce rate, zero complaints, and healthy webhook processing.
- Safety failures pause; missing evidence holds. A run can advance only one stage.
- Every decision has a deterministic idempotency key and an audit record.
- `VELTEX_100F_ENABLED=true` enables evaluations only. `VELTEX_100F_EXECUTE_MUTATIONS=true` is the separate live-mutation gate.
- Dry-run advances never update the applied stage.

## Deployment order

1. Apply `database/006_ramp_controller.sql` to the isolated pilot.
2. Mint a JWT with only the `veltex_100f_ramp` role and store its secrets in the isolated Vercel project.
3. Populate `ramp_daily_metrics` from verified Instantly and webhook health data.
4. Enable evaluation with mutations false and review at least three daily decisions.
5. Approve live mutations separately; retain provider campaign and per-account limits as independent backstops.

The endpoint fails closed when disabled, unauthenticated, incompletely configured, or unable to read its audit store. It never returns secrets or raw lead data.
