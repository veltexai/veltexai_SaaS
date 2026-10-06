# R3-3 isolated Preview operator runbook

Status: **READY / CREDENTIAL WINDOW NOT AUTHORIZED**.

This runbook operationalizes `FOUNDER_ACCEPTANCE.md` for exact reviewed commit
`44ca80391bd570fa5dc717686163f999529fe432`. It does not authorize a credential
change, production access, customer data, or a release decision.

## Fixed environment

- Supabase: isolated Preview `ynzkwctwlssjcsjmahey`
- Application:
  `https://veltex-services-veliz-dg4gaeei5-veltex-ai.vercel.app`
- Branch: `codex/r2-fresh-preview-guard`
- Application commit: `44ca80391bd570fa5dc717686163f999529fe432`
- Existing synthetic account: `r2-ui-signup-20260930@veltex.test`
- Database precondition: `R3_3_PREVIEW_APPLY_PASS`, migration history `68`

Use only existing synthetic Preview records or create records whose names begin
`R3-3 Preview Acceptance`. Never enter a real customer, address, contact,
credential, access instruction, photograph, attachment or price.

## Before sign-in

1. Confirm the immutable deployment still reports `Ready`, Environment
   `Preview`, and commit `44ca803`.
2. Confirm the CRM route remains protected while signed out.
3. Install a temporary password only for the named synthetic Preview account.
   Keep it in memory; do not write it to a file, ledger, screenshot or chat.
4. Open a fresh browser context and sign in to the immutable Preview URL.

## Desktop evidence

1. Open Board, then List. Select an existing residential or turnover
   opportunity with a property-bound package, or create the minimum synthetic
   records needed under the `R3-3 Preview Acceptance` prefix.
2. Confirm the same opportunity exposes **Estimate** in both views. Confirm a
   commercial/specialty opportunity has no save path and shows the truthful
   unsupported-estimator explanation.
3. Open Estimate and record the customer, property, opportunity and package
   context. Confirm there are no proposal-send, acceptance, billing, photo,
   video or attachment controls.
4. Use these deterministic synthetic inputs unless the existing record already
   has equivalent fictitious values:
   - Market: Residential
   - Job type: Recurring standard
   - Property type: House
   - Cleanable square feet: 1,500
   - Bedrooms: 3
   - Bathrooms: 2
   - Appliance interiors: 0
   - Frequency: Every two weeks
   - Occupancy: Occupied
   - Condition: Normal
   - Levels/stairs: 1
   - Hard flooring: 50%
   - Months since professional clean: 1
   - Occupants: 3
   - Private access note: leave blank
   - Hazardous/regulated-material checkbox: unchecked
5. Select Low, Base and High. For each, record the scenario amount, sticky
   selected price, working price and Save label; all four values must agree.
6. Save Base once. Confirm return to CRM, current internal planning summary and
   immutable prior-run history. Confirm the product does not call it a sent
   proposal, contract, invoice, accounting result or guaranteed margin.
7. Reload and confirm the run remains linked to the same opportunity, property
   and package and that the package did not advance beyond `estimated`.
8. Exercise one bounded request failure before saving a second synthetic run.
   Confirm inputs remain, no success is announced, retry uses the same request
   key, and exactly one new immutable run appears.
9. Confirm a later-state package cannot be regressed. Use only synthetic
   records and do not send or accept a proposal.

## Genuine 390 CSS-pixel evidence

1. Set the browser viewport to exactly 390 CSS pixels.
2. Record in-page values for `window.innerWidth` and
   `document.documentElement.scrollWidth`; both must equal `390`.
3. Repeat Board → Estimate → scenario selection → Save → Board/List history.
4. Record that each essential action is reachable, visible, not hover-only and
   at least 44 CSS pixels high. Record focus return after Escape where a dialog
   supports it.
5. Capture only screens containing synthetic data. Store evidence as:
   - `/private/tmp/veltex-r3-3-desktop-estimate.png`
   - `/private/tmp/veltex-r3-3-desktop-history.png`
   - `/private/tmp/veltex-r3-3-390-estimate.png`
   - `/private/tmp/veltex-r3-3-390-history.png`

## Authorization and privacy probes

Run only with already established synthetic Preview roles. Verify owner/admin
and the exact assigned estimator can use the path; viewer, unrelated estimator
and cross-tenant identities must receive no save UI or indistinguishable
denial. Enter an access-adjacent synthetic value only in the private access
field, confirm its warning, then confirm it is absent from estimate history,
audit metadata and outbox payloads.

## Mandatory teardown

1. Replace the temporary synthetic password with a fresh unknown random value.
2. Clear in-memory secrets, sign out and reload `/dashboard/crm`; it must return
   to the login boundary.
3. Do not delete synthetic evidence records unless separately authorized.
4. Record results in `FOUNDER_ACCEPTANCE.md` and the operating ledger, including
   exact deployment, viewport measurements, failures and final disposition.

Any unexpected deployment identity, tenant identity, authorization result,
duplicate run, persisted access note or production redirect is a stop condition.
