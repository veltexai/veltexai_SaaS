# Veltex platform build coordination plan

Status: ACTIVE COORDINATION PLAN

Authoritative integration worktree: `/private/tmp/veltex-r2-integration`

Current implementation candidate: `d128518` on
`codex/r2-integrated-read-adapter`. Commit `35daa80` is a ledger-only R3
no-duplication checkpoint and does not change the R2 candidate. Neither commit
is a production release approval.

## Ownership

- Codex is integration owner. It owns migrations, RLS, shared domain types, server APIs, integration tests, the release ledger and final merges.
- Claude is an independent read-only architecture and security reviewer. It must not edit the implementation branch or declare deployment success.
- Cursor owns a bounded frontend-only worktree. It must not create migrations, edit RLS, alter shared domain contracts or touch deployment configuration.

## Current wave boundaries

### Codex — R2 organization and tenancy

Organizations, memberships, owner/admin/estimator/viewer roles, tenant boundaries, audit trail and event outbox/inbox foundation, backward-compatible migration, rollback, role matrix and tests.

### Claude — independent R2 review

Review the authoritative ledger, Prompt 2 architecture decisions and the exact R2 candidate. Focus on tenant escape, privilege escalation, invitation lifecycle, active-organization selection, service-role boundaries, audit immutability, event idempotency, migration safety and rollback. Return findings with severity and exact evidence; do not implement fixes.

### Cursor — organization/team UI shell only

The historical shell is preserved on `cursor/r2-team-ui-shell`; do not merge or
rebase it as a unit. Its accepted pieces are already represented in the
authoritative R2 integration candidate. Cursor's next assignment, after R2
database acceptance freezes the server contract, is limited to active-
membership type alignment, responsive/accessibility regression hardening and
warning-clean tests from the accepted R2 head. No migrations, RLS, backend
routes, production configuration, deployment, dependencies or external calls.

## Integration gates

1. No shared file may be edited by two implementation lanes without Codex reassignment.
2. Cursor output is not merged until Codex freezes the corresponding server contract.
3. Claude reviews exact commit ranges and never substitutes historical findings for current evidence.
4. Full tests, TypeScript, production build, migration execution, role matrix and responsive checks are mandatory before release acceptance.
5. Production deployment, paid actions, credentials and external publication retain their separate action gates.
6. Every completion, failure, rejection and superseded attempt is recorded in `docs/OPERATING_STATE_AND_DECISION_LEDGER.md`.

## Next-wave rule

Customer/property and walkthrough work may begin only after the organization identifiers, membership roles and authorization contract are frozen. Invoicing follows accepted contracts and financial ownership; it must not be implemented against the legacy single-user model.

The seven-stage dependency and release gates are canonical in
`SEVEN_STAGE_RELEASE_GATE_MATRIX.md`. A downstream lane may prepare read-only
research, contracts and tests, but it may not create implementation commits
until that matrix's entry gate is satisfied.

## Cross-cutting brand-validation track

The founder-approved brand architecture is governed by
`VELTEX_BRAND_ARCHITECTURE_AND_VALIDATION_PLAN.md`. It may inventory references,
prepare shared message constants and design a bounded cleaning-owner test in
parallel with product stages. It must not bulk-rename the application, change
domains/accounts/legal identifiers, launch research, spend incentives, mutate
campaigns or deploy production variants without the named gates. Product-stage
claims remain authoritative: brand work cannot advertise a capability before
that capability passes its own release gate.
