# Release 1 R0 privilege hardening

Date: 2026-09-24 Pacific  
Base: `787d113`  
Branch: `codex/r0-privilege-hardening`

## Scope and no-duplication boundary

This candidate builds on the independently verified Release 1 candidate. It does
not recreate its catalog, pricing, proposal, tracking-token, owner-RLS or layout
work. The existing token-resolving proposal RPCs remain unchanged. This change
closes only the residual R3-3 and P11-1 paths plus sensitive prompt logging.

## Changes

- Removes browser roles' table access to `system_settings`; only `service_role`
  can read or mutate the SMTP configuration.
- Moves the last effective identity-parameter routine implementations behind
  ungranted internal names and exposes caller-bound wrappers. Authenticated
  callers can request only their own user UUID; trusted server calls remain
  available to `service_role`.
- Restricts background/template mutation and subscription-expiration routines
  to `service_role`. Keeps `is_admin()` authenticated because RLS policies use
  it, with a fixed search path and no anonymous grant.
- Sets fixed `pg_catalog, public` search paths for every affected definer.
- Removes full AI email prompts from server logs and avoids logging complete
  database error objects during email-configuration lookup.
- Extends the role harness for secret unreadability, cross-user RPC denial,
  own-user access and service-role access. Includes an emergency rollback that
  deliberately does not restore the unsafe `system_settings` grants.

## Validation

- Jest: 58 suites, 511 tests and 5 snapshots passed.
- TypeScript: passed.
- Shell syntax and `git diff --check`: passed.
- Production build: passed after a network-enabled rerun; the first sandboxed
  attempt failed only because it could not resolve Google Fonts.
- Database harness: not executable in this Codex environment because PostgreSQL
  client/server binaries are unavailable. The prior candidate's 45-migration
  chain was independently executed by Claude; this new migration requires the
  next isolated PostgreSQL/Supabase review and may not be represented as run.

## Hosted containment

Production M-0 confirmed a populated SMTP credential was readable to signed-in
clients. The broad read policy and browser-role table grants were removed on
2026-09-24 and the result re-queried: anonymous and authenticated SELECT are
false and no authenticated SELECT policy remains. The credential value was
never selected or displayed. Rotation is pending Google account passkey
authentication; the existing provider is Gmail SMTP for the configured Veltex
sender.

## Remaining gates

1. Rotate the previously exposed Gmail app password and verify SMTP transport.
2. Execute the new migration and full `CHECK_DEFINERS=1` harness on an isolated
   target, including rollback rehearsal.
3. Claude independent review of this candidate.
4. Authenticated staging for proposal, email and hosted PDF workflows.
5. Operator validation and founder acceptance.
6. Separate production-deployment authorization.
