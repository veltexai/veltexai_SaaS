# R3-4.1 immutable package-set commitment decision

Status: **DATABASE COMMAND LOCAL CANDIDATE / APPLICATION INTEGRATION PENDING**

## Purpose

R3-4 currently freezes one work package and one R3-3 estimate in each immutable
proposal version. R3-5 C0 requires a customer to accept a non-empty subset of
the packages offered by one exact version. Restricting
`accepted_package_ids` to one package would reduce the approved contract and is
rejected.

R3-4.1 is the smallest truthful bridge. R3-4 received independent dual `PASS`,
isolated-Preview database/application desktop and genuine-390px proof, and
explicit founder acceptance on 2026-10-06 Pacific. The entry gate is therefore
satisfied. R3-4.1 must not change the frozen R3-4 accepted bytes or evidence.

## Frozen design

1. Existing `crm_proposal_version.v1` rows remain byte-for-byte unchanged and
   reviewable, but cannot receive an `accept_proposal` token.
2. `crm_proposal_version.v2` freezes an ordered offered package set. Its legacy
   singular package/estimate columns are null; `package_count` and
   `package_set_sha256` commit the complete ordered set.
3. Append-only `crm_proposal_version_packages` rows freeze organization,
   proposal version, opportunity, property, package, exact estimate run,
   display order, customer-visible title and scope, amount, currency, pricing
   basis, estimate hashes, scope hash and canonical association hash.
4. The parent display amount equals the sum of all association amounts; every
   currency matches; `content_snapshot.packages[]`, rendered bytes and the
   ordered association set must agree exactly.
5. A caller-bound publish command authorizes before lookup, locks the
   opportunity, proposal and packages in deterministic order, validates every
   current R3-3 binding, and inserts parent, associations, pointers, receipt,
   audit and outbox evidence atomically. Browser-provided prices and scopes are
   never authoritative.
6. Customer acceptance shows the full offered total and the selected-package
   subtotal. The immutable receipt commits the ordered selected association
   identifiers and hashes, copied amounts, subtotal, parent hashes,
   package-set hash and consent version.
7. One receipt closes acceptance for that version. Selected packages become
   accepted; unselected packages remain unchanged; any later offer for them
   requires a newly published version.
8. `accept_proposal` token issuance rejects v1, incomplete or mismatched sets,
   stale pointers, ineligible packages and any hash mismatch. Review/respond
   purposes remain governed by their own rules.

## Required proof

- v1 preservation and refusal of accept-purpose issuance;
- deterministic ordered set hashing and order-tamper rejection;
- cross-tenant, package, version and estimate substitution negatives;
- stale-member and concurrent publication with deadlock-safe lock ordering;
- exact parent total and per-package scope/amount/rendered correspondence;
- proper-subset, full-set, changed-retry and conflicting-receipt cases;
- atomic rollback across receipt/package/status/history/audit/outbox/token work;
- direct `UPDATE`, `DELETE` and `TRUNCATE` denial on immutable parent and
  association rows; and
- focused/full application, migration, PostgreSQL, independent, Preview,
  desktop/390px and founder gates.

## Execution-ready additive database contract

R3-4.1 must be a new migration after accepted R3-4. It must not edit or replay
`20261005000000_r3_4_immutable_proposal_versions.sql`.

1. Extend `crm_proposal_versions` with nullable `package_count` and
   `package_set_sha256`, then replace only the schema-version shape constraint:
   - v1 retains its current singular `work_package_id`, `estimate_run_id`,
     amount, currency, pricing basis and byte/hash rules; and
   - v2 requires singular package/estimate columns to be null, requires a
     positive package count and 64-character package-set hash, and retains the
     immutable parent content/rendered hashes and exact total.
2. Add `crm_proposal_version_packages` with an immutable UUID identity and
   organization/version/opportunity/property/package/estimate composite
   bindings; deterministic positive display position; customer-visible title
   and scope bytes plus their hashes; copied amount/currency/basis and estimate
   input/output hashes; and one canonical association hash. Enforce unique
   `(organization_id,proposal_version_id,display_position)` and unique
   `(organization_id,proposal_version_id,work_package_id)`.
3. Enable RLS, revoke direct access from public/anon/authenticated/service-role,
   and protect association `UPDATE`, `DELETE` and `TRUNCATE` with the same
   append-only boundary as proposal-version parents and receipts.
4. Add a service-role-only caller-bound package-set publish command. It must
   authorize before receipt/replay lookup; require distinct package IDs; lock
   the opportunity, proposal and packages in stable UUID order; load each exact
   selected R3-3 estimate; derive all displayed scope and prices server-side;
   build v2 snapshot/rendered bytes; and atomically insert the parent,
   associations, package pointers, command receipt, identifier-only audit and
   outbox event.
5. The command request hash must commit actor, organization, proposal,
   opportunity, property, ordered package IDs, every optimistic package token,
   template/schema versions and resulting authoritative bytes/hashes. Exact
   replay returns the existing version; changed replay fails.
6. The package-set hash must be computed over a canonical ordered JSON array of
   association identities and hashes, not database row serialization or locale
   text. Parent count, total and snapshot `packages[]` must equal the complete
   association set inside the same transaction.
7. Extend only caller-scoped metadata readers to return v1/v2 history and v2
   package summaries. Rendered content remains behind the server boundary.
   Existing v1 reader results and rows remain valid and byte-identical.

## Execution-ready application contract

1. Keep one Board/List dialog and eligibility rule. For v2, the operator may
   select one or more currently eligible site packages, but cannot submit
   prices, estimate IDs, scope bytes, totals, hashes or rendered content.
2. Before preparation, show every offered package's customer-visible name,
   scope, amount and the full offered total. Require explicit review; do not
   call this sent, accepted, signed, contracted, won or handed off.
3. Use one stable request key through timeout and retry. A deliberate new
   version requires a new key and fresh authoritative source read.
4. History identifies v1 singular and v2 package-set versions truthfully and
   shows immutable offered total/count without exposing internal economics.
5. Preserve the exact R3-4 route as a compatibility surface or extend it with
   a discriminated schema; never reinterpret a legacy v1 payload as v2.

## Entry and exit sequence

1. Entry requires exact R3-4 isolated-Preview database/application proof,
   authenticated desktop and genuine 390px evidence, and recorded founder
   acceptance.
2. Freeze the additive migration, contract tests, adversarial role matrix and
   two-session deterministic-lock race before application integration.
3. Implement the server composer/route, then shared Board/List workflow and
   focused accessibility tests.
4. Run the full fresh migration/application harness, independent Claude
   database/security review and independent Cursor operator/accessibility
   review.
5. Apply only a guarded exact artifact to isolated Preview, repeat desktop and
   genuine 390px operator proof, and obtain separate founder acceptance.
6. Only accepted R3-4.1 may unlock R3-5 token/session/receipt implementation.

The first coding commit must restate the exact accepted R3-4 base and prove the
new migration leaves every existing v1 row and rendered byte unchanged.

## Explicit exclusions

- modifying or repackaging the R3-4 remediation candidate under review;
- silently treating one package as the full approved C0 contract;
- customer-provided totals, scopes or package membership;
- R3-5 token or acceptance implementation before R3-4.1 acceptance; and
- Preview or production mutation under this decision packet.
