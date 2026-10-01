# G3 expected-state contract

This directory replaces coarse migration-existence booleans with a PostgreSQL
16-generated catalog contract. It is a safety and discovery mechanism only; it
does not authorize or perform a production write.

- `generate-expected-state.mjs` replays the exact 62-file migration chain and
  records normalized catalog atoms, per-step before/after hashes, final-writer
  attribution, the exact 29-file recorded baseline, and the pre-R2 checkpoint.
- `build-read-only-production-capture.mjs` creates a hashes-only SQL query under
  `/private/tmp`. The query must be run only after the operator confirms the
  production project ref shown in the Supabase dashboard. It is wrapped in
  `begin transaction read only` and `rollback`.
- `classify-production-capture.mjs` refuses wrong identity/history, any R2
  evidence, partial state, unexpected drift, and fully superseded migrations
  that cannot be inferred from catalog state alone.
- `test-classifier.mjs` proves fail-closed behavior for baseline ambiguity,
  partial state, and stray R2 state.

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
