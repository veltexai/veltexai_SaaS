# R3-4.1 immutable package-set commitment decision

Status: **DECISION PACKET PREPARED / IMPLEMENTATION DEPENDENCY-BLOCKED**

## Purpose

R3-4 currently freezes one work package and one R3-3 estimate in each immutable
proposal version. R3-5 C0 requires a customer to accept a non-empty subset of
the packages offered by one exact version. Restricting
`accepted_package_ids` to one package would reduce the approved contract and is
rejected.

R3-4.1 is the smallest truthful bridge. It starts only after the current R3-4
remediation receives independent PASS, isolated-Preview proof and founder
acceptance. It must not change the frozen R3-4 re-review artifact.

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

## Explicit exclusions

- modifying or repackaging the R3-4 remediation candidate under review;
- silently treating one package as the full approved C0 contract;
- customer-provided totals, scopes or package membership;
- R3-5 token or acceptance implementation before R3-4.1 acceptance; and
- Preview or production mutation under this decision packet.
