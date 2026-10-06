# R3-3 founder acceptance — deterministic estimate linkage

Status: **COMPLETE / VERIFIED / ACCEPTED**.

This checklist does not authorize production deployment. Run it only after an
independent `PASS`, on the approved isolated preview, using the exact reviewed
migration/application candidate. Use fictitious data only; never enter a real
customer, address, scope, price, access instruction, photograph or attachment.
The execution sequence, fixed synthetic inputs, evidence filenames and
mandatory credential teardown are frozen in `PREVIEW_OPERATOR_RUNBOOK.md`.

## Bound identity

- Preview project ref: `ynzkwctwlssjcsjmahey`
- Reviewed candidate: `44ca80391bd570fa5dc717686163f999529fe432`
- Implementation/evidence commit: `fb31b3daeb12fd3865774398fb04e51cffcef5b0`
- Independent packet SHA-256: `4389f7b673524eec39783b8c26307f70c78cba3181e0a137a8a8ec262a54f191`
- Migration: `20261004000000_r3_3_estimate_scenario_linkage.sql`
- Migration SHA-256:
  `dcc93319ca0464beab2fb5020c6042753cd01dd06975797f706ae7fa1b91fda9`
- Expected PostgreSQL history after apply: `68`
- Guarded SQL artifact: `/private/tmp/veltex-r3-3-preview-apply-final.sql`
  (25,342 bytes), SHA-256
  `e42600592ac1b5f4f5d21031b2fba6951340373e8e7eadaea574dfe137983503`.
- Isolated Preview deployment branch: `codex/r2-fresh-preview-guard`.
- Verified current Preview predecessor: `a41acab275d509a6d59e67bc71571abe0fffa99c`.
- Exact reviewed Preview application target: `44ca80391bd570fa5dc717686163f999529fe432`.
- The predecessor is an ancestor of the target, so the update is a clean
  fast-forward.
- Preview database apply: **PASS** (`R3_3_PREVIEW_APPLY_PASS`, history `68`,
  estimate rows `0`, receipt rows `0`).
- Primary immutable Vercel Preview URL:
  `https://veltex-services-veliz-dg4gaeei5-veltex-ai.vercel.app`
  (deployment `6DHkoJiBBhaVXyZ1ojJ6WB1Wq49A`, `Ready`).
- Secondary linked immutable Vercel Preview URL:
  `https://veltex-ai-100d-pilot-kdfzieko2-veltex-ai.vercel.app`
  (deployment `D4LWvYGJHjabDwg3QpagJ3k3ydTE`, `Ready`).
- Both Vercel records bind Environment `Preview`, branch
  `codex/r2-fresh-preview-guard` and exact commit `44ca803`; production is
  excluded.

## Synthetic workflow

1. Sign in as the approved synthetic owner/admin and open `/dashboard/crm`.
2. In Board and List views, confirm a residential or turnover opportunity with
   a property-bound scoping package offers **Estimate**, while commercial,
   specialty and missing-segment opportunities state that the current
   estimator is unavailable and offer no save path.
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
10. Advance a saved package to a later lifecycle state, then retry the exact
    original request key and payload. Confirm it returns the original result
    without creating another run or regressing the package. Reuse the key with
    a changed payload and confirm refusal.
11. Attempt to include synthetic access-adjacent free text in scheduling, scope
    additions, cover letter, company name, operator notes and turnover restock
    text. Confirm the request is refused or the private fields are removed
    before persistence; none may appear in immutable history.

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

## Preview operator evidence — 2026-10-05 Pacific

- **Desktop scenario interaction — PARTIAL PASS:** the exact reviewed Preview
  displayed the synthetic turnover opportunity, the internal-planning-only
  truthfulness boundary and the Low/Base/High scenarios. Selecting each scenario
  updated the sticky selected price, working price and Save label consistently:
  Low `$235.00 / turn`, Base `$280.00 / turn`, High `$320.00 / turn`. The
  operator returned to Base before attempting one save.
- **Commercial truthfulness — PASS:** the hosted Board showed that commercial
  and specialty estimating are not supported by the current pricing model and
  exposed no commercial estimate-save path.
- **Save/retry behavior — BLOCKED BY PREVIEW CONFIGURATION:** the first Base save
  failed visibly with `CRM is unavailable. Please try again.` and retained the
  form, selected scenario and retry action. A retry returned the same safe
  failure. Vercel runtime evidence bound both requests to exact Preview
  deployment `6DHkoJiBBhaVXyZ1ojJ6WB1Wq49A` and showed successful authenticated
  calls to isolated project `ynzkwctwlssjcsjmahey`, followed by HTTP `401` only
  from `POST /rest/v1/rpc/command_crm_estimate_run_internal`. The branch-scoped
  `SUPABASE_SERVICE_ROLE_KEY` exists in Vercel but is stale or invalid. This is
  not evidence of an application or migration failure, and no estimate row was
  claimed as saved.
- **Credential teardown — PASS:** the temporary password for the existing
  synthetic Preview user was replaced with a fresh unknown random value;
  Supabase returned `R3_3_PREVIEW_CREDENTIAL_RETIRED`. The SQL editor was
  replaced with a benign evidence query, and the browser session was signed out
  and visibly redirected to `/auth/login`.
- **Production exclusion — PASS:** no production database, deployment, alias,
  user or credential was selected or changed.

## Preview operator acceptance after service-key rebind — 2026-10-05 Pacific

- **Exact deployment — PASS:** only the branch-scoped Preview service-role
  binding was replaced, without recording its value, and exact reviewed commit
  `44ca80391bd570fa5dc717686163f999529fe432` was redeployed. Deployment
  `7PMfguZPKCGjBLPPkxWS7Zi8XVKU` reached `Ready` at
  `https://veltex-services-veliz-7h1r18zkj-veltex-ai.vercel.app`.
- **Desktop save and persistence — PASS:** synthetic opportunity
  `a2370d90-14e7-4b93-a538-7637f249e20f` saved Base exactly once at
  `$280.00 / turn`; CRM displayed the internal planning estimate. Reload showed
  exactly one prior-estimate row (`$280.00 · base · per turn · 10/5/2026,
  11:33:44 PM`). No duplicate was created.
- **Genuine 390 px — PASS:** `window.innerWidth` and
  `document.documentElement.scrollWidth` both measured `390`; viewport height
  was `844`. The workflow and prior history remained visible without horizontal
  overflow. All three scenario controls and Save measured exactly 44 CSS pixels
  high; their respective widths were 80, 81, 81 and 236 CSS pixels.
- **Credential teardown after rebind — PASS:** the temporary password for only
  the existing synthetic Preview user was replaced with a fresh unknown random
  value. Supabase returned
  `R3_3_PREVIEW_CREDENTIAL_RETIRED_AFTER_REBIND`; the editor was cleared to a
  benign query and the app was signed out to `/auth/login`.
- **Production exclusion — PASS:** production remained untouched throughout.

## Decision

- Desktop result: **PASS**
- Genuine 390 px result: **PASS**
- Authorization/privacy/truthfulness result: **PASS FOR THE BOUNDED HOSTED WORKFLOW**
- Founder decision: **ACCEPTED — 2026-10-05 Pacific**

Acceptance closes only bounded R3-3. Later Bid-to-Won increments and all later
roadmap stages remain independently gated.
