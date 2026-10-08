# R3-5 C0.2 fragment exchange and read/respond room — independent review

Perform a bounded, read-only review. Do not access Preview, production,
credentials or real customer data. Do not modify the bundle.

## Exact history

- Review tip: supplied in `MANIFEST.txt`
- C0.2 database/UI implementation: `0c56880`
- C0.2 application boundary: `a8e562a`
- Real mixed-scope proof and C0.1 close: `7f80d93`
- Reviewed scope-digest correction tip: `e89c264`
- Scope-digest implementation: `80e300b`
- C0.1 final review ledger: `cbbedaf`
- C0.1 final review tip: `9ee0f33`
- Accepted C0.0 predecessor: `a5d7d47`

Verify every named commit is present and an ancestor of the review tip. Verify
the packet and bundle SHA-256 values against `MANIFEST.txt`.

## Required verdict items

Return exactly `PASS`, `PASS WITH NON-BLOCKING NOTES`, or `FAIL`, with findings
ordered by severity and exact file/line evidence.

1. Raw bearer handling: the earliest root-head guard validates and scrubs
   `location.hash` before hydration, hands the value through one-time
   `sessionStorage`, and the page never reads the fragment directly. Confirm
   Sentry breadcrumb/event/transaction sanitizers provide defense in depth and
   no raw bearer/session reaches PostgreSQL, structured logs, rendered output,
   URLs or referrers.
2. Exchange/session security: versioned domain-separated HMAC, 15-minute
   opaque `__Host-` HttpOnly + Secure + SameSite=Strict cookie, expiry,
   revocation, eligibility, v2 and designated-approver fail-closed checks,
   bounded rate behavior and uniform unavailable responses. Specifically verify
   that well-formed unknown and known-but-denied exchanges consume a durable
   HMAC-only rate bucket even when no token row is found, that denial does not
   roll the increment back, expired buckets have bounded retention, and the
   global ceiling prevents unbounded attacker-created digest rows.
3. Projection privacy: only immutable v2 parent and ordered associations feed
   the room; costs, wages, margins, overhead, notes, walkthrough evidence,
   estimator identity, audit rows and unrelated tenant/version data cannot
   appear. Rendered proposal bytes are displayed as text, not executable HTML.
4. Response safety: question/change-request/decline only; bounded strict input;
   session/purpose validation; append-only records; exact idempotent replay;
   changed-replay refusal; one retained UI idempotency key across ambiguous
   retries of an unchanged draft; identifier-only outbox evidence.
5. Authorization/grants: no anonymous/authenticated direct table or definer
   access; service-role-only private commands; RLS and append-only guards;
   fixed search paths and no new client-executable definer allowlist gap.
6. C0.2 truthfulness: acceptance mutation is absent and UI states it is not
   enabled. No signature, payment, delivery or legal-enforceability claim.
7. UX/accessibility: desktop and genuine 390px feasibility, keyboard-native
   controls, focus/readability, aria-live results, 44px targets, no horizontal
   overflow, recoverable message text on network failure.
8. Evidence: 75-migration replay, PostgreSQL exchange/projection/response
   proofs (including thirteen unknown-token attempts followed by a persisted
   bucket assertion, retention cleanup and global-row cap), focused tests, full
   Jest regression (113 suites / 957 tests / 5 snapshots), TypeScript,
   production build and recorded failed environment attempts support their
   stated scope.

The earlier `26ae07d` and `1fc2d79` packet candidates were superseded before
external transmission. Do not review or rely on them.

Call out any release blocker separately from test-depth or future C0.3/C0.4
work. This review does not authorize Preview or production deployment.
