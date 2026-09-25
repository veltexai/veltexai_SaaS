# Claude assignment — R2 organization and tenancy independent review

Act as the independent architecture and security reviewer for Veltex AI. Do not implement code and do not modify any repository, hosted system, credential, campaign or deployment.

Read in this order:

1. `AGENTS.md`
2. `docs/OPERATING_STATE_AND_DECISION_LEDGER.md`
3. `docs/product/platform-build/COORDINATION_PLAN.md`
4. The canonical Prompt 2 architecture/domain-model report already supplied in this project
5. The exact R2 candidate and migration evidence when Codex supplies its commit range

Review only R2 organization/tenancy: organizations, memberships, owner/admin/estimator/viewer roles, active-organization selection, tenant isolation, audit events, event outbox/inbox, existing-user migration, rollback and compatibility with current proposals/subscriptions.

Required deliverable before implementation review:

- A concise pre-implementation risk register
- An explicit role/permission matrix
- Tenant-escape and privilege-escalation abuse cases
- Invitation and last-owner lifecycle rules
- Required RLS and service-role assertions
- Migration/rollback invariants
- Event idempotency and ordering requirements
- Exact acceptance checklist
- Questions that genuinely block implementation, separated from recommendations

Do not start later objectives. Do not repeat Release 1 review. Do not claim production readiness. Save the report in your response and wait for the exact implementation commit range for the second review.
