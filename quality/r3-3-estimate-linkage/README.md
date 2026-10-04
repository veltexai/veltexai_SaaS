# R3-3 estimate-scenario linkage evidence

Status: **LOCAL CANDIDATE — INDEPENDENT/HOSTED GATES PENDING**

The bounded R3-3 candidate adds migration `20261004000000`, an append-only
estimate snapshot/receipt boundary, one caller-bound command, scoped summary
and history projections, a server-validated CRM entry route, and a CRM save
mode in the existing deterministic service-catalog workbench.

It intentionally does not add a pricing formula, mutate proposal bytes, send a
proposal, record acceptance, create a handoff, invoice, payment, attachment,
photo, video, or AI-selected price.

Local evidence:

- migration validation: 68 unique executable versions;
- focused Jest: CRM migration/API/Board/workbench suites pass;
- full Jest: 108 suites, 901 tests and 5 snapshots pass;
- TypeScript passes;
- fresh socket-only PostgreSQL 16 replay applies all 68 migrations and passes
  the R3-1, R3-2 and R3-3 adversarial matrices, the owner matrix, complete
  definer allowlist, injection, dirty/rerun and 40-way concurrency gates;
- R3-3 proves owner and exact assigned-estimator access, viewer denial,
  authenticated direct-DML denial, exact replay, changed replay refusal, stale
  token refusal, commercial completed-walkthrough requirement, engine/version
  allowlisting, package-pointer/token agreement, the invariant that an
  `estimated` package must reference its immutable selected estimate, ID-only
  outbox payloads and explicit service-role denial;
- a two-session race from one package token produces exactly one committed
  estimate/pointer update and one `40001` refusal (`R3_3_CONCURRENCY_PASS`); and
- production build requires ordinary build-time Supabase public variables; no
  hosted database or production mutation is part of this local gate.

Next: bind a committed candidate into an exact independent-review packet. Only
after exact-candidate PASS may a separately authorized guarded isolated-preview
apply and genuine desktop/390px operator acceptance occur.
