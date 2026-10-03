# R3-1 founder acceptance — synthetic CRM workflow

Status: **TECHNICAL WORKFLOW PASS / PENDING FOUNDER DECISION**. This packet does not authorize a deployment
or production data creation. Run it only on the approved isolated preview after
the exact R3-1 migration and app commit are deployed there.

## Bound identity and build

Record before testing:

- Preview project ref: `ynzkwctwlssjcsjmahey`
- App deployment URL: `https://veltex-services-veliz-1bhxrj4nl-veltex-ai.vercel.app`
- Git commit: `0d765d7a9ae33c43f95e2721c661b651e7dbf76f`
- Migration history includes `20261001000000` exactly once: PASS
- Migration history includes `20261002000000` exactly once: PASS
- Server CRM flag is enabled for this isolated preview: PASS
- Tester and Pacific timestamp: Codex acceptance operator, 2026-10-03 01:26 PDT

Use only fictitious `.test` contact data. Do not enter a real customer's name,
address, phone, email, pricing, access instructions, or cleaning scope.

## Synthetic fixtures

Commercial:

- Contact: `Morgan Preview`
- Email: `morgan.crm-r3@example.test`
- Phone: `+12065550191`
- Property / opportunity: `North Campus Preview`
- Manual win reason: `Founder synthetic acceptance walkthrough`

Residential/turnover:

- Contact: `Riley Preview`
- Email: `riley.crm-r3@example.test`
- Phone: `+12065550192`
- Property / opportunity: `Turnover Unit Preview`
- Loss reason: choose an active organization-configured reason

Account and walkthrough:

- Customer: `North Campus Account Preview`
- Primary contact: `Taylor Preview` / `taylor.crm-r3@example.test`
- Property: `Building A Preview`
- Walkthrough: use a future one-hour synthetic window; do not enter access instructions

## Desktop workflow

Use a signed-in owner or admin at a desktop viewport.

1. Open `/dashboard/crm`. Confirm both Board and List controls are keyboard reachable.
2. Quick-add the commercial synthetic lead using the three captured fields.
3. If duplicate review appears, confirm no automatic merge occurs; deliberately choose the correct explicit action.
4. Confirm the lead appears in Open leads as `new`.
5. Choose **Convert lead**. Before confirming, verify no opportunity was created.
6. Confirm conversion into the Commercial pipeline. Verify the captured contact/property text is prefilled and not retyped.
7. Move the opportunity through one permitted non-terminal stage using the keyboard-accessible stage control. Confirm the live status announcement.
8. Move it to Won. Confirm a manual reason is required and that only owner/admin can complete the action.
9. Switch to List. Confirm the same opportunity/stage appears and values are labelled by billing basis rather than combined.
10. Create the synthetic customer/contact/property account. Without reloading the page, open **New opportunity** and confirm the new customer and property are selectable.
11. Create a property-bound opportunity with an estimator. Schedule its walkthrough and confirm the affordance immediately becomes **Manage walkthrough** without reloading.
12. Reschedule the walkthrough, then cancel it. Confirm each operation announces success and the cancelled item returns to **Schedule walkthrough**.

Desktop result: PASS

Evidence notes or screenshot filenames: Same-session account/customer/property
rehydration passed. Property-bound opportunity creation passed. Walkthrough create
immediately exposed Manage; reschedule and cancel each announced success, and
cancel restored Schedule walkthrough. Earlier bounded desktop acceptance already
covered quick-add, conversion, stage, Won/Lost and List parity; remediation did
not alter those paths.

## 390 px workflow

Use a genuine 390 CSS-pixel browser viewport; record both `window.innerWidth`
and `document.documentElement.scrollWidth`. They must each be 390.

1. Open `/dashboard/crm`; confirm no horizontal page overflow outside the intentionally scrollable Kanban region.
2. Quick-add the residential synthetic lead. After completing the fields, adding it must take no more than two deliberate taps.
3. Confirm the lead appears in Open leads and open **Convert lead**.
4. Select the Residential and turnover pipeline plus `turnover`; confirm conversion.
5. Move the resulting opportunity to Lost and verify an active loss reason is required.
6. Create the synthetic account and verify the new customer/property are immediately selectable from **New opportunity** without a browser reload.
7. Exercise walkthrough create → Manage → reschedule → cancel. Confirm every action and its error/status message remain visible and reachable.
8. Open one inline workflow dialog with the keyboard: confirm initial focus, Escape close, and focus return. Confirm the background remains intentionally operable because the workflow surface is nonmodal.
9. Switch Board → List → Board and confirm no required action becomes clipped or unreachable.
10. Confirm all primary controls are at least 44 CSS pixels high, usable by touch, and no required action is hidden behind hover.

390 px result: PASS

- `window.innerWidth`: `390`
- `document.documentElement.scrollWidth`: `390`
- Tap count after lead fields: `1`
- Evidence notes or screenshot filenames: Board and List were both exercised.
The six primary CRM controls measured 44 CSS pixels high. A mobile-created account
and property were immediately selectable without reload. A residential lead was
created, converted and moved to Lost only after selecting the active `Price`
reason. The inline customer workflow closed on Escape; committed browser-facing
interaction tests pin initial focus and focus return.

## Permission and truthfulness checks

1. As viewer, confirm quick-add, conversion, stage, task, and assignment controls are absent; opportunity identity is generic and pricing is hidden.
2. As estimator, confirm only assigned/created opportunities and their scoped customer/property choices are available.
3. Confirm no AI suggestion, autonomous stage move, email/SMS send, customer acceptance, signature claim, or handoff-complete claim appears in R3-1.
4. Confirm Handed off remains unavailable and explains that the reviewed R3-6 workflow is required.
5. With the server CRM flag disabled in a non-production acceptance build, confirm the navigation item is absent, `/dashboard/crm` redirects, and CRM APIs return the same not-found response before authentication. Re-enable it before the workflow checks above.

Permission/truthfulness result: PASS — verified by the executable adversarial
database role matrix, CRM API/UI suites and independent DB/security and API/UI
re-reviews. The hosted owner workflow displayed no AI suggestion, autonomous
move, outbound send, acceptance/signature or handoff-complete claim.

## Decision

- Overall: ACCEPTED / REJECTED / NEEDS FIX
- Founder name:
- Pacific timestamp:
- Defects or required follow-up:

Acceptance covers only the bounded R3-1 CRM foundation. It does not mark full
R3 complete; R3-2 through R3-8 remain required.
