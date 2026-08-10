# 100D testing

All tests are offline and deterministic (Bun's Jest-compatible runner; in-memory repository; injected
clocks; no network, no database, no real events).

```
bun test 100X/100D/tests/                                   # 100D only
bun test 100X/100A/tests/ 100X/100B/tests/ 100X/100C/tests/ 100X/100D/tests/   # full regression
```

## Coverage by file
- `auth.test.ts` — missing / blank / incorrect / correct secret; server secret unset or too weak;
  timing-safe fixed-width path never throws on length mismatch; header name.
- `allowlist.test.ts` — correct workspace+campaign; wrong/missing workspace; wrong/missing campaign;
  unapproved/inactive campaign; campaign with no pinned workspace.
- `normalization.test.ts` — classification of every supported event; unknown event fails safe; missing /
  invalid timestamp; missing lead email (required vs optional); email normalization; **no raw reply/email
  body persisted**; fingerprint determinism (replay-stable, distinct-events-diverge, case-stable, no raw
  email in id).
- `idempotency.test.ts` — identical replay; duplicate fingerprint; retry after DB timeout; two distinct
  events; concurrent duplicate delivery.
- `resolution.test.ts` — mapping match; assignment match; normalized-email match; missing contact;
  ambiguous; wrong campaign; pipeline holds unknown contacts.
- `suppression.test.ts` — hard bounce; unsubscribe; complaint; do-not-contact; open/click do not suppress;
  reply does not remove suppression; contact-level unsubscribe does not block the domain; replayed
  suppression is a no-op; unmatched bounce still suppresses by email while held.
- `customer-status.test.ts` — trial_started / subscription_trialing → active_trial; subscription_active /
  customer_confirmed → existing_customer; unknown status; invalid email; duplicate is a no-op; no billing
  data persisted.
- `reconciliation.test.ts` — held event reprocessed once its assignment appears; already-processed is a
  safe no-op; queue drains.
- `security-boundaries.test.ts` (static) — role flags; RLS on every new table; revokes; fixed search_path;
  EXECUTE-only grant (no table DML to the role); no DELETE/DROP/TRUNCATE; no ALTER/DROP of 001–003 objects;
  provider/outcome check constraints; routes are node-runtime, disabled-by-default, size/content-type/auth
  checked, never use the service-role key; normalizer never references reply/email bodies; auth/routes
  never log secrets.
- `operator.test.ts` — dry-run constructs nothing; fixture-preview processes/suppresses/holds/rejects;
  local-route-test auth cases; reconciliation-preview links late assignments; unknown mode rejected.

## Type + integrity checks
- `tsc --strict` over the routes + 100D graph (repo tsconfig): clean.
- `tsc` with the non-strict `cli.mjs` flags: clean (operator compiles + runs offline).
- Secret scan across `100X/100D` + routes: clean.
- Migrations 001/002/003 byte-identical (SHA-256 recorded in the build report; 003 matches the applied hash).
- `git diff --check`: clean.
