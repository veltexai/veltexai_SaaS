# Independent review assignment — R3-1 CRM foundation

Review the exact Git commit named in the packet manifest. Perform read-only
inspection and local/disposable verification only. Do not access or mutate
Supabase, Vercel, production, credentials, billing, email, campaigns, or any
other hosted system.

Return `PASS` or `FAIL` with exact file/line evidence. A pass is limited to the
bounded R3-1 foundation and must not claim full R3 completion.

## Required review scope

1. Compare implementation to
   `docs/product/platform-build/CURSOR_R3_1_IMPLEMENTATION_CONTRACT.md`, including
   every R3-1 acceptance criterion and the explicit R3-2 through R3-8 deferrals.
2. Verify the migration is additive, transactional and replay-safe; preserves
   proposal content/pricing/tracking, marketing attribution, billing, 100D and
   invitation behavior; and seeds both configurable starter pipelines plus all
   eleven canonical categories.
3. Review every tenant boundary and `SECURITY DEFINER` routine for fixed search
   path, caller binding, explicit organization binding, role/assignment scope,
   cross-tenant denial, anonymous denial, safe service-role behavior and no IDOR.
4. Verify viewer projections contain no customer/contact PII, pricing, property,
   owner or estimator identifiers; verify estimators receive only assigned,
   owned or created opportunities and correspondingly scoped customer/property
   choices.
5. Verify command idempotency and concurrency behavior for quick-add, conversion,
   direct opportunities, stage moves, tasks, assignment, reactivation,
   qualification, walkthroughs and site packages. Check append-only stage history
   and exact terminal/gate semantics.
6. Verify semantic audit/outbox events are transactional and ID-only; no customer
   fields, pricing, notes, email, phone or addresses may enter event payloads.
7. Review all API routes for authentication-before-data, explicit org parameters,
   validation, safe error mapping and absence of browser service-role bypass.
8. Review desktop and 390px UI semantics: quick-add, explicit duplicate choice,
   conversion confirmation without retyping, Board/List parity, keyboard stage
   control, terminal confirmation, 44px targets, live announcements and viewer
   read-only behavior.
9. Confirm no AI, autonomous mutation, outbound email/SMS, customer acceptance,
   signature, completed handoff, import, migration or other later-stage behavior
   is falsely shipped or claimed.
10. Independently run or inspect the full Jest/type/migration/diff gates, the
    65-migration disposable database harness with `CHECK_DEFINERS=1`, and the
    rollback-only performance benchmark. Distinguish local evidence from hosted
    PostgreSQL 17/operator evidence that remains pending.

## Mandatory adversarial checks

- owner/admin/estimator/viewer/anonymous and cross-organization access;
- unrelated-estimator reads and mutations;
- replay with identical and changed command payloads;
- invalid stage, pipeline segment, member, property and proposal references;
- concurrent stage/task/assignment/walkthrough commands;
- viewer response key leakage and estimator picker leakage;
- outbox payload leakage;
- direct attempts to mutate append-only history or private receipt tables;
- migration failure rollback and proposal/attribution preservation;
- responsive/accessibility claims not supported by genuine evidence.

List any missing test or weak indirect evidence as a finding. Do not infer hosted
or founder acceptance from local green tests.
