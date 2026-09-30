# R2 hosted application/Auth checkpoints

Status: **IN PROGRESS — ISOLATED PREVIEW APPLICATION VALIDATION**

Run this checklist as S7 of
`docs/product/platform-build/R2_ISOLATED_PREVIEW_OPERATOR_EXECUTION_PACKET.md`.
Do not start it before the isolated-preview fingerprint, atomic apply, matrix,
last-owner, and U1 evidence for `ynzkwctwlssjcsjmahey`.

Record the isolated preview URL, exact candidate commit, timestamp and
redacted evidence for every item. A database SQL pass does not satisfy these.

- [x] New preview signup creates exactly one profile, one organization, one
      owner membership, one active organization and the expected trial usage.
- [ ] Migration history contains exactly one `20260925002000` row; a normal
      migration command reports it already applied rather than replaying the
      non-idempotent DDL. Record pre/post row counts and content digest.
- [x] Existing owner can create, reopen and edit a legacy-shaped proposal while
      omitting `organization_id`; the server assigns the active editable tenant.
- [ ] Owner can generate a PDF; every uninvited/non-member identity is denied.
- [ ] Paid owner can send a proposal; free-trial and non-member behavior
      matches the final paid-entitlement acceptance record.
- [ ] Random tracked link renders the customer-safe projection responsively.
- [ ] Valid paid tracked link downloads; invalid, disabled and unauthorized
      links fail closed without exposing raw proposal/customer fields.
- [ ] View/download/click events update once per action and remain scoped to the
      token-bound proposal.
- [ ] Two authenticated browser sessions for separate organizations cannot see
      each other's organization, members, proposals, tracking, views or exports.
- [ ] Switching the active organization to a non-membership fails and leaves the
      previous active organization unchanged.
- [x] Refresh/relogin preserves the legitimate active organization.
- [x] No real customer email is sent. Use only a controlled `.test`/sink address
      unless founder separately authorizes a one-time delivery acceptance.

## 2026-09-30 application evidence

- Stable preview alias: `https://veltex-r2-preview-20260930.vercel.app`.
- Synthetic signup `317aad89-f73c-42d5-a95d-41329c5e8e93` created exactly one
  profile, organization `8ca5fd88-2eea-4a64-aeb4-33a01fcef152`, owner
  membership, active organization and untouched trial usage. Confirm-email was
  restored after preview-only signup; no email was sent.
- Legacy-shaped proposal `741ef971-06bd-405e-b792-c86056c56f06` omitted
  `organization_id`, was assigned to the active organization, and was reopened
  and edited through the authenticated application.
- Paid entitlement fixture is isolated to the synthetic preview user and was
  verified as `active / professional` in both profile and subscription rows.
- Authenticated PDF export succeeded. Visual review found and corrected an
  unreadable long-title wrap, a content-free Basic-template closing page, and
  empty contact rows. Commits: `219ecd8`, `8aab1ca`, `fbea721`. The final
  preview deployment is `dpl_56dMjbYd25nXTnYdPMa2PT8XQC3S`; its runtime and
  build Supabase URL/key target only `ynzkwctwlssjcsjmahey`, and its service
  role is an inert sentinel. Production is not reachable from this deployment.
- The final rendered two-page structure was visually inspected after the title
  and thank-you-page repairs. The last contact-row-only polish is deployed and
  source/type/regression verified, but the Chrome connection dropped before a
  fresh post-polish download could be visually re-inspected; do not mark the
  full PDF/non-member checklist row complete yet.
- Separate-organization browser and REST checks denied cross-tenant proposal,
  organization and membership reads. The invalid active-organization switch
  failed with `42501` and preserved the prior organization. The legitimate
  active organization `Veltex R2 Preview QA` remained selected after explicit
  sign-out and password relogin.
- Verification gates after the PDF fixes: 82 suites, 697 tests, five snapshots,
  TypeScript and production build pass. Known Supabase Edge-runtime and missing
  Sentry-upload-token messages remain warnings, not failures.
- Remaining checks are deliberately open: exact hosted migration-row replay
  assertion, paid send without real delivery, tracked-link projection/download
  and event-once behavior, complete cross-tenant members/tracking/views/exports,
  responsive tracked-link review, and final post-polish PDF perception.

## 2026-09-30 tracked-delivery continuation

- The exact hosted migration table contains version `20260925002000` and the
  isolated preview has 59 history rows. The destructive replay refusal/content
  digest portion of this checklist item remains open.
- A founder-authorized `online_only` send to `client@veltex.test` created one
  tracking record, then failed safely with `EMAIL_SEND_ERROR`; no real customer
  received anything. The route left the unshared token row in place, which made
  it possible to validate the public surface but does not satisfy successful
  delivery acceptance.
- Tracking token `8fe40198-2a46-49f0-8e9d-863f8aa0ebf7` rendered only the
  customer-safe projection. A random UUID returned the application 404. One
  download increased `download_count` from 0 to 1, and three deliberate valid
  navigations produced exactly three scoped view rows/count increments.
- Setting both `track_opens` and `track_downloads` false left the public proposal
  readable but prevented a subsequent reload/download from changing either
  counter (`3` views, `1` download). Both flags were restored to true. There is
  no current revocation/disabled-link field, so the checklist's disabled-link
  fail-closed requirement is not implemented and remains a release decision.
- Authenticated RLS-session checks across all three preview identities passed:
  each identity saw one organization and one membership; both unrelated owner
  tenants saw zero proposals, tracking rows and proposal views, while the UI QA
  tenant saw exactly one proposal, one tracking row and three view rows. The
  browser export-denial subcheck remains open because the synthetic owner
  password was not available in the verified handoff; no password was reset or
  recreated.
- A fresh post-contact-polish authenticated export was downloaded as
  `proposal-Synthetic QA Client (4).pdf` (2,793,668 bytes). Its cover was
  genuinely rendered and visually inspected: title, client, address and date
  are legible and correctly framed. A fresh second-page render was not obtained,
  so the full PDF row remains open.
- The public tracked `Download PDF` path produced a separate one-page 3,877-byte
  legacy jsPDF document rather than the polished authenticated two-page export.
  Visual inspection showed only the title/footer and no meaningful proposal
  body. This is a genuine release blocker; tracked downloads must use an
  equivalent customer-safe canonical proposal rendering before R2 acceptance.
- The in-app browser viewport override did not change `window.innerWidth` from
  1280, so no mobile/responsive PASS is claimed from that attempted check.

Final status must remain `PREPARED` until these checks and the database matrix
have evidence. Record failures; do not rerun by silently changing the candidate.
