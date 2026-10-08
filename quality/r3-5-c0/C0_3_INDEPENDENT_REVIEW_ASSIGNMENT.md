# R3-5 C0.3 atomic acceptance and receipt — independent review

Status: **TEMPLATE / DO NOT REVIEW UNTIL AN EXACT PACKET MANIFEST SUPPLIES THE
IMPLEMENTATION TIP**

Perform a bounded, read-only review. Do not access Preview, production,
credentials or real customer data. Do not modify the bundle. Verify the packet
and bundle hashes, complete history and exact review tip from `MANIFEST.txt`
before reviewing implementation.

Return exactly `PASS`, `PASS WITH NON-BLOCKING NOTES`, or `FAIL`, with findings
ordered by severity and exact file/line evidence. Any atomicity, authorization,
privacy, immutable-source, idempotency or receipt-integrity defect is a release
blocker.

## Required verdict items

1. **Private authority:** the command accepts only the session HMAC through a
   service-role-only, fixed-search-path definer. No raw bearer, anonymous or
   authenticated database grant, direct table write, legacy tracking ID or
   mutable proposal status can create acceptance authority.
2. **Live eligibility:** token purpose is exactly `accept_proposal`; session,
   token and eligibility are live; organization/version bindings agree;
   revocation, expiry, supersession, designated-approver policy and any prior
   receipt fail closed without enumerating object existence.
3. **Immutable package subset:** selected association IDs are unique and
   non-empty, ordered only by stored display position, and form a proper subset
   or full set of the complete v2 frozen association set. Organization,
   opportunity, property, package, estimate and proposal-version pointers are
   locked and revalidated. Browser totals, hashes, ordering or package details
   are never trusted.
4. **Canonical receipt:** PostgreSQL derives the full offered total, selected
   subtotal, currency, ordered association/package commitments, exact package-
   set/content/rendered hashes, consent copy/version, acceptance timestamp and
   canonical receipt hash. Signer name/email are bounded and explicitly
   signer-entered, not represented as verified identity or an e-signature.
5. **One transaction:** receipt insertion, selected-package acceptance,
   unselected-package preservation, parent won transition, stage history,
   audit/outbox evidence and remaining accept-token revocation commit or roll
   back together. No browser route performs separate state writes.
6. **Receipt-bound stage transition:** the narrow internal path can set
   `acceptance_method='customer_acceptance'` only for the locked just-created
   receipt. It cannot weaken, impersonate or bypass the accepted authenticated
   manual-win command and cannot reach `handed_off`.
7. **Concurrency and replay:** exact retry returns the identical immutable
   receipt; changed key reuse and second conflicting acceptance fail; true
   simultaneous submissions from two sessions converge on one receipt without
   duplicate history/outbox rows or partial package movement.
8. **Append-only/privacy:** receipt UPDATE/DELETE/TRUNCATE and direct DML are
   denied; RLS and organization-bound foreign keys hold; audit/outbox payloads
   contain identifiers only and no name, email, consent text, bearer, session,
   network signal or customer-visible proposal content.
9. **Truthfulness:** the increment claims only proposal acceptance and an
   acceptance receipt using `veltex-c0-acceptance-v1`. It does not claim a
   signature, legal enforceability, payment, delivery, scheduling, email/SMS or
   customer identity verification. Public acceptance UI remains disabled until
   C0.4.
10. **Evidence:** require a fresh complete migration replay; definer/grant and
    owner-matrix assertions; proper-subset/full-set totals; unselected-package
    preservation; cross-tenant/version/package and stale-state negatives;
    exact/changed retry; a real two-session concurrent race; forced late-failure
    rollback; immutable receipt/hash correspondence; focused/full tests;
    TypeScript, build and diff hygiene.

Separate release blockers from test-depth notes. This review does not authorize
Preview, production, public acceptance enablement or C0.4.
