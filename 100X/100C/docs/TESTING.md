# 100C testing

All tests are offline and deterministic (Bun's Jest-compatible runner; mocked `fetch`; injected clocks;
an ephemeral PostgreSQL for SQL security). No live Instantly/Supabase call occurs.

## Suites
- `tests/eligibility-recheck.test.ts` — only ready contacts pass; verification, suppression, customer,
  currency, missing/unverified email, staleness, and duplicate all fail closed.
- `tests/campaign-allowlist.test.ts` — Draft/Paused accepted; Active/Completed/Unhealthy/Suspended/
  Unknown rejected; unapproved/disabled/placeholder/wrong-environment/wrong-workspace rejected.
- `tests/instantly-provider.test.ts` — V2-only endpoints (no V1), Bearer auth, numeric-status mapping,
  explicit skip flags + `verify_leads_on_import:false` + no phone/metadata, reconciliation read, the
  full error matrix, create-timeout/5xx → ambiguous (no blind retry), retries count against budget,
  Retry-After, key redaction + no logging, least-privilege scopes, accounting.
- `tests/run.test.ts` — disabled by default; campaign-state read before submit; Active fails closed;
  one eligible submit + lead mapping; duplicate prevention + replay idempotency; ambiguous →
  reconciliation_required and ambiguous → reconciled-submitted; suppressed/unverified/stale skipped and
  never reserved; one-lead cap; provider skip → skipped_duplicate.
- `tests/operator.test.ts` — dry-run constructs nothing (validated-no-call); fixture-preview offline;
  provider-preview read-only (controlled context never built); controlled-write disabled by default and
  built only after all gates; production rejected; shipped env/campaign are unapproved placeholders that
  fail closed.
- `tests/static-boundaries.test.ts` — V2 only; no campaign create/activate/update, email-send, webhook,
  route, cron, or schedule; explicit skip flags; terminal-only, worker-JWT-scoped, service-role free;
  DB mutations only via fixed-search-path `SECURITY DEFINER` functions with the idempotency constraint.

## SQL security (ephemeral PostgreSQL)
`_verify/pgtest_100c.sql` applies 001+002+003 and asserts: eight tables + RLS, the idempotency
and event/lead-mapping unique constraints, worker-role flags + `authenticator` membership, nine
fixed-search-path `SECURITY DEFINER` functions (the worker is granted execute on eight of them;
`apply_100c_suppression` is intentionally not worker-granted), least-privilege grants (read approved records, insert
diagnostics, execute functions; **no** direct assignment insert/update), anon has no access, 100A/100B
intact, and behavioral checks — reserve requires the lock, reserve is idempotent, an unapproved campaign
is rejected, an invalid lifecycle state is rejected, and lead-mapping and event receipts are idempotent.

## Running
- 100C unit/integration: `bun test 100X/100C/tests/`
- All layers: `bun test 100X/100A/tests/ 100X/100B/tests/ 100X/100C/tests/`
- Types: `tsc --noEmit -p _verify/tsconfig.100c.json`
