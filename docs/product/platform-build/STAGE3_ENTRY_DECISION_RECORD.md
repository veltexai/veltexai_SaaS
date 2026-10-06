# Stage 3 onboarding and migration entry decisions

Status: **RECOMMENDED DEFAULTS PREPARED / PREDECESSOR AND FOUNDER GATED**

These defaults preserve the approved onboarding/import/export outcome without
starting implementation before full R3 acceptance. Every accepted choice must
be rebound to the exact Stage 2 predecessor and recorded in the operating
ledger.

## Recommended first-build defaults

| Decision | Recommended default | Status |
|---|---|---|
| Import formats | UTF-8 CSV only; reject invalid encoding, archives, macros and binary/polyglot content | PENDING |
| Import bounds | 10,000 rows and 25 MiB per file; server-enforced before parsing | PENDING |
| Objects | Customers, contacts, properties, leads and opportunities; one canonical schema/version each | PENDING |
| Duplicate handling | Deterministic suggestions only; explicit create/link/merge/skip choice; never silent merge | PENDING |
| Consent | Unknown unless authoritative provenance is imported; DNC/suppression always wins | PENDING |
| Preview/resume | Immutable source hash, versioned mapping preset, 24-hour preview TTL and resumable batches | PENDING |
| Commit/undo | Atomic idempotent batches; reason-coded undo for 24 hours or until an imported record receives a non-import mutation, whichever occurs first | PENDING |
| Legacy proposal policy | Preserve original bytes, price, status and link; create reversible mapping records; never recompose historical content | PENDING |
| Public links | Preserve by default during migration; separately allowlisted owner/admin revoke/expiry action after preview | PENDING |
| Organization export | Every plan; step-up authentication; encrypted archive; 24-hour download expiry; versioned completeness manifest | PENDING |
| Roles | Owner/admin configure and commit; assigned estimator may map/preview scoped records; viewer cannot import/merge/reverse/export | PENDING |
| Sample workspace | Isolated, visibly synthetic and excluded from activation, sends, acceptance, exports and billing | PENDING |

## Required implementation invariants

- Organization context is explicit and caller-bound; active organization is
  routing context, not authorization.
- Mapping, normalization and dedupe algorithms are versioned and included in
  the preview/commit hash.
- Formula-leading CSV values are neutralized on export and never executed on
  import preview.
- A commit receipt binds source file hash, schema/mapping versions, actor,
  organization, batch set and exact outcomes. Changed retry is rejected.
- Merge history and undo are append-only. Finalization never deletes provenance.
- Legacy accepted status becomes `manual_legacy`, not native C0 evidence.
- Historical proposal/public-link byte hashes are captured before and after
  migration and must match exactly.
- Export manifests distinguish mutable business records, immutable receipts,
  excluded secrets/access notes and deletion/retention state.

## Explicit exclusions

- spreadsheet formulas or XLS/XLSX in the first build;
- automatic customer communication or marketing consent;
- silent merge, best-effort partial commit or unbounded concierge handling;
- treating the local-storage onboarding banner as durable state; and
- treating single-proposal PDF download as organization portability.
