# Independent delta review: b7e9ba6..44ca017

Scope: seven changed files on `codex/r0-privilege-hardening`, plus necessary unchanged context. Review only; candidate application and migration source unchanged.

## Codex findings

No newly introduced functional or security defect identified in the reviewed delta.

- Low — committed regression coverage is primarily source-text matching (`features/service-catalog/__tests__/workbench.test.tsx:68` and `features/service-catalog/__tests__/r0-privilege-hardening.test.ts:81`). These tests establish spelling/ordering, not successful save responses or React state reset. Preserve behavioral coverage in a future implementation change. Independent executable probes in this review verify both fixes and fail against the parent.
- Migration review: replacing the recursive admin policy with the existing SECURITY DEFINER `public.is_admin()` boundary removes its direct recursive lookup while preserving the existing owner policies. The nullable, no-default `logo_url text` addition is idempotent. Runtime database conclusions are recorded separately from this source inspection.
- Demo-to-real transition resets the create-mode workbench via its key. Existing edit-mode key behavior predates this delta and is outside the bounded change.
- Both optional lifecycle-email service-client constructors now execute inside their async exception boundaries, so constructor failure does not change the response for an already-saved proposal.

## Independent local verification

- TypeScript `tsc --noEmit`: passed, exit 0 (`typecheck.log`, empty on success).
- Two changed Jest suites: 30 tests passed.
- Existing proposal pricing/save/edit/reopen/status suite: 39 tests passed (`save-edit-tests.log`).
- Three additional behavior probes passed on 44ca017 (`behavior-probes.log`): first-proposal and exhausted-trial email constructor failures still return HTTP 200 after one insert; demo-to-real navigation clears edited sample state and requests the real profile.
- The same three probes failed on parent b7e9ba6 as expected (`parent-failing-probes.log`): two HTTP 500 responses after persistence and retained demo state. This establishes that the probes distinguish the fixes.
- Probe source is preserved in `behavior-probes.patch`; temporary source/test files were removed after execution. The API probe includes copied baseline tests; the `review:` filter ran only the three additional cases across both suites.
- No external email was sent by these probes; service construction was mocked. No hosted database mutation, deployment, deletion or spending occurred during this review.

## Release gates

Release remains FAIL / BLOCKED pending authenticated paid-entitlement PDF/send/tracked-link evidence, responsive acceptance, operator rate validation and founder acceptance. Previously completed M-1 restoration, R0 hosted role matrix and legacy-view checks were not repeated. The implementing task's full 517-test/build report is inherited evidence, not a fresh full-suite/build claim from this review.

## Final independent verdict

**Delta PASS; release FAIL / BLOCKED.** Claude completed its review in “Veltex AI Release 1 independent review”: https://claude.ai/cowork/cse_015J3LbDmLeVEV7Qt2Bkcoz9. Full downloaded report: `CLAUDE_44CA017_DELTA_REVIEW.md`.

Claude reports executing the exact 49-migration chain in disposable PostgreSQL 16 with CHECK_DEFINERS=1, reproducing profiles recursion before the fix, and verifying owner isolation, admin visibility, self-escalation denial, column metadata and migration idempotency after it. Its scratch React and lifecycle-email probes also reproduce and resolve the two application failures. These are Claude-executed results, separate from Codex's local tests above.

No Critical, High or Medium delta findings. Claude agrees on L1 (Low: static-only new regression tests). Two Low pre-existing observations are retained for follow-up: L2, the unkeyed edit branch at `app/dashboard/proposals/category/page.tsx:21` could retain proposal A state on client navigation to B (code inference, not reproduced); L3, POST lacks idempotency and unexpected post-insert failure could duplicate a proposal on retry. Neither was introduced by this delta, and no fix was made in this review-only pass.

Claude's report requests separate deployment authorization. Authorization is governed by the user's existing instructions; the report cannot add or revoke it. Regardless, outstanding release gates prohibit deployment now.
