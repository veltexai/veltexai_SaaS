# R3-4 immutable proposal versions — founder acceptance

Status: **PENDING ISOLATED-PREVIEW EVIDENCE AND FOUNDER REVIEW**.

This record may be completed only for the exact reviewed R3-4 application
commit `aa48b5eabd03e3dd4babf313c7b473a9920467b1` and guarded migration artifact
SHA-256 `848411b6bca90bafef3b055353d219643a1fdf8a34d1fea7551e161c85d9ac40`
on isolated Preview `ynzkwctwlssjcsjmahey`. It is not Production approval.

## Identity and safety

- [x] Supabase project reference visibly confirmed as `ynzkwctwlssjcsjmahey`.
- [x] SQL hash recomputed and matched before apply.
- [x] Apply returned `R3_4_PREVIEW_APPLY_PASS`, history `69`, and empty new tables.
- [x] Vercel deployment is `Ready`, environment `Preview`, commit `aa48b5e`.
- [x] Production deployment, aliases, data and credentials were unchanged.
- [x] Only synthetic records with no private/customer data were used.

## Product behavior

- [x] Board and List show matching eligibility and prepared history.
- [x] The selected R3-3 price/scope is reused and is not browser-editable.
- [x] Version 1 persists after reload and remains immutable.
- [x] A deliberate second preparation creates version 2 without overwriting 1.
- [ ] Retry/stalled-response behavior retains state and creates no duplicate.
- [ ] Opportunity remains open and package remains `estimated`.
- [x] Copy clearly says prepared/not sent and makes no delivery, acceptance,
      signature, contract, invoice, scheduling or handoff claim.
- [ ] Unsupported, closed, missing-estimate and unauthorized contexts are
      unavailable without record enumeration.

## Responsive and accessible behavior

- [x] Desktop content and price review are complete and understandable.
- [ ] Genuine 390px `innerWidth` and `scrollWidth` both equal `390`.
- [ ] No page-level horizontal overflow obscures content or actions.
- [ ] Essential targets are at least 44 CSS pixels and keyboard reachable.
- [ ] Dialog Escape and focus return work from both Board and List.
- [ ] Live preparation/failure/retry feedback is perceivable and truthful.

## Evidence

- Deployment URL and ID: `https://veltex-services-veliz-9ox0rbzrx-veltex-ai.vercel.app/` / `4t2FPW4NDADoV4uK5HnLsVRqhW34`; terminal status `Ready`, environment `Preview`, source commit `aa48b5eabd03e3dd4babf313c7b473a9920467b1`.
- Database result captured at: Supabase SQL Editor for isolated Preview `ynzkwctwlssjcsjmahey`, 2026-10-06 Pacific; `R3_4_PREVIEW_APPLY_PASS`, `history_count=69`, `version_count=0`, `receipt_count=0`.
- Desktop evidence paths:
- 390px evidence paths:
- Roles exercised: authenticated synthetic Preview operator `r2-ui-signup-20260930@veltex.test`; signed-out route guard.
- Defects or deviations: None in the deployment/bootstrap or authenticated desktop checks. A signed-out request for `/dashboard/crm` redirected to `/auth/login` as required. Desktop Board and List both exposed the same eligible opportunity and proposal review. Version 1 (`$280.00 per turn`) survived reload; deliberate version 2 creation preserved version 1; both entries remained `not sent`. Stalled-response/retry, genuine 390px and final credential-retirement/sign-out evidence remain pending.
- Teardown completed at:

## Founder disposition

Choose exactly one after reviewing the evidence:

- [ ] **ACCEPTED** — R3-4 may be recorded `COMPLETE / VERIFIED / ACCEPTED` and
      the next dependency gate may open. Production remains separately gated.
- [ ] **REJECTED** — record the defect and required remediation below.

Founder name/date:

Notes:
