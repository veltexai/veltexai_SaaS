# Claude assignment — R2 migration-029 recorded-history reconciliation

> **SUPERSEDED DESIGN:** Claude's review rejected the 029-only approach below.
> The accepted local candidate requires the exact post-040 function, executes
> exact committed migration 029 followed by exact committed migration 040 in
> one transaction, and proves that hardened function plus the complete 029 and
> 040 history rows remain byte-identical. `proposal_designs` is unrelated.

## Purpose

Independently audit and design the narrow repair for the isolated Supabase preview's second verified recorded-history/missing-schema inconsistency. Return an exact-evidence `PASS` or `FAIL` on the proposed approach. Do not implement against, connect to or mutate any hosted system.

## Authoritative state

- Integration branch: `codex/r2-integrated-read-adapter`
- Current evidence head: `cb88383`
- Isolated preview only: `ynzkwctwlssjcsjmahey`
- Production (strictly prohibited): `iwoaaljitifloolszxlu`
- Migration `030` reconciliation succeeded with source SHA-256 `ebae62829ea25098d8b3535f838660288e80e82c44fdeebe7314a8762fbf1d74`.
- Guarded replay steps 1–11 (`031`–`041`) succeeded.
- Step 12 (`20260908000000_enforce_proposal_design_entitlements.sql`) failed cleanly with PostgreSQL `42P01` because `public.template_tier_access` is absent. Its history row was not recorded.
- Read-only diagnosis confirms migration `029` is recorded exactly once while `public.proposal_templates`, `public.template_tier_access` and `public.user_template_preferences` are absent.

## Proposed bounded repair

1. Inventory the complete observable footprint of committed `supabase/migrations/029_proposal_templates_system.sql`:
   - tables `proposal_templates`, `template_tier_access`, `user_template_preferences`;
   - `proposals.template_id` and `user_branding_settings.template_version`;
   - all six indexes;
   - RLS on all three tables and all nine named policies;
   - functions `get_user_accessible_templates(uuid)` and `can_user_access_template(uuid,uuid)`;
   - two `updated_at` triggers;
   - four named default templates, seven tier-access rows and required grants.
2. Before generating a repair, require an exact preview fingerprint: migration `029` recorded once; all three tables, both added columns, six indexes, nine policies, two functions and two triggers absent; no conflicting template seed rows; application tables still empty; R2 still absent; replay history exactly through `041`; failed step-12 history absent.
3. Replay the exact committed migration-029 body only. Do not edit its SQL, synthesize migration history, or delete/rewrite the existing `029` row.
4. In the same transaction, prove the complete observable final state, including deterministic function behavior where safe, expected seed cardinalities/relationships, RLS, policies, grants and triggers.
5. Prove the entire existing `029` history row is byte-for-byte unchanged before and after success and after every refusal.
6. Extend the disposable PostgreSQL gate to reproduce both contradictions in chronological order: recorded `029` without its schema, recorded `030` without its schema, then the 23 guarded forward migrations. Compare the final result with a direct ordered application of the committed migrations.
7. After a local PASS and a separately reviewed exact candidate, execute only the new `029` reconciliation on the isolated preview, regenerate/verify artifacts, and resume at step 12. Never rerun steps 1–11.

## Review questions

1. Is exact replay of committed migration `029` safe under the proposed absence fingerprint after steps `031`–`041` have already succeeded?
2. Can any later successful step have created or altered a migration-029 object, column, seed or privilege that makes an all-absent guard insufficient or replay unsafe?
3. Are all objects, policies, triggers, functions, grants and seed relationships listed above complete and correctly counted?
4. Which assertions must be behavioral rather than existence/count checks?
5. What continue-on-error, transaction, rerun, partial-state and history-row mutation tests are mandatory?
6. Does the repair create any entitlement, authorization, RLS or SECURITY DEFINER regression?

## Required response

Return:

- `PASS` or `FAIL` for the proposed plan;
- exact evidence and commands used;
- missing footprint items or unsafe assumptions;
- mandatory corrections ranked Blocker/High/Medium/Low;
- the minimum safe implementation contract for Codex.

Stop after the review. Do not touch Supabase, production, credentials, deployments, campaigns, paid services, external users or messages.
