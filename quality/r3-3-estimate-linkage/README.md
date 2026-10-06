# R3-3 estimate-scenario linkage evidence

Status: **LOCAL COMPLETE / INDEPENDENT PASS — PREVIEW, OPERATOR AND FOUNDER GATES PENDING**

The bounded R3-3 remediation candidate adds migration `20261004000000`, an append-only
estimate snapshot/receipt boundary, one server-only command that independently
authorizes the authenticated actor, scoped summary
and history projections, a server-validated CRM entry route, and a CRM save
mode in the existing deterministic service-catalog workbench.

It intentionally does not add a pricing formula, mutate proposal bytes, send a
proposal, record acceptance, create a handoff, invoice, payment, attachment,
photo, video, or AI-selected price.

Local evidence:

- migration validation: 68 unique executable versions;
- focused Jest: CRM migration/API/Board/workbench suites pass;
- full Jest: 108 suites, 912 tests and 5 snapshots pass;
- TypeScript passes;
- fresh socket-only PostgreSQL 16 replay applies all 68 migrations and passes
  the R3-1, R3-2 and R3-3 adversarial matrices, the owner matrix, complete
  definer allowlist, injection, dirty/rerun and 40-way concurrency gates;
- R3-3 proves owner and exact assigned-estimator access, viewer denial,
  authenticated direct-DML denial, exact replay, changed replay refusal, stale
  token refusal, honest commercial and specialty-estimating refusal,
  engine/version
  allowlisting, exact composite package/run binding, package-pointer/token agreement, the invariant that an
  `estimated` package must reference its immutable newly selected estimate, private
  access-adjacent free-text exclusion, ID-only outbox payloads, authenticated
  direct-command denial, exact replay after later lifecycle movement, and
  later-state package regression refusal;
- a two-session race from one package token produces exactly one committed
  estimate/pointer update and one `40001` refusal (`R3_3_CONCURRENCY_PASS`); and
- production build requires ordinary build-time Supabase public variables; no
  hosted database or production mutation is part of this local gate.

All earlier independent packets are rejected and superseded. Claude returned
`PASS` on exact archive `veltex-r3-3-final-evidence-44ca803-review.zip`, SHA-256
`4389f7b673524eec39783b8c26307f70c78cba3181e0a137a8a8ec262a54f191`,
candidate `44ca80391bd570fa5dc717686163f999529fe432`, with implementation/evidence
commit `fb31b3daeb12fd3865774398fb04e51cffcef5b0`. The independent run reproduced
the full local gates and closed both remaining pointer/lifecycle findings.
Next: a separately authorized guarded isolated-preview apply and exact Preview
application deployment, followed by genuine desktop/390px operator acceptance.

The local preview gate is prepared but not authorized or applied:

- `build-preview-apply.mjs` binds the exact migration SHA, exact 67-version
  predecessor history, absent R3-3 schema, protected CRM row hashes, one outer
  transaction and one history insertion;
- its postflight requires history 68, empty R3-3 append-only tables, RLS,
  package/run constraints, the guard trigger, client denial and server-only
  command execution;
- `test-preview-apply.mjs` proves deterministic generation and structural
  refusal properties; and
- `FOUNDER_ACCEPTANCE.md` defines desktop and genuine-390px operator checks.

This tooling does not grant permission to mutate Preview and must not be used
before the independent remediation verdict is `PASS`.
