# R3-4 isolated Preview operator runbook

Status: **ISOLATED PREVIEW DEPLOYED / AUTHENTICATED ACCEPTANCE PENDING**.

This runbook converts the independently reviewed R3-4 implementation into a
bounded hosted acceptance exercise. The exact guarded database apply and
Preview-only branch promotion below completed successfully on 2026-10-06
Pacific. This record does not authorize a credential change, Production access,
customer data or release.

## Fixed evidence

- Supabase: isolated Preview `ynzkwctwlssjcsjmahey`
- Vercel branch: `codex/r2-fresh-preview-guard`
- Applied remote transition: `44ca80391bd570fa5dc717686163f999529fe432`
  → `aa48b5eabd03e3dd4babf313c7b473a9920467b1`
- Reviewed application commit: `aa48b5eabd03e3dd4babf313c7b473a9920467b1`
- Guarded SQL: `/private/tmp/veltex-r3-4-preview-apply.sql`
- Guarded SQL SHA-256:
  `848411b6bca90bafef3b055353d219643a1fdf8a34d1fea7551e161c85d9ac40`
- Source migration SHA-256:
  `86f438fe3a4516093534faf45d74bff4020dc68e9e40014f912e7152685678a3`
- Existing synthetic account: `r2-ui-signup-20260930@veltex.test`
- Required database result: `R3_4_PREVIEW_APPLY_PASS`, history `69`
- Ready deployment: `4t2FPW4NDADoV4uK5HnLsVRqhW34`
- Ready deployment URL:
  `https://veltex-services-veliz-9ox0rbzrx-veltex-ai.vercel.app/`

Use only existing synthetic Preview data or records named with the prefix
`R3-4 Preview Acceptance`. Never enter real customer, address, contact,
credential, access instruction, photograph, attachment or price data.

## Guarded apply and deployment checks

Completed: exact SQL hash matched; the isolated Preview apply returned
`R3_4_PREVIEW_APPLY_PASS`, history `69`, version count `0` and receipt count
`0`; the guarded branch reached exact commit `aa48b5e`; Vercel reached `Ready`
in `Preview`; the root loaded; and signed-out `/dashboard/crm` redirected to
`/auth/login`. Production remained excluded and unchanged.

1. Confirm the Supabase project reference displayed in the UI is exactly
   `ynzkwctwlssjcsjmahey` and that the environment is isolated Preview.
2. Recompute the guarded SQL hash and require an exact match before execution.
3. Run the complete SQL once. Require `R3_4_PREVIEW_APPLY_PASS`, history `69`,
   version count `0` and receipt count `0`. Any other result is a stop condition.
4. Confirm the remote branch is still exactly `44ca803...`; fast-forward only
   that branch to `aa48b5e...`. Do not merge or substitute a newer commit.
5. Require a Vercel deployment marked `Ready`, `Preview`, and commit
   `aa48b5e`. Confirm Production aliases and deployments did not change.
6. Confirm signed-out `/dashboard/crm` remains protected before opening any
   credential window.

## Synthetic setup

Use one open residential or turnover opportunity with customer, property,
proposal, an `estimated` package and its selected R3-3 estimate. Confirm the
same opportunity appears in Board and List. If a minimum fixture is needed,
prefix every new name `R3-4 Preview Acceptance` and record its IDs without
including private content.

Do not use a commercial/specialty opportunity as a successful fixture: R3-4
must truthfully keep unsupported estimates out of the preparation path.

## Desktop acceptance

1. Open the eligible opportunity from Board. Confirm **Prepare proposal
   version** is present, has a minimum 44 CSS-pixel target and opens the dialog.
2. Confirm the dialog explains this creates an immutable prepared version and
   does not send, accept, sign, contract, invoice, schedule or hand off work.
3. Confirm proposal candidates are limited to the selected opportunity,
   customer and property. Select the synthetic proposal.
4. Review the exact customer, service location, scope, exclusions, assumptions,
   terms and price. Confirm the price equals the package-bound selected R3-3
   estimate and cannot be edited in the browser.
5. Select **Prepare immutable version** once. Require the notice `Proposal
   version 1 prepared. It has not been sent.` and one history entry marked
   `not sent`.
6. Reload. Require the same immutable history, selected price, hashes and
   package link. Confirm the opportunity remains open and package remains
   `estimated`.
7. Use **Prepare another version** without changing authoritative source data.
   Require version 2 rather than an overwrite. Confirm version 1 is unchanged.
8. Exercise one bounded stalled/error response. Inputs and request key must be
   retained; no success may be announced; a retry must not create duplicates.
9. Repeat from List and confirm eligibility, history and actions match Board.
10. Confirm unsupported, closed and missing-estimate contexts expose no prepare
    action and do not imply that a proposal was sent.

## Authorization probes

Using only established synthetic Preview roles:

- owner/admin and the exact assigned estimator can load candidates, history and
  prepare a version;
- viewer, unrelated estimator and cross-tenant identities receive neither a
  usable prepare action nor enumerating record detail;
- changing a proposal binding after its first version is refused;
- changing the package estimate clears the version pointer rather than silently
  relabeling old proposal content; and
- audit/outbox evidence contains identifiers only, not rendered proposal text,
  access notes or internal economics.

## Genuine 390 CSS-pixel acceptance

1. Set the viewport to exactly 390 CSS pixels.
2. Record `window.innerWidth` and `document.documentElement.scrollWidth`; both
   must equal `390`.
3. Repeat Board and List entry, candidate selection, content/price review,
   preparation and history inspection.
4. Verify every essential action is visible, keyboard reachable, not hover-only
   and at least 44 CSS pixels high. Escape must close the dialog and return
   focus to its launcher.
5. Store synthetic-only screenshots as:
   - `/private/tmp/veltex-r3-4-desktop-review.png`
   - `/private/tmp/veltex-r3-4-desktop-history.png`
   - `/private/tmp/veltex-r3-4-390-review.png`
   - `/private/tmp/veltex-r3-4-390-history.png`

## Mandatory teardown and recording

1. If the synthetic password was temporarily rotated, replace it immediately
   with a fresh unknown random value, clear it from memory and sign out.
2. Reload `/dashboard/crm` and require the login boundary.
3. Do not delete evidence records without separate authorization.
4. Complete `FOUNDER_ACCEPTANCE.md` and update the authoritative ledger with
   exact deployment identity, database result, viewport measurements, role
   outcomes, defects and founder disposition.

An unexpected project/commit, failed hash, migration-history mismatch,
duplicate version, mutable prior version, price mismatch, access-data leak,
authorization failure or Production redirect is an immediate stop condition.
