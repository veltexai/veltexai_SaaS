# Independent review: 28b0d89..f4aa1e2

Exact candidate: `f4aa1e2e9baba6f88c3567821d39db63a21f5810`, branch `codex/r0-privilege-hardening`. **Delta FAIL: one Medium finding.** No application code was modified. Review and probes used an isolated `git archive f4aa1e2` snapshot; transports, Supabase and browsers were mocked. No email, credential access, hosted-system access, deployment or spending occurred.

## Severity-ranked findings

### P2 / Medium — SMTP partial rejection is reported as successful customer delivery (introduced)

**Location:** `lib/email/service.ts:718-738`.

Nodemailer may resolve sendMail when at least one envelope recipient was accepted, even if the primary customer was rejected. The new SMTP branch discards its `accepted`/`rejected` result, logs success to the customer and returns true. With send-copy-to-self or CC enabled, SMTP can accept the owner's copy and reject the customer; the proposal send route then marks the proposal sent and reports success although the customer received nothing.

Reproduced on the exact candidate using the documented-by-source result shape: `{accepted:['owner@example.com'], rejected:['client@example.com']}` resolves, and sendEnhancedProposalEmail returns true. The failure log is in `behavior-probes.log`. This is not a hypothetical rejection mode: the installed Nodemailer implementation at `lib/smtp-connection/index.js:1672-1682` proceeds to DATA whenever fewer than all recipients were rejected and returns accepted/rejected at lines 1705-1715. No real SMTP connection was made.

**Correction:** inspect the SMTP result and require acceptance of the intended customer before reporting customer-delivery success. Surface rejected CC/BCC recipients appropriately. Do not blindly resend to already-accepted recipients while resolving a partial failure. Add a regression case where the primary recipient is rejected and the owner copy is accepted.

### Low — committed fallback regression test does not cover the failure boundary

**Location:** `features/service-catalog/__tests__/enhanced-proposal-email.test.ts:52-84`.

The new test is executable and verifies SMTP selection, recipient, header, attachment filename/type and secure port. It does not assert attachment bytes, HTML/text, CC/BCC, Resend preservation, missing configuration, provider rejection or partial SMTP acceptance. Independent probes below cover these contracts, including the failed partial-acceptance case. Add representative failure/result assertions to the committed suite with the correction.

## Passed checks

- **Existing tests:** enhanced proposal email, print session and hardening suites: 3 suites / 18 tests PASS (`existing-tests.log`).
- **Independent email probes:** 12 PASS, 1 expected FAIL reproducing the Medium finding (`behavior-probes.log`, `email-probes.patch`). Both transports preserve From, To, CC, BCC/self-copy, subject, HTML, text, tracking header, attachment filename and exact PDF Buffer. Omitting optional copies/attachment leaves them absent.
- Missing/blank Resend key or sender address selects configured SMTP. A configured Resend provider error returns false without attempting SMTP, avoiding an automatic second transmission on ambiguous provider failure. This is configuration fallback, not runtime provider failover.
- Settings lookup failure, service-client construction failure and rejected SMTP promise all return false without an alternate delivery attempt. SMTP configuration comes from protected server-side settings; synthetic credential values did not appear in normal execution logs or message payloads. No real credentials were read.
- **Chrome probes:** 3 PASS (`chrome-probes.log`, `chrome-probes.patch`): absent override preserves default local discovery; production ignores the local override and retains serverless executable/args; local launch failure rejects before PDF creation. The committed test verifies the explicit local override and existing session forwarding/authorization-error checks.
- **Typecheck:** `tsc --noEmit` PASS, exit 0 (`typecheck.log`). No full build/full-suite rerun claimed.

## Unchanged behavior and limits

- Notifications-disabled returns true without sending, as before this delta when Resend was configured. The proposal route interprets true as delivered; that inherited behavior remains a separate concern and was not fixed here.
- getEmailConfig is called twice on the SMTP path (once for From/enable flag and again for transport credentials); this is an existing service pattern, not a new credential exposure. Both reads are server-side and mocked in this review.
- Generic provider exceptions are still logged as raw error objects by the existing catch. There is no new direct password/API-key logging in the changed success path, but the current code does not promise redaction of arbitrary provider-supplied error text. The new test's string named `secret-not-logged` does not itself assert redaction.
- No inbox or hosted acceptance was attempted. The combined-delivery email and other previously open release gates remain separate from this local review verdict.
