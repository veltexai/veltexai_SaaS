# Cursor assignment — R2 organization and team UI shell

You are the bounded frontend implementation lane for Veltex AI. Codex remains integration owner.

Safety and isolation first:

1. Read `AGENTS.md`, `docs/OPERATING_STATE_AND_DECISION_LEDGER.md` and `docs/product/platform-build/COORDINATION_PLAN.md` completely.
2. The current Cursor workspace may show `deploy/100d-pilot`. Do not edit that branch.
3. Create a separate worktree and branch named `cursor/r2-team-ui-shell` from exact commit `fe8b1d1`.
4. Stop and report if that base cannot be verified exactly.

Scope:

- Responsive organization/team settings shell
- Member list and empty/loading/error states
- Invite-member dialog UI
- Role labels for owner/admin/estimator/viewer
- Accessible organization switcher shell
- Mobile and desktop behavior
- Component tests and accessibility assertions
- A written frontend-to-server contract request for Codex

Boundaries:

- Use mocked local adapters. Do not invent or call live endpoints.
- Do not create migrations, edit Supabase policies/RLS, edit backend routes, modify shared domain contracts, add dependencies, change environment variables, touch deployment configuration, spend credits or deploy.
- Keep new implementation inside a clearly bounded R2 organization/team feature area wherever possible.
- Do not start customers, properties, walkthroughs, pipeline, contracts, invoicing or later objectives.
- Preserve unrelated working-tree changes.

Verification:

- Run focused tests, TypeScript and applicable lint/build checks.
- Return the worktree path, branch, commit hash, changed-file list, test evidence, screenshots or responsive evidence, open contract questions and any blocker.
- Do not merge your branch.
