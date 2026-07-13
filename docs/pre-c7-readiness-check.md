# Pre-C7 Readiness Check

## Summary

This document records the mandatory readiness check before starting C7 activation tracking.

C7 was not built. No migrations were created. No runtime quick proposal behavior was changed.

## Dependency Status

`node_modules` exists:

```text
node_modules: exists
```

`node_modules/.bin` is missing:

```text
node_modules/.bin: missing
```

`pnpm` itself is available:

```text
pnpm --version
11.7.0
```

However, because `node_modules/.bin` is missing, the project dependencies are not installed in a usable local state for lint, TypeScript, Jest, or build commands.

Previous offline `pnpm` attempts in this workspace entered dependency verification/install and attempted to fetch from:

```text
registry.npmjs.org
```

Those attempts failed because network access is restricted, with errors like:

```text
ENOTFOUND registry.npmjs.org
```

## Test Command Results

The required commands were not run in this environment because dependencies are not locally available and prior `pnpm` execution attempted a registry fetch.

Commands still required in a dependency-ready local or CI environment:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec jest features/proposals/quick
pnpm build
```

Readiness impact:

- Local automated verification is blocked.
- This should be run in a different local environment or CI environment where dependencies are already installed or network access to the package registry is available.

## Supabase Migration Inspection

Migration directory inspected:

```text
supabase/migrations/
```

The highest sequential migration number is:

```text
036_add_company_profile_fields.sql
```

There is also a timestamp-style migration that sorts after all sequential migrations:

```text
20250901194222_add_user_roles.sql
```

Therefore, the highest overall migration identifier is:

```text
20250901194222
```

## Recommended Activation Events Migration Number

Because Supabase applies migrations in filename order and the repository already contains a timestamp-style migration, the next activation events migration should use a timestamp-style identifier greater than:

```text
20250901194222
```

Recommended C7 migration naming pattern:

```text
20260708HHMMSS_activation_events.sql
```

Use the actual current timestamp at migration creation time.

Important note:

```text
037_activation_events.sql
```

is unused as a sequential number, but it would sort before `20250901194222_add_user_roles.sql`. To avoid ordering ambiguity, C7 should prefer a timestamp-style migration greater than the current highest migration identifier.

## Proposal Events Status

Search results found one runtime code reference:

```text
app/api/proposals/[id]/send/route.ts
```

That route inserts into:

```text
proposal_events
```

No `proposal_events` table migration was found in:

```text
supabase/migrations/
```

No generated `proposal_events` type was found in:

```text
types/database.ts
```

Related tracking tables that do exist include:

- `proposal_tracking`
- `proposal_views`
- `proposal_downloads`
- `proposal_click_tracking`

Readiness conclusion:

- `proposal_events` appears to be only a code reference in this repo, not a confirmed migrated table/type.
- Do not touch `proposal_events` during C7 unless explicitly approved.
- C7 should use a new dedicated `activation_events` table if approved, rather than relying on `proposal_events`.

## Activation Events Status

No runtime `activation_events` implementation exists yet.

References to `activation_events` are currently documentation/planning references and quick-flow safety tests only.

No migration was created during this readiness check.

## C7 Readiness Verdict

Ready for C7 implementation:

```text
No
```

Reason:

- Code and migration inspection is complete.
- The correct migration naming approach is identified.
- `proposal_events` status is clarified.
- However, mandatory lint/typecheck/Jest/build verification is blocked because dependencies are not installed locally and network access is restricted.

## Remaining Blockers

Before C7 starts:

1. Run the required commands in a dependency-ready local or CI environment:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec jest features/proposals/quick
pnpm build
```

2. Confirm all checks pass.

3. Use a timestamp-style migration filename greater than `20250901194222` for `activation_events`.

4. Avoid `proposal_events` unless a real table/migration is confirmed outside this repo or explicitly approved.

## Codex Proceed-to-C7 Recommendation

Codex should not proceed to C7 yet in this environment.

Codex can proceed to C7 after:

- Required automated checks pass in a dependency-ready environment.
- Product/engineering confirms the timestamp-style migration naming approach.
- Product/engineering confirms C7 should create a dedicated `activation_events` table and avoid `proposal_events`.
