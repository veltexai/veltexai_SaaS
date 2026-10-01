# G3 expected-state contract

This directory replaces coarse migration-existence booleans with a PostgreSQL
16-generated catalog contract. It is a safety and discovery mechanism only; it
does not authorize or perform a production write.

- `generate-expected-state.mjs` replays the exact 63-file migration chain and
  records normalized catalog atoms, per-step before/after hashes, final-writer
  attribution, the exact 29-file recorded baseline, and the pre-R2 checkpoint.
- `build-read-only-production-capture.mjs` creates a hashes-only SQL query under
  `/private/tmp`. The query must be run only after the operator confirms the
  production project ref shown in the Supabase dashboard. It is wrapped in
  `begin transaction read only` and `rollback`. The same generator accepts only
  the pinned isolated preview (`ynzkwctwlssjcsjmahey`, environment
  `isolated-preview`) when both explicit target flags are supplied; this keeps
  preview compatibility evidence labeled and prevents it from being accepted
  by the production classifier.
- `classify-production-capture.mjs` refuses wrong identity/history, any R2
  evidence, partial state, unexpected drift, and fully superseded migrations
  that cannot be inferred from catalog state alone. Prerequisite classification
  compares each step with the cumulatively selected predecessor state instead
  of only the original baseline, so a legitimately absent later step is not
  confused with partial application after earlier steps are complete.
- `test-classifier.mjs` proves fail-closed behavior for baseline ambiguity,
  partial state, cumulative predecessor states, and stray R2 state.

Physical column ordinals are intentionally excluded from semantic atom hashes.
Named-column type, nullability, default, identity, generated status and
collation remain exact. This permits equivalent additive schemas whose column
creation order differs while still rejecting every behaviorally meaningful
column drift.

The only `absent-equivalent` prerequisite is
`20260924010000_restrict_legacy_proposal_view.sql`: complete absence of the
legacy `enhanced_proposals` view, all its columns and every explicit view ACL is
strictly safer than hardening that unused view in place. The classifier binds
the exact absent-atom set by SHA-256; the builder and validator independently
recompute it and allow only the dedicated `reconcile-absent-equivalent` mode.
Partial removal, a forged proof or use of this mode for any other migration is
rejected.

The catalog contract cannot prove historical one-time data transformations by
itself. Data-bearing migrations—including catalog classification, free-trial
backfill, internal-profile classification, and reviewed location-pricing seed
rows—must receive explicit data-invariant probes or a separately reviewed
idempotent forward repair before G3 can pass.

`data-invariants-expression.sql` supplies the hashes-only portion of that
proof. It emits no source rows or customer identifiers. It checks terminal
catalog-classification safety, active free-trial usage coverage, internal QA
classification, both catalog-version seeds, and scoped reviewed pricing rows.
The pricing projection hashes naturalize source foreign keys and exclude
generated IDs. The classifier refuses a structurally complete data-bearing
migration when its invariant object differs from the generated pre-R2
checkpoint.

`compare-hosted-preview.mjs` is a separate fail-closed compatibility gate for
the pinned isolated preview. It requires capture contract v3/canonicalization
v2, PostgreSQL 16 or 17, exact non-ACL application atoms and data invariants,
direct ACL provenance derived from migration before/after deltas, and a narrow
effective privilege matrix for `anon`, `authenticated`, and `service_role`.
Provider default/owner/schema ACLs and PostgreSQL 17 `MAINTAIN` are reported as
variance, never used to excuse an unexpected effective privilege. Pgcrypto is
checked as a capability (exact version 1.3, schema `public` or `extensions`, and
callable `digest(text,text)` procedure proven by OID dependency to that exact
extension in its declared schema) rather than as migration-owned schema.
Pgcrypto is capture-tooling capability only: it enables hashes and is excluded,
with all extension-owned members, from application migration semantics.

The effective privilege artifact exhaustively enumerates every public
application routine, table/view, sequence, and the public schema for all
meaningful privileges across `anon`, `authenticated`, and `service_role`.
PostgreSQL 17 `MAINTAIN` is present for every relation and must be false for
both client roles. Direct ACL atoms contain only physical explicit ACL entries
and carry `acl_source: explicit`; default privileges are never materialized as
direct grants. Inherited and provider-default access is judged by the separate
effective matrix. Provider principals may inherit client roles, but any role
membership whose recipient is `anon`, `authenticated`, or `service_role` is
rejected unless a future review explicitly changes the comparator.

The curated required-runtime allow set contains 18 availability-critical
entries: EXECUTE for the seven authenticated usage/access wrapper functions;
service-role SELECT on `proposals`, plus SELECT/INSERT on
`additional_service_catalog`; authenticated SELECT on `proposal_tracking`;
and anonymous EXECUTE for `read_tracked_proposal`,
`read_tracked_proposal_print`, `record_tracked_view`,
`record_tracked_download`, `record_tracking_click`,
`record_tracking_metric`, and `tracked_proposal_has_paid_access`. Removing
other expected allows is reported as a more-restrictive variance, but removing
one of these reviewed runtime capabilities blocks compatibility.

Compatibility requires the exact canonical lexically sorted 63-version history
emitted by the read-only capture. `20260925012000` follows `20260925011000`
and uses version-gated dynamic SQL: it is a parseable no-op on PostgreSQL 16.
On PostgreSQL 17 it requires the `postgres` migration identity, postgres-owned
non-extension application relations, and no upward anon/authenticated role
membership. It revokes current `MAINTAIN` from `PUBLIC`, `anon`, and
`authenticated` and removes the exact postgres-owned public defaults. The only
remaining default variance is the exact dormant, non-grantable public-table
pair owned by `supabase_admin` for anon/authenticated; global, `PUBLIC`,
grantable, differently owned, or differently scoped variants fail closed.
Effective client access and direct `PUBLIC` access must both be zero. Run
`npm run r2:test-pg17-maintain-repair` with `PG17_BIN` pointing to PostgreSQL
17; the gate explicitly reports `PENDING` when only PostgreSQL 16 is available.
The exact sorted 61-version preview set with all seven
`20260925011000` revocations effective is
reported only as `effect-complete/history-absent`; it remains non-ready and
requires separately reviewed history reconciliation. No comparator writes SQL
or migration history.
