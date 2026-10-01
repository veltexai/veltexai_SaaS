# R2 production release packet

Status: **PREPARED / NOT AUTHORIZED / NOT DEPLOYED**

Date: 2026-09-30 Pacific

This packet is the production decision boundary for the accepted R2 organization,
tenancy, canonical tracked-PDF and tracked-link revocation work. It does not
authorize a production database change, Vercel deployment, credential action,
email, campaign mutation or preview deletion.

## Release identity

| Item | Exact value |
|---|---|
| Accepted branch | `codex/r2-fresh-preview-guard` |
| Accepted ledger head | `509ea97` |
| Last application/security change | `a18e6e3` (`add secure tracked link revocation`) |
| Canonical tracked-PDF repair | `0e9a991` |
| Recorded production application base | `a4deb7c0d0f50ae03dfd1ff1981833fa5f996cd1` |
| Production Supabase project | `iwoaaljitifloolszxlu` |
| Accepted isolated preview | `ynzkwctwlssjcsjmahey` |
| Production Vercel project | `veltex-services-veliz` (legacy name; owns `www.veltexai.com`) |
| Separately protected pilot | `veltex-ai-100d-pilot` — exclude from this release |

The deployable Git object is the exact accepted branch head after the final
release-only documentation commit. Because this branch is cumulative from the
recorded production base, it contains Release 1, R0, location-pricing, R2,
tracked-PDF and link-revocation changes. Production promotion must therefore be
treated as one cumulative release; do not cherry-pick only the final R2
migrations or assume the live migration history from an earlier inspection.

## Accepted evidence

- 86 Jest suites / 721 tests / five snapshots passed for the accepted R2
  revocation candidate.
- TypeScript and the production Next.js build passed.
- The guarded disposable PostgreSQL run applied all 61 migrations and passed
  owner/role, H1 privileged-function, injection, concurrency and revocation
  lifecycle checks.
- Independent final review returned PASS.
- Isolated preview `ynzkwctwlssjcsjmahey` contains exact migrations through
  `20260925010000`, with the recorded source hashes and 61-row history.
- Authenticated owner UI, canonical tracked PDF, public tracked page, paid
  entitlement, immutable counters, one-event audit behavior and 390x844
  responsive presentation passed in the isolated preview.
- The approved preview link revoke returns 404 and leaves its counters at eight
  views and six downloads.
- The temporary synthetic preview password was replaced with an unknown random
  value that was never returned or stored.

The authoritative chronology and exact hosted evidence remain in
`docs/OPERATING_STATE_AND_DECISION_LEDGER.md`.

## Deliberately deferred scope

- Team invitations remain fail-closed. R2 exposes organization/team reads and
  roles, not an unreviewed invitation or seat-billing workflow.
- U8 hosted wake/queue delivery remains open and is not required for R2. Do not
  enable `pg_cron`, `pgmq`, QStash or Inngest during this release.
- R3 Bid-to-Won, onboarding/import, native invoicing/payments, scheduling/field
  work, the expanded customer portal/QA system and ordinary-specialty packs are
  later stages and are not silently included here.
- The preview Google OAuth callback mismatch is not an R2 product defect and
  does not justify changing the production OAuth client during this release.

## Production go/no-go gates

Every item below must be recorded as PASS before the production mutation window.

### G0 — exact candidate freeze

- [ ] Confirm the worktree is clean and remote branch equals the local release
      head.
- [ ] Record the final Git SHA in this packet and the operating ledger.
- [ ] Re-run `git diff --check`, the full Jest suite, TypeScript, production
      build, 61-migration validator and guarded disposable PostgreSQL gate on
      that exact SHA.
- [ ] Confirm no later branch, Cursor output or unrelated worktree delta has
      been merged into the candidate.

### G1 — read-only production discovery

- [ ] Confirm `www.veltexai.com` currently resolves to Vercel project
      `veltex-services-veliz` and record the live deployment SHA/ID as the
      application rollback reference.
- [ ] Read the complete production `schema_migrations` history and fingerprint
      the relevant objects for migrations 029, 030, 034, 040, 041 and
      `20260922` through `20260925010000`.
- [ ] Record production row counts and orphan/owner checks for profiles,
      proposals, tracking rows, company/branding rows, service profiles and
      subscriptions without exporting customer content.
- [ ] Confirm production SMTP remains healthy without revealing or rotating its
      credential.
- [ ] Stop if live code, schema or migration history differs from the recorded
      assumptions. Diagnose the drift; never insert history rows merely to make
      the release continue.

### G2 — backup and recovery readiness

- [ ] Confirm Supabase production point-in-time recovery or take an approved,
      restorable backup immediately before the migration window.
- [ ] Record the backup/recovery timestamp and owner without storing database
      credentials in the repository.
- [ ] Record the current Vercel deployment and its rollback command/path.
- [ ] Confirm the application-first rollback below has an operator and a tested
      decision trigger.

### G3 — production-specific migration plan

- [ ] Build an ordered plan from the fresh G1 fingerprint. Reuse the reviewed
      migration bodies and reconciliation contracts, but remove preview-only
      empty-database assumptions.
- [ ] For every missing or recorded-but-incomplete migration, prove exact
      preconditions, source SHA, postconditions and transaction behavior.
- [ ] Require the production project ref explicitly and refuse the pilot and
      preview refs. The preview refusal guards are not themselves authorization
      to run against production.
- [ ] Run the generated production plan against a disposable schema-faithful
      copy before the live window.
- [ ] Obtain independent exact-artifact review with no blocking findings.

### G4 — operator and founder acceptance

- [ ] Record founder acceptance of the cumulative release scope, including
      organizations/roles, residential and turnover catalogs, location-aware
      pricing foundation, tracked-PDF parity and link revocation.
- [ ] Confirm the operator understands that pricing remains an explainable
      starting range and requires job-specific review; it is not a guaranteed
      market price.
- [ ] Confirm the truthful capability boundary: no live team invitations,
      native invoicing, scheduling or full field-service system is claimed.
- [ ] Obtain explicit production deployment authorization only after G0–G4 are
      complete.

## Authorized production sequence — only after G0–G4 PASS

1. Open a bounded maintenance window and record the start time.
2. Reconfirm the production project ref is exactly `iwoaaljitifloolszxlu` and
   the Vercel project is exactly `veltex-services-veliz`.
3. Capture one final read-only fingerprint and compare it with the reviewed G1
   artifact. Abort on drift.
4. Apply the independently reviewed production migration artifact in its exact
   order. Stop at the first failed precondition or postcondition. Do not
   improvise, skip, edit or mark a failed step complete.
5. Run the production role/grant/SECURITY DEFINER, owner/orphan, tracking,
   entitlement and migration-history assertions before application promotion.
6. Deploy the exact accepted Git SHA to `veltex-services-veliz` and verify the
   `www.veltexai.com` alias points to it. Do not touch `veltex-ai-100d-pilot`.
7. Execute the smoke matrix below. Keep the maintenance window open until all
   critical checks pass or rollback is complete.

## Post-deployment smoke matrix

Use approved QA identities and synthetic/customer-safe fixtures only.

- [ ] Homepage, signup, login, dashboard and logout load without new client or
      server errors.
- [ ] Existing single-user accounts receive exactly one private organization
      and owner membership; no organization has zero owners.
- [ ] Owner organization switching persists and fails closed for a non-member.
- [ ] Admin/estimator/viewer visibility and mutations match the accepted role
      matrix; invitations remain unavailable.
- [ ] Existing commercial proposal create/edit/reopen still works.
- [ ] Residential recurring and turnover proposals preserve their reviewed
      catalog version, editable price breakdown and operator warning.
- [ ] Owner PDF download is complete and canonical.
- [ ] One approved combined email reaches the QA inbox with the correct PDF and
      tracked link.
- [ ] Public tracked link displays correctly at desktop and 390px.
- [ ] Revoking a synthetic tracked link as owner/admin makes that link return
      404, leaves a sibling link active, preserves counters and writes exactly
      one privacy-safe audit event.
- [ ] Anonymous, viewer, estimator and cross-tenant direct access remain denied
      where required.
- [ ] Paid/trial entitlement behavior matches the accepted precedence.
- [ ] Production monitoring shows no new auth, database, email, PDF or
      application errors during the observation window.

## Abort and rollback

Abort immediately on production-ref ambiguity, unexpected migration history,
customer-data digest/count drift, an ownerless organization, cross-tenant
visibility, privilege expansion, failed PDF/email delivery, entitlement
regression or an unexpected pilot-project reference.

Rollback is application-first:

1. Repoint `www.veltexai.com` to the recorded prior Vercel deployment.
2. Disable new organization/team UI and writes while retaining legacy creator
   attribution.
3. Preserve organization, membership, audit, outbox, tracking and revocation
   evidence for diagnosis and forward repair.
4. Do not drop organization columns/tables or erase audit/revocation history.
5. Use database restoration only for a demonstrated data-corruption or
   unrecoverable migration failure, with separate founder authorization and the
   recorded backup/PITR point.

## Evidence to capture

- Final accepted Git SHA and remote comparison.
- Current and promoted Vercel deployment IDs plus alias verification.
- Redacted production fingerprint and migration source hashes.
- Backup/PITR timestamp.
- Migration transcript with pre/post assertions.
- Smoke checklist results, timestamps and operator identity.
- Monitoring observation and any rollback decision.
- Final operating-ledger status using the exact terms `VERIFIED`, `BLOCKED`,
  `PENDING FOUNDER REVIEW` or `COMPLETE`; never infer production success from a
  successful build alone.

## Current decision

**NOT READY TO MUTATE PRODUCTION.** The isolated-preview acceptance gate is
closed, but G0 exact-candidate replay, G1 fresh production discovery, G2 backup,
G3 production-specific migration artifact/review and G4 founder acceptance are
not yet recorded. The next safe move is G0 plus read-only G1 discovery. Neither
step deploys or changes production.
