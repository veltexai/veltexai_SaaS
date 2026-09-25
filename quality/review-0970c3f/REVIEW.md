# Bounded SMTP correction review: 19eaafa..0970c3f

Exact candidate: `0970c3f6fed5ba3266684cfae36a582dd82a7cbd`, branch `codex/r0-privilege-hardening`.

**Verdict: PASS. Prior Medium SMTP partial-acceptance finding CLOSED. No new Critical, High, Medium or Low findings in this bounded correction.**

## Verification

Reviewed the full three-file delta, then ran tests against an isolated `git archive 0970c3f` snapshot. Application code was unchanged. All mail, Supabase and browser dependencies in probes were mocked with synthetic values; no email was sent, credentials accessed, or hosted systems contacted.

- **37 tests PASS across four suites:** 19 committed tests (enhanced email, print session, hardening) plus 18 independent behavioral probes. Full log: `tests.log`. Replayable extra probe source: `behavior-probes.patch`.
- **TypeScript PASS:** `tsc --noEmit`, exit 0 (`typecheck.log`, empty on success).
- **Customer acceptance is required:** customer rejected / owner copy accepted returns false after exactly one SMTP call; Resend is not invoked. Absent, empty and nonmatching accepted lists also return false without retry. Address case/whitespace normalization passes.
- **Optional rejection is contained:** customer accepted / optional CC/BCC rejected returns true after one SMTP call, emits only `{rejected_count: 2}` in the warning, and does not log the optional rejected addresses. No blind retry or alternate-provider send occurs.
- **Failure logging is limited:** the customer-rejection branch logs accepted/rejected counts, not customer/owner addresses. The inherited normal success log still identifies the accepted customer; the correction introduces no rejected-address logging.
- **Exact payload preserved:** the same PDF Buffer reference reaches SMTP. Both SMTP and Resend contract probes verify From, To, CC, self-copy BCC, subject, HTML/text, tracking header, filename and exact attachment bytes. Missing optional values remain absent.
- **Adjacent behavior preserved:** missing/blank Resend configuration selects SMTP; configured Resend failure does not attempt a second SMTP send; SMTP promise rejection, settings lookup failure and service-client construction failure return false. Existing print-session/override tests pass.

The corrected method inspects sendMail's accepted recipients before its success return, closing the previously reproduced failure. Optional-copy rejection is intentionally a warning once the intended customer is accepted. The new committed regression test is executable, proves the original rejection case, and asserts PDF bytes.

## Scope and limits

SMTP acceptance is not proof of inbox delivery; genuine combined-delivery acceptance remains outstanding. This review does not re-open unrelated inherited behaviors such as notifications-disabled returning true or general provider-exception logging. No full build/full-suite rerun is claimed. No deployment, production/preview change, spending or external human contact occurred. Prior release gates and user authorization remain unchanged.
