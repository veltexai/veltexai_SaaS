# R3-2 persisted walkthrough evidence

Status: **LOCAL CANDIDATE / DATABASE RUNTIME VERIFIED**

This is the second bounded increment of the approved R3 Bid-to-Won stage. It
starts only after founder acceptance of R3-1 and reuses the accepted CRM,
organization, membership, audit and outbox foundations.

## MVP contract

- Persist bounded plain-text walkthrough notes on the existing walkthrough.
- Let an owner/admin or the assigned estimator save notes and explicitly mark
  the walkthrough complete.
- Make command replay idempotent and bind every mutation to the walkthrough's
  loaded `updated_at` value.
- Keep completed evidence readable to the same scoped CRM operators.
- Emit audit/outbox evidence containing record identifiers only, never note
  contents.
- Deny direct client writes to the evidence fields and receipt table.

## Explicit exclusions

- Photos and attachments wait for privacy, retention and storage review.
- Access instructions are not accepted in this field.
- No email, SMS, calendar invite or customer-facing publication.
- No estimate, proposal-version, acceptance or handoff behavior from R3-3+
  is pulled into this increment.

## Required release evidence

1. Fresh-chain migration and idempotent rerun.
2. Owner/admin and assigned-estimator success; viewer, unrelated estimator,
   anonymous and cross-tenant denial.
3. Exact replay success, changed replay refusal and stale-token refusal.
4. Completed evidence cannot be edited or reopened.
5. Receipt privacy and ID-only audit/outbox payloads.
6. API/schema tests, accessible desktop/390 px workflow, full regression,
   independent review, isolated-preview acceptance and founder acceptance.

## Local verification

- Focused schema/API/UI tests pass 59 cases; the full repository suite passes
  106 suites / 880 tests / five snapshots.
- TypeScript, the 67-version migration validator and diff hygiene pass.
- A fresh disposable PostgreSQL 16 cluster applied all 67 migrations with
  `CHECK_DEFINERS=1`. The R3-1 and R3-2 adversarial role matrices, full catalog
  assertions, injection/dirty/rerun checks and the 40-way concurrency test all
  passed. The cluster was stopped after verification.
- The strengthened R3-2 matrix additionally executes admin and assigned-
  estimator writes, stale-token refusal, draft-to-complete progression,
  opportunity/walkthrough mismatch refusal, anonymous denial, all four receipt
  DML denials, maximum-length notes and audit/outbox note-privacy checks.
- Independent review, genuine responsive preview acceptance and founder
  acceptance remain required before this increment is complete. No hosted or
  production state was changed by the local verification.

The exact independent-review scope is frozen in
`INDEPENDENT_REVIEW_ASSIGNMENT.md`. Preparing that packet does not authorize
uploading it or accessing a hosted environment.

`build-preview-apply.mjs` deterministically produces a single-transaction,
source-hash-bound preview artifact. It requires the exact 66-version predecessor
history and absent R3-2 schema; preserves count and canonical content hashes for
every existing CRM table; applies one exact migration body; checks the receipt
table, routines, trigger, privileges, columns and 67th history row; and only then
commits. `npm run r3-2:test-preview-artifact` pins its deterministic structure.
The current artifact was executed successfully against an exact disposable
66-migration PostgreSQL 16 state. This local proof does not authorize running it
on the isolated preview.
