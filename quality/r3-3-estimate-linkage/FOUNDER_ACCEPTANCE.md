# R3-3 founder acceptance — deterministic estimate linkage

Status: **PENDING INDEPENDENT REVIEW AND ISOLATED PREVIEW**.

This checklist does not authorize production deployment. Run it only after an
independent `PASS`, on the approved isolated preview, using the exact reviewed
migration/application candidate. Use fictitious data only; never enter a real
customer, address, scope, price, access instruction, photograph or attachment.

## Bound identity

- Preview project ref: `ynzkwctwlssjcsjmahey`
- Reviewed candidate: `c4aa33165f2f086e97fcce34a0c903f060039de3`
- Migration: `20261004000000_r3_3_estimate_scenario_linkage.sql`
- Migration SHA-256:
  `a6bd7e47ee1fb2747af523a6bb281390b05939290d5e0ea8ec4c953fabf312d8`
- Expected PostgreSQL history after apply: `68`
- Guarded SQL artifact path, SHA-256 and Preview deployment URL: record after
  the independent verdict and before mutation.

## Synthetic workflow

1. Sign in as the approved synthetic owner/admin and open `/dashboard/crm`.
2. In Board and List views, confirm a residential or turnover opportunity with
   a property-bound scoping package offers **Estimate**, while a commercial
   opportunity states that commercial estimating is not yet supported and
   offers no save path.
3. Open the residential workbench. Confirm customer, property, opportunity and
   package context are visible; proposal-send, acceptance, billing, attachment,
   photo and video controls are absent.
4. Enter a synthetic residential job and generate the deterministic result.
   Select Low, Base and High in turn; the displayed working price and Save
   label must match the selected scenario and exact amount each time.
5. Save one scenario. Confirm the CRM immediately shows the internal planning
   estimate, amount, basis and immutable history without claiming that a
   proposal, contract or accounting result exists.
6. Reload and confirm the selected estimate remains linked to the same package.
   The package must not be able to enter `estimated` without that exact run.
7. Trigger a safe client failure or request timeout before a synthetic retry.
   Confirm the form and one request key are retained, no false success appears,
   and retry produces one run rather than a duplicate.
8. Confirm a viewer sees no save UI. Confirm the exact assigned estimator can
   use the residential path, while an unrelated estimator and cross-tenant
   synthetic user receive indistinguishable denial.
9. Confirm a later-state package (`proposed`, `accepted` or `declined`) cannot be
   regressed by estimate save. Confirm no access notes or credentials appear in
   stored estimate history, audit metadata or outbox payloads.

## Genuine 390 px acceptance

At exactly 390 CSS pixels, record `window.innerWidth` and
`document.documentElement.scrollWidth`; both must equal `390`.

1. Reach Estimate from Board and List without horizontal overflow.
2. Complete the deterministic input workflow, scenario selection and Save using
   touch; every essential action must be reachable and at least 44 CSS pixels
   high.
3. Confirm scenario, exact amount, retry guidance and success announcements are
   visible and not clipped.
4. Close with Escape where supported and confirm focus returns to the invoking
   control. No essential action may be hover-only.
5. Return to CRM and inspect the current estimate plus immutable prior runs in
   both Board and List.

## Decision

- Desktop result: **PENDING**
- Genuine 390 px result: **PENDING**
- Authorization/privacy/truthfulness result: **PENDING**
- Founder decision: **PENDING**

Acceptance closes only bounded R3-3. Later Bid-to-Won increments and all later
roadmap stages remain independently gated.
