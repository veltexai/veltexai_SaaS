# Stage 5 O0 scheduling and field-operation decisions

Status: **RECOMMENDED DEFAULTS PREPARED / STAGE 4 AND FOUNDER GATED**

These decisions preserve the approved native scheduling/field-execution goal
while keeping higher-risk location, offline and payroll functions outside the
first build until their evidence gates pass.

## Recommended first-build defaults

| Decision | Recommended default | Status |
|---|---|---|
| Initial mode | Native service plans, jobs and visits after full Stage 4; external coexistence is import/export, not completion | PENDING |
| Time authority | Property IANA timezone; store instants in UTC plus source zone/rule version | PENDING |
| Recurrence | Bounded RRULE subset for daily/weekly/monthly; explicit DST preview and overnight attribution | PENDING |
| Generation | Rolling 90-day horizon; deterministic plan/rule/window key; regeneration never rewrites detached or worked visits | PENDING |
| Conflicts | Warn and require reasoned override for worker/crew overlap, blackout and travel constraints | PENDING |
| Field mode | Online-first with encrypted local drafts, idempotent retry and visible not-synced state | PENDING |
| Check-in/out | Manual and supervisor alternatives always available; no location required | PENDING |
| Location | Off in first build; later foreground point-in-time only after counsel/consent/jurisdiction gate | PENDING |
| Access notes | Assignment-scoped, time-boxed encrypted RPC; never in events, exports, ICS, push or customer views | PENDING |
| Actuals | Append-only time/material/subcontractor/fee facts with source, effective time and reconciliation state | PENDING |
| Profitability | Estimated, scheduled, actual, invoiced and collected remain separate; thresholds are operator configured | PENDING |

## Required proof

- IANA validation plus nonexistent/repeated DST and overnight cases;
- exact replay, changed replay, concurrent generation and detachment safety;
- worker/crew/role and cross-tenant IDOR matrix;
- access-note expiry, logging and export/event exclusion;
- offline draft conflict/retry and low-bandwidth mobile recovery;
- actual-source and reconciliation provenance with immutable estimate baseline;
- four-week scheduling pilot and field-operator validation; and
- independent, accessibility, Preview and founder gates.

Payroll, tax, HR, banking, general-ledger, continuous/background location and
regulated-service safety determinations remain excluded.
