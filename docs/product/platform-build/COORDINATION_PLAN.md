# Veltex platform build coordination plan

Status: ACTIVE COORDINATION PLAN

Authoritative implementation base: `fe8b1d1` on `codex/r0-privilege-hardening`

## Ownership

- Codex is integration owner. It owns migrations, RLS, shared domain types, server APIs, integration tests, the release ledger and final merges.
- Claude is an independent read-only architecture and security reviewer. It must not edit the implementation branch or declare deployment success.
- Cursor owns a bounded frontend-only worktree. It must not create migrations, edit RLS, alter shared domain contracts or touch deployment configuration.

## Wave 1 boundaries

### Codex — R2 organization and tenancy

Organizations, memberships, owner/admin/estimator/viewer roles, tenant boundaries, audit trail and event outbox/inbox foundation, backward-compatible migration, rollback, role matrix and tests.

### Claude — independent R2 review

Review the authoritative ledger, Prompt 2 architecture decisions and the exact R2 candidate. Focus on tenant escape, privilege escalation, invitation lifecycle, active-organization selection, service-role boundaries, audit immutability, event idempotency, migration safety and rollback. Return findings with severity and exact evidence; do not implement fixes.

### Cursor — organization/team UI shell only

Create a separate worktree and branch `cursor/r2-team-ui-shell` from `fe8b1d1`. Build responsive, accessible organization/team interfaces using local mocked adapters and interfaces owned within the bounded feature folder. Do not assume database columns or APIs; document required contracts for Codex. No migrations, RLS, backend routes, production configuration, deployment, dependencies or external calls.

## Integration gates

1. No shared file may be edited by two implementation lanes without Codex reassignment.
2. Cursor output is not merged until Codex freezes the corresponding server contract.
3. Claude reviews exact commit ranges and never substitutes historical findings for current evidence.
4. Full tests, TypeScript, production build, migration execution, role matrix and responsive checks are mandatory before release acceptance.
5. Production deployment, paid actions, credentials and external publication retain their separate action gates.
6. Every completion, failure, rejection and superseded attempt is recorded in `docs/OPERATING_STATE_AND_DECISION_LEDGER.md`.

## Next-wave rule

Customer/property and walkthrough work may begin only after the organization identifiers, membership roles and authorization contract are frozen. Invoicing follows accepted contracts and financial ownership; it must not be implemented against the legacy single-user model.
