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
- Routes admin settings/branding writes through an authenticated admin server
  endpoint backed by `service_role`; the page never serializes the stored SMTP
  password into the browser. An explicit database-column allowlist prevents
  arbitrary/unknown-field writes, reset preserves the active SMTP transport,
  and the email test uses the stored server-side configuration.

## Caller map

| Routine | Legitimate callers | Decision |
|---|---|---|
| `get_user_usage_info(uuid)` | middleware; dashboard, billing, proposal and catalog server/client flows; template and print services | Caller-bound. Browser callers pass the signed-in user's ID. Server print access uses `service_role` for the proposal owner. |
| `get_user_current_usage(uuid)` | Internal use by the usage wrappers/legacy implementation | Caller-bound; no direct application call found. |
| `can_user_create_proposal(uuid)` | Internal legacy usage logic | Caller-bound; no direct application call found. |
| `increment_user_usage(uuid)` | proposal creation and `/api/usage/increment` | Caller-bound; both application paths pass the authenticated user's ID. |
| `can_user_access_template(uuid,uuid)` | design entitlement service and template hook | Caller-bound; application callers pass the signed-in user's ID. |
| `user_has_active_access(uuid)` | No TypeScript call found | Caller-bound for compatibility. |
| `get_user_accessible_templates(uuid)` | No TypeScript call found | Caller-bound for compatibility. |
| `is_admin()` | Profile/add-on RLS policies and entitlement triggers | Auth-bound by its body; no caller-supplied identity. Authenticated and service roles retain execution. |
| `update_template_usage(uuid)` | No TypeScript or migration trigger call found | Service-only maintenance mutation. |
| `handle_subscription_expiration()` | No TypeScript call found; intended background maintenance | Service-only. |
| `start_user_trial(uuid,text)` | No application RPC call found; Stripe sync writes subscription state directly | Service-only. |
| `handle_new_user()` | Auth user creation trigger | Trigger owner only; direct client execution revoked. |

Search covered `app/`, `features/`, `lib/`, `queries/`, `middleware.ts` and all
migrations on candidate `8cd8398` plus the focused correction. Any future caller
must be added here and to the role harness before its grant changes.

## Validation

- Jest: 58 suites, 512 tests and 5 snapshots passed.
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
