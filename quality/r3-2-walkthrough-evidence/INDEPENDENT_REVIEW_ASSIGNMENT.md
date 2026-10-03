# Independent review assignment — R3-2 walkthrough evidence

Review the exact Git commit and archive SHA-256 named in the packet manifest.
Perform read-only inspection and local/disposable verification only. Do not
access or mutate Supabase, Vercel, production, credentials, billing, email,
campaigns or any other hosted system.

Return `PASS` or `FAIL` with exact file/line evidence. A pass is limited to the
bounded R3-2 persisted walkthrough-evidence increment. It must not claim full
R3 Bid-to-Won completion or authorize a hosted apply.

## MVP release boundary

The shipped capability is deliberately small:

- an owner/admin or the walkthrough's assigned estimator can save bounded
  plain-text notes and explicitly mark the walkthrough complete;
- exact retries are harmless, changed retries and stale concurrency tokens
  fail, and completed evidence is final;
- scoped operators can read the saved evidence;
- audit/outbox evidence contains record identifiers only; and
- authenticated clients cannot directly mutate the evidence columns or inspect
  command receipts.

Photos, attachments, access/door/alarm credentials, outbound messages,
estimate/scenario linkage, immutable proposal versions, customer acceptance,
handoff, activation instrumentation and later roadmap stages are excluded.
Do not expand this first-build review into speculative enterprise controls.

## Required review scope

1. Compare the implementation to the R3-2 completion-map entry in
   `docs/product/platform-build/CURSOR_R3_1_IMPLEMENTATION_CONTRACT.md`, the
   project-wide release matrix, this directory's `README.md`, and the operating
   ledger. Confirm that the bounded increment does not shrink or falsely claim
   the remaining R3-3 through R3-8 work.
2. Review migration `20261003000000_r3_2_walkthrough_evidence.sql` for clean
   fresh-chain application, transactional failure, replay/idempotence and
   compatibility with the accepted R3-1 schema. Verify that it changes no
   proposal bytes, pricing, tracking, billing, attribution or unrelated CRM
   state.
3. Review every new table, column, constraint, trigger and `SECURITY DEFINER`
   routine. Require a fixed search path, authentication before receipt lookup,
   explicit organization/opportunity/walkthrough binding, owner/admin or exact
   assigned-estimator authorization, anonymous/cross-tenant denial and no IDOR.
4. Verify command semantics: identical key/payload replay returns the original
   result; changed-key payload reuse fails; a stale `updated_at` fails; the
   returned token equals the stored/receipt token; drafts remain editable with
   the returned token; completion is final; cancelled/no-show evidence cannot
   be added; and concurrent commands cannot silently overwrite one another.
5. Verify direct authenticated DML on evidence and direct receipt reads/writes
   are denied. Confirm the existing walkthrough read projection reveals notes
   only to managers and the assigned estimator, never viewers, unrelated
   estimators, anonymous callers or another organization.
6. Verify notes never appear in `organization_audit_log`, outbox payloads,
   logs, errors, route URLs or test snapshots. Dedicated event payloads must be
   ID-only and transactional.
7. Review the API route for authentication-before-data, exact URL identity
   binding, UUID/body/idempotency validation, safe 404/409/422/503 mapping and
   absence of browser-side service-role access or raw database errors.
8. Review Board and List behavior for create/read/update/complete parity,
   success reconciliation, retry/error behavior, completed-state finality,
   access-instruction warning, keyboard operation, initial focus, Escape/focus
   return, live announcements, 44px actions and genuine 390px reachability.
9. Confirm no photo upload, attachment retention, access-secret storage,
   email/SMS/calendar send, estimate creation, proposal mutation, acceptance or
   handoff behavior is shipped or claimed.
10. Independently run or inspect focused tests, the full Jest/type/migration
    gates, `git diff --check`, and the disposable 67-migration PostgreSQL 16
    harness with `CHECK_DEFINERS=1`. The committed R3-2 adversarial matrix must
    execute in the normal harness. Distinguish local evidence from hosted
    PostgreSQL 17 and genuine browser evidence that remain separate gates.

## Mandatory adversarial checks

- owner, admin, assigned estimator, unrelated estimator, viewer, anonymous and
  cross-organization access;
- known-versus-unknown identifier denial without existence leakage;
- direct column mutation and private receipt SELECT/INSERT/UPDATE/DELETE;
- identical replay, changed replay, stale token, draft-to-draft,
  draft-to-complete and completed-to-edit attempts;
- opportunity/walkthrough mismatch and reassigned-estimator behavior;
- simultaneous evidence writes against the same loaded token;
- note lengths 0, 1, 5000 and 5001, whitespace-only input and Unicode text;
- rollback after a forced failure, fresh-chain replay and applying the migration
  body twice in a disposable database;
- audit/outbox payload inspection proving the note text is absent; and
- desktop plus real 390px Board/List operation, error announcements and no
  clipped or unreachable action.

List missing tests or weak indirect evidence as findings. Classify only
authorization, tenant isolation, correctness/data loss, essential workflow and
genuinely blocking usability/accessibility defects as launch blockers for this
MVP. Record sensible resilience or broader-product improvements separately.
