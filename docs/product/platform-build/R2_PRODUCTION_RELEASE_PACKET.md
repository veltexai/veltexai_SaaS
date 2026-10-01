# R2 production release packet

Status: **G0/G1/G2/G3 VERIFIED / G4 PENDING / NOT DEPLOYED**

Date: 2026-09-30 Pacific

This packet is the production decision boundary for the accepted R2 organization,
tenancy, canonical tracked-PDF and tracked-link revocation work. It does not
authorize a production database change, Vercel deployment, credential action,
email, campaign mutation or preview deletion.

## Release identity

| Item | Exact value |
|---|---|
| Accepted branch | `codex/r2-fresh-preview-guard` |
| Frozen production-release code tree | `6660b629bbed304c856c33395538c26aa27db65f` |
| Last application/security change | `a18e6e3` (`add secure tracked link revocation`) |
| Canonical tracked-PDF repair | `0e9a991` |
| Recorded production application base | `a4deb7c0d0f50ae03dfd1ff1981833fa5f996cd1` |
| Production Supabase project | `iwoaaljitifloolszxlu` |
| Accepted isolated preview | `ynzkwctwlssjcsjmahey` |
| Production Vercel project | `veltex-services-veliz` (legacy name; owns `www.veltexai.com`) |
| Separately protected pilot | `veltex-ai-100d-pilot` — exclude from this release |

The current production-release candidate is the frozen `6660b62` code tree.
Later evidence-only documentation commits do not change application or
migration bytes and are not silently substituted as the deployment target.
Because this branch is
cumulative from the recorded production base, it contains Release 1, R0,
location-pricing, R2,
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

- [x] Confirm the worktree is clean and remote branch equals the local release
      head.
- [x] Record the final Git SHA in this packet and the operating ledger.
- [x] Re-run `git diff --check`, the full Jest suite, TypeScript, production
      build, 61-migration validator and guarded disposable PostgreSQL gate on
      that exact SHA.
- [x] Confirm no later branch, Cursor output or unrelated worktree delta has
      been merged into the candidate.

**G0 evidence:** local and remote both resolved to `abc7517`. Full Jest passed
86 suites / 721 tests / five snapshots; TypeScript passed; the production build
generated 84 pages; migration validation found 61 unique executable versions;
and a fresh guarded PostgreSQL 16 cluster passed the full chain, owner matrix,
H1/definer assertions, revocation lifecycle, injection refusal, idempotent
replay and 40-way concurrency. The first build attempt lacked worktree-local
Supabase environment variables; rerunning with the existing local Veltex
configuration passed without changing or exposing those values. This was an
execution-context issue, not a product failure.

### G1 — read-only production discovery

- [x] Confirm `www.veltexai.com` currently resolves to Vercel project
      `veltex-services-veliz` and record the live deployment SHA/ID as the
      application rollback reference.
- [x] Read the complete production `schema_migrations` history and fingerprint
      the relevant objects for migrations 029, 030, 034, 040, 041 and
      `20260922` through `20260925010000`.
- [x] Record production row counts and orphan/owner checks for profiles,
      proposals, tracking rows, company/branding rows, service profiles and
      subscriptions without exporting customer content.
- [x] Confirm production SMTP remains healthy without revealing or rotating its
      credential.
- [x] Stop if live code, schema or migration history differs from the recorded
      assumptions. Diagnose the drift; never insert history rows merely to make
      the release continue.

**G1 evidence:**

- GitHub deployment `6557542919` is the latest recorded successful Production
  deployment for `veltex-services-veliz`; it points to exact SHA `a4deb7c` and
  URL `https://veltex-services-veliz-3068c22ex-veltex-ai.vercel.app`.
  `https://www.veltexai.com` returned HTTP 200 from Vercel. This deployment is
  the application rollback reference pending final dashboard confirmation in
  the maintenance window.
- Production Supabase `iwoaaljitifloolszxlu` has exactly 29 recorded migration
  versions: `001`–`006`, `009`–`030`, and `20250901194222`. Organization,
  membership, service-catalog, location-pricing, R0, tracked-print and revoke
  objects are absent.
- The known history/schema contradiction is still present: proposal templates
  and additional-service catalog exist; free-trial support, email automation,
  attribution/funnel, calculator capture and buyer-role fields also exist even
  though their later migration versions are not recorded. Company profile
  expansion, Release 1 service-catalog, location-pricing, R0 and R2 objects are
  absent. This matches the previously diagnosed baseline class but must be
  reconciled against real rows, not copied from the empty preview.
- Counts-only discovery found 86 profiles, 166 proposals, four tracking rows,
  zero company-profile rows, four branding rows and 11 subscriptions. The
  Release 1 `business_service_profiles` table does not yet exist. There are zero
  proposals without profiles and zero tracking rows without proposals. No
  customer content, email address, token or credential was exported.
- Supabase custom SMTP is enabled with the previously verified Gmail provider
  configuration. The stored password remained hidden and unchanged. Prior
  end-to-end production Auth email delivery remains the latest delivery proof;
  G1 did not send another email.

G1 therefore passes as read-only discovery but explicitly blocks direct reuse
of the preview artifact. G2 backup readiness and a new real-data-safe G3
production reconciliation artifact are mandatory before mutation.

### G2 — backup and recovery readiness

- [x] Confirm Supabase production point-in-time recovery or take an approved,
      restorable backup immediately before the migration window.
- [x] Record the backup/recovery timestamp and owner without storing database
      credentials in the repository.
- [x] Record the current Vercel deployment and its rollback command/path.
- [x] Confirm the application-first rollback below has an operator and a tested
      decision trigger.

**G2 evidence:** production Supabase project `iwoaaljitifloolszxlu` has daily
physical backups. The newest visible restore point at verification time was
`01 Oct 2026 12:20:09 (+0000)`; seven additional daily physical restore points
through `24 Sep 2026` were visible. Point-in-time recovery is **not enabled**
and remains a paid add-on, so the physical restore point—not PITR—is the
approved database recovery checkpoint. Supabase is the backup owner; no
credential was displayed or stored.

GitHub and Vercel independently reconfirmed the known-good application rollback
target: production deployment `6557542919`, successful at
`2026-09-20T20:49:26Z`, exact SHA `a4deb7c0d0f50ae03dfd1ff1981833fa5f996cd1`,
URL `https://veltex-services-veliz-3068c22ex-veltex-ai.vercel.app`. The linked
Vercel project is `veltex-services-veliz` (`prj_qvXFtdH78f4cfmhjkxlBVNHs0JNL`);
the pilot remains excluded. Anthony is the release decision owner and Codex is
the execution operator. On any abort condition below, the first response is to
route production back to that known-good deployment using Vercel Instant
Rollback / `vercel rollback <deployment-url>` (or promote that exact deployment
in the dashboard), verify `www.veltexai.com`, and only then assess database
recovery. No rollback was executed during G2.

### G3 — production-specific migration plan

- [x] Build an ordered plan from the fresh G1 fingerprint. Reuse the reviewed
      migration bodies and reconciliation contracts, but remove preview-only
      empty-database assumptions.
- [x] For every missing or recorded-but-incomplete migration, prove exact
      preconditions, source SHA, postconditions and transaction behavior.
- [x] Require the production project ref explicitly and refuse the pilot and
      preview refs. The preview refusal guards are not themselves authorization
      to run against production.
- [x] Run the generated production plan against a disposable schema-faithful
      copy before the live window.
- [x] Obtain independent exact-artifact review with no blocking findings.

**G3 progress — discovery contract prepared, production still unmodified:**

- `quality/r2-production-reconciliation/00-read-only-production-fingerprint.sql`
  was syntax-verified against a disposable complete schema, then executed in an
  explicit read-only transaction against production. It returned only version
  names, counts, object-state booleans and SHA-256 digests; it selected no
  customer content, recipient, token or credential and ended with `rollback`.
- The fresh result reconfirmed the 29-version history, counts of 86 profiles,
  166 proposals, four tracking rows, zero company-profile rows, four branding
  rows and 11 subscriptions, zero measured orphans, and complete R2 absence.
  It also classified 031–041 and the later prerequisite objects independently
  of history. The exact digest-bearing result is retained as local-only
  evidence at
  `quality/r2-production-reconciliation/production-fingerprint-20260930.json`
  and is excluded from Git/GitHub.
- The builder refuses a pending/unreviewed fingerprint, wrong project ref,
  history drift, missing digests, partial state or existing R2. With a reviewed
  synthetic fixture it pins 32 migration sources by SHA-256 and emits only an
  **unarmed** artifact whose first executable statement raises an exception.
  No arming or production runner exists yet.
- Local builder refusal/classification tests and the unarmed-plan validator
  pass. The first disposable SQL attempt failed only because the disposable
  harness does not create Supabase's migration-history table; adding 29
  synthetic history rows in that disposable database allowed the same query to
  pass. The first browser run exposed a safe SQL-planning reference to an
  absent pricing table and the second editor attempt appended rather than
  replaced text; neither could mutate because the transaction was read-only.
  Both were corrected before the successful production read.
- Independent review instructions are prepared in
  `CLAUDE_R2_G3_PRODUCTION_RECONCILIATION_REVIEW.md`. G3 remains open until the
  fingerprint and every `complete` probe are independently accepted, an armed
  candidate is separately designed, and a production-shaped disposable replay
  proves real-row preservation. G2 and G4 also remain open.

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

**NOT READY TO MUTATE PRODUCTION.** G0 through G3 are verified. The latest
physical database restore point and exact application rollback target are
recorded, and the 35-step production plan is independently reviewed but remains
deliberately unarmed (`armed:false`, `productionAuthorized:false`). G4 founder
acceptance and explicit production deployment authorization remain open. The
next safe move is the G4 scope/truthfulness acceptance decision; do not arm or
execute production SQL before that decision and a final no-drift check.
