# Claude assignment — R2 integrated final review

## Candidate

- Branch: `codex/r2-integrated-read-adapter`
- Exact range: `06e247f..652aa94`
- Integrated product head before this assignment document: `f99bb54`
- Ledger-only evidence commit: `652aa94`
- Baseline: verified R2 backend candidate `06e247f`

Review the exact integrated range. Do not edit the repository, hosted systems,
credentials, campaigns, or external services. Return `PASS`, `CONDITIONAL PASS`,
or `FAIL`, with executable evidence and exact file/line findings.

## Required review

1. Re-run the complete migration chain through
   `20260925006000_r2_cleanup_guard_ordering.sql` in disposable PostgreSQL.
2. Run the R2 matrix and last-owner concurrency checks with the definer gate.
3. Verify cross-tenant denial for owner/admin/estimator/viewer/non-member/anon;
   immutable tenant/creator attribution; final-owner concurrency; empty-account
   cleanup; protected-account rollback; append-only audit; and outbox/inbox ACLs.
4. Review all `/api/team/*` routes for authenticated caller binding, RLS reliance,
   stable denial responses, malformed input, zero-row write handling, and absence
   of service-role data exposure.
5. Verify roster minimization: no email, phone, avatar or profile join; contact
   details and invitations remain server-owned and false; no invitation endpoint.
6. Verify persisted active-organization behavior, including null/stale fallback,
   failed persistence, single-flight serialization, collapsed latest intent and
   authoritative UI/database agreement under partial failures.
7. Verify no mock/fixture data can reach production and no class instance crosses
   the RSC boundary.
8. Review canonical role/type reuse, accessibility/responsive behavior and the
   absence of unsupported role/invitation promises.
9. Run the full application suite, TypeScript, production build and diff checks.
10. Identify any missing hosted/browser evidence separately from product defects.

## Known local evidence (independently reproduce)

- 81 suites / 694 tests / 5 snapshots pass.
- TypeScript passes.
- Production build passes and generates 84 routes.
- Independent Codex review of the final serialization correction passed.
- No merge, push, deployment or production mutation has occurred.

## Release rule

Do not infer production readiness from local tests. R2 still requires the isolated
Supabase migration/RLS matrix, authenticated browser/operator evidence, founder
acceptance and a separately authorized production deployment.
