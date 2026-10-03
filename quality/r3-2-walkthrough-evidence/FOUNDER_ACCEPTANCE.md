# R3-2 founder acceptance — persisted walkthrough evidence

Status: **PENDING TIMEOUT-DELTA REVIEW, ISOLATED-PREVIEW REDEPLOYMENT AND
FAILURE-RECOVERY RETEST**.

This packet does not authorize a production deployment or production data
creation. Run it only after an independent `PASS`, on the approved isolated
preview, with the exact reviewed migration and application commit deployed.

## Bound identity and build

Record before testing:

- Preview project ref: `ynzkwctwlssjcsjmahey`
- App deployment URL:
  `https://veltex-services-veliz-git-codex-r2-fresh-previ-e45636-veltex-ai.vercel.app`
- Independently reviewed database/application base: `e08f13e9dd4fcddd6975ed4811d68aa9001eb481`
- Corrected client commit pending delta review/redeployment:
  `f8728c3983775914dbc685acca94201a1cf9e7b0`
- Migration `20261003000000` appears exactly once: yes
- Migration source SHA-256:
  `62b9f4c11386cb99249b41ff07930467824976b49bf75510127e6d36846d1632`
- Guarded SQL artifact SHA-256:
  `9b242439d7dc2035f4f5f0b73fea4f46842975ffaf87c6c664f274b33ecbd6a8`
- PostgreSQL major and history count: `17.6` and `67`
- Tester and Pacific timestamp: Codex acceptance operator, 2026-10-03 Pacific

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

Desktop result: **WORKFLOW PASS; STALLED-REQUEST RECOVERY REQUIRES CORRECTED
PREVIEW RETEST**

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

390 px result: **PASS ON DEPLOYED BASE**

- `window.innerWidth`: `390`
- `document.documentElement.scrollWidth`: `390`
- Primary control measurements: Record `44px`; Save `44px`; Close `44px`;
  completion-checkbox label `44px` high; Review `44px`
- Screenshot/evidence filenames:
  `/private/tmp/veltex-r3-2-390-board.png` and
  `/private/tmp/veltex-r3-2-390-list-review.png`

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

Authorization/privacy/truthfulness result: **PASS** for the bounded database,
hosted PostgreSQL 17 and completed-workflow checks. The client timeout delta
does not alter authorization, privacy, schema or truthfulness behavior.

## Decision

- Overall: **PENDING FOUNDER REVIEW**
- Founder decision: pending
- Pacific timestamp: pending
- Defects or required follow-up: the deployed base can remain indefinitely in
  `Saving walkthrough evidence…` when a request never settles. Exact corrected
  commit `f8728c3` adds a 15-second abort, preserves the dialog/note, announces
  retry guidance and restores Save. Local regression and full gates pass; the
  exact corrected client must be independently checked, deployed to the
  isolated Preview and retested before founder acceptance.

Acceptance covers only bounded R3-2 persisted text evidence. It does not mark
full R3 complete; R3-3 through R3-8 remain required.
