# R3-4.1 immutable package-set bridge — founder acceptance

Status: **PENDING INDEPENDENT REVIEW / NOT PREVIEW-AUTHORIZED**.

This checklist does not authorize a database apply, deployment, customer action
or Production change. Execute it only after independent Claude and Cursor
`PASS` verdicts on the exact frozen packet, using fictitious data in isolated
Preview `ynzkwctwlssjcsjmahey`.

## Bound identity

- Accepted predecessor: R3-4 application commit
  `aa48b5eabd03e3dd4babf313c7b473a9920467b1`.
- R3-4.1 application candidate: `7909b1a`.
- Review range: `e2e21d6..7909b1a`.
- Frozen packet: `/private/tmp/veltex-r3-4-1-review-7909b1a.zip`.
- Packet SHA-256:
  `7061214ab71bfb051f9c08ad4a12f4b04faf0764f9ca190a209f7105011bf89c`.
- Migration: `20261006000000_r3_4_1_package_set_versions.sql`.
- Expected migration history after apply: `70`.
- Preview branch: `codex/r2-fresh-preview-guard`.
- Production project, deployment, aliases, data and credentials are excluded.

Before any Preview apply, generate one guarded atomic artifact from the exact
reviewed migration, record its byte size and SHA-256 here, verify the project
reference inside the artifact and require a terminal
`R3_4_1_PREVIEW_APPLY_PASS` result. Do not reuse or edit an earlier-stage apply
artifact.

## Identity and safety gate

- [ ] Independent Claude database/security verdict is `PASS` for the frozen
      packet and exact candidate.
- [ ] Independent Cursor operator/accessibility verdict is `PASS` for the same
      packet and candidate.
- [ ] Packet SHA-256 and included Git bundle verify immediately before use.
- [ ] Supabase project reference visibly equals `ynzkwctwlssjcsjmahey`.
- [ ] Guarded SQL artifact hash is recomputed and matches this record.
- [ ] Preview branch is still at exact R3-4 predecessor `aa48b5e` before the
      fast-forward; any drift is investigated rather than overwritten.
- [ ] Vercel deployment is visibly `Preview`, binds exact reviewed candidate
      `7909b1a`, and reaches `Ready` without a Production alias change.
- [ ] Only synthetic records containing no customer/private data are used.

## Database acceptance

- [ ] Apply returns `R3_4_1_PREVIEW_APPLY_PASS` and history count `70`.
- [ ] Existing R3-4 v1 rows and migration bytes remain unchanged.
- [ ] New v2 parent and association tables begin empty before the synthetic
      workflow.
- [ ] Authenticated direct association INSERT/UPDATE/DELETE/TRUNCATE is denied.
- [ ] Viewer, unrelated estimator, anonymous and cross-tenant callers receive
      uniform denial without record enumeration.
- [ ] Exact replay returns one result; changed order, changed package set,
      changed actor and stale concurrency tokens are refused.

## Desktop operator workflow

Use one synthetic open residential or turnover opportunity with one property,
one proposal and at least two eligible estimated packages.

1. Confirm Board and List expose the same **Prepare proposal version** action.
2. Open the dialog and verify both packages are selected initially. Confirm
   each package title, scope, amount and pricing basis, plus the full offered
   total and rendered customer-visible text, come from the server preview and
   cannot be edited in the browser.
3. Deselect one package. Confirm the preview changes to the accepted v1
   single-package path and a fresh request/idempotency key is used.
4. Re-select both packages. Confirm the exact v2 package-set preview returns in
   deterministic display order with the correct offered total.
5. While an older preview request is pending, close and reopen the dialog.
   Confirm a late response cannot overwrite the current preview or leave the
   current dialog stuck loading.
6. Prepare one immutable package-set version. Confirm exactly one v2 parent,
   two ordered association rows and both package pointers exist; reload and
   confirm the same history remains.
7. Retry the exact command and confirm no duplicate. Reuse its key with changed
   order or package selection and confirm refusal without partial state.
8. Confirm the opportunity remains open, packages remain `proposed`, and copy
   says **prepared / not sent**. No public link, delivery, acceptance,
   signature, contract, invoice, payment, scheduling or handoff may occur.
9. Confirm a viewer and unsupported, closed, missing-property or
   missing-estimate contexts expose no preparation action.

## Genuine 390 px and accessibility acceptance

At exactly `390x844`, record `window.innerWidth` and
`document.documentElement.scrollWidth`; both must equal `390`.

- [ ] Board and List can open the package-set dialog without page-level
      horizontal overflow.
- [ ] Every package checkbox, proposal selector, close/retry and prepare action
      is keyboard reachable and each essential target is at least 44 CSS pixels
      in both dimensions where WCAG 2.2 AA requires it.
- [ ] Package titles, scopes, per-package amounts/bases, offered total,
      rendered preview, immutable-history state and prepared/not-sent copy are
      readable without clipping.
- [ ] Escape closes the dialog and focus returns to the invoking Board or List
      control.
- [ ] Loading, failure, stale-token recovery and success are announced through
      perceivable live status without false completion.
- [ ] A safe timeout/failure preserves the operator's package selection and
      retry produces no duplicate.

## Evidence and teardown

- Deployment URL/ID:
- Database apply result/history count:
- Synthetic opportunity/proposal/package identifiers:
- Desktop evidence:
- 390 px measurements and evidence:
- Keyboard/focus/target measurements:
- Exact replay and changed-replay evidence:
- Defects or deviations:
- Credential teardown result:

If a temporary password is authorized for the existing synthetic Preview user,
replace it immediately afterward with a fresh unknown random value, clear the
SQL editor to a benign query, sign out, and verify `/dashboard/crm` returns to
`/auth/login`. Never record the temporary or replacement secret.

## Founder disposition

Choose exactly one only after reviewing the completed evidence:

- [ ] **ACCEPTED** — R3-4.1 may be recorded
      `COMPLETE / VERIFIED / ACCEPTED`; the bounded R3-5 implementation gate may
      open. Production remains separately gated.
- [ ] **REJECTED** — record the defect, exact evidence and required remediation
      below. R3-5 remains blocked.

Founder name/date:

Notes:
