# R3-2 founder acceptance — persisted walkthrough evidence

Status: **PENDING INDEPENDENT REVIEW AND ISOLATED-PREVIEW EXECUTION**.

This packet does not authorize a production deployment or production data
creation. Run it only after an independent `PASS`, on the approved isolated
preview, with the exact reviewed migration and application commit deployed.

## Bound identity and build

Record before testing:

- Preview project ref: `ynzkwctwlssjcsjmahey`
- App deployment URL: pending exact preview deployment
- Reviewed Git commit: pending independent review result
- Migration `20261003000000` appears exactly once: pending
- Migration source SHA-256:
  `62b9f4c11386cb99249b41ff07930467824976b49bf75510127e6d36846d1632`
- Guarded SQL artifact SHA-256:
  `e6888af4d84cdd114135d77e40b1ae540265f91d28efd00ffffc464b2b746859`
- PostgreSQL major and history count: pending (`17` and `67` expected)
- Tester and Pacific timestamp: pending

Use only fictitious observations. Never enter a real customer's identity,
address, cleaning scope, pricing, door/alarm code, key location, access
instruction, health information, photograph or attachment.

## Synthetic fixture

- Customer/property/opportunity: reuse or create an explicitly synthetic
  preview-only account.
- Walkthrough: schedule a future one-hour window assigned to the testing owner,
  admin or estimator.
- Draft note: `Synthetic preview: two restrooms and resilient flooring observed.`
- Completion note: `Synthetic preview complete: measurements reviewed; no access credentials recorded.`

## Desktop workflow

Use a signed-in owner or admin at a desktop viewport.

1. Open `/dashboard/crm`, locate the synthetic property-bound opportunity and
   schedule a walkthrough if it has none.
2. Choose **Record walkthrough evidence**. Confirm focus enters the workflow and
   the warning forbids door codes, alarm codes and access credentials.
3. Save the draft note without marking complete. Confirm the success
   announcement is visible and no page reload is required.
4. Reopen the workflow. Confirm the exact saved draft is present and editable.
5. Replace it with the completion note, select **Mark walkthrough evidence
   complete**, and save.
6. Confirm the control becomes **Review walkthrough evidence**, the completion
   timestamp is shown and the note is read-only. Confirm walkthrough reschedule
   and cancel controls are absent for the completed record.
7. Switch Board → List. Confirm the same Review action and read-only note are
   reachable in both views.
8. Refresh the page and repeat the review. The evidence and final state must
   remain persisted.
9. Trigger one safe client-side failure in a disposable/synthetic context (for
   example temporarily disconnect before saving a different draft fixture).
   Confirm the workflow remains open and announces a retry message without
   claiming success.

Desktop result: **PENDING**

## Genuine 390 px workflow

Set a real browser viewport to exactly 390 CSS pixels wide. Record both
`window.innerWidth` and `document.documentElement.scrollWidth`; each must be
390.

1. Reach the synthetic opportunity in Board view and open Record/Review
   walkthrough evidence without horizontal page overflow.
2. Enter a draft, reach the completion checkbox and Save action by touch, and
   confirm every required action is at least 44 CSS pixels high.
3. Close with Escape and confirm focus returns to the invoking control. The
   inline workflow remains intentionally nonmodal.
4. Reopen, complete the evidence, and confirm the read-only Review state remains
   reachable and unclipped.
5. Switch to List and repeat the read-only review. No essential action may be
   hover-only or outside the viewport.

390 px result: **PENDING**

- `window.innerWidth`: pending
- `document.documentElement.scrollWidth`: pending
- Primary control measurements: pending
- Screenshot/evidence filenames: pending

## Authorization, privacy and truthfulness checks

1. The executable database matrix must prove owner, admin and assigned
   estimator success, plus viewer, unrelated estimator, anonymous and
   cross-tenant denial.
2. A completed walkthrough cannot be edited or reopened. A stale token and a
   changed payload using an existing request key must fail without overwriting
   evidence.
3. Authenticated clients cannot read or mutate the receipt table directly.
4. Audit and outbox metadata contain only record identifiers and never the note
   text.
5. The UI and API expose no photo/attachment upload, access-secret storage,
   email/SMS/calendar send, estimate/proposal creation, customer acceptance,
   signature or handoff-complete claim.

Authorization/privacy/truthfulness result: **PENDING HOSTED CONFIRMATION**
(local PostgreSQL and automated gates already pass).

## Decision

- Overall: **PENDING FOUNDER REVIEW**
- Founder decision: pending
- Pacific timestamp: pending
- Defects or required follow-up: pending

Acceptance covers only bounded R3-2 persisted text evidence. It does not mark
full R3 complete; R3-3 through R3-8 remain required.
