# R3-5 C0.4 independent review assignment

Review only the exact commit and complete-history bundle identified in the
packet manifest. This is an adversarial, read-only gate. Do not edit code,
access hosted services, use credentials, deploy, publish, spend money, or
contact customers or other external humans.

## Dependency and scope

C0.3 is independently accepted at
`ab9de9439cf7cbb418171fc59e1fb59f5edb411a`. Review the descendant C0.4 delta
that adds only:

- the additive customer receipt/eligibility and operator summary projection;
- the opaque-session public acceptance route;
- explicit customer package selection, consent, final review and printable
  immutable receipt UI;
- caller-scoped Board/List acceptance summaries and identifier-only in-app
  notice; and
- focused/static/PostgreSQL evidence for those surfaces.

Public acceptance remains disabled in hosted environments because this commit
is local only. Production is excluded.

## Required adversarial checks

1. Confirm the room projection enables acceptance only for a live eligible
   `accept_proposal` session and rehydrates only that session's immutable
   receipt after the success-time token revocation.
2. Challenge expired, revoked, designated-approver, disabled-eligibility,
   deleted, terminal, superseded and cross-tenant/version paths for oracle or
   stale-success behavior.
3. Confirm the public route validates the opaque session and bounded request,
   preserves exact-retry semantics, performs exactly one atomic command call,
   emits uniform failures and never logs or returns secrets/signer data.
4. Confirm the UI has unchecked defaults, stored display ordering, selected
   subtotal plus full offered total, explicit non-signature/identity copy,
   final review, recoverable retry, changed-payload key rotation, 44px targets,
   distinct live regions, overflow resistance and server-derived refresh-safe
   receipts.
5. Confirm Board and List display the same caller-scoped result, owner/admin and
   assigned-estimator visibility is preserved, unassigned estimators receive no
   existence oracle, and viewers cannot receive totals/currency.
6. Confirm no customer projection exposes signer-entered name/email and no
   operator projection exposes token, session, consent text or signer fields.
7. Re-run or inspect the fresh 77-migration PostgreSQL proof, static contract,
   focused/full Jest, TypeScript, production build and diff-hygiene evidence.
8. Inspect grants, fixed search paths, SECURITY DEFINER boundaries, nullable
   aggregation, JSON casing and route/UI contracts for discrepancies that tests
   may miss.

## Verdict format

Return one of `PASS`, `PASS WITH NON-BLOCKING NOTES`, or `FAIL`. For every
blocking issue, cite the exact file/line or reproducible command and explain
the violated C0.4 invariant. Distinguish source defects from evidence-depth
gaps and execution-context limitations.
