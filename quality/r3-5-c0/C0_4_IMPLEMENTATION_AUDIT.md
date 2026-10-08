# R3-5 C0.4 acceptance UI and operator surfacing — implementation audit

Status: **PREPARED / IMPLEMENTATION GATED ON C0.3 INDEPENDENT PASS**

This audit maps the smallest complete C0.4 increment from the accepted R3-5
contract and execution sequence. It does not enable public acceptance, alter a
hosted database, deploy, or authorize Preview/production work.

## Dependency gate

C0.4 implementation may begin only after the exact C0.3 candidate receives
independent Claude and Cursor `PASS` or `PASS WITH NON-BLOCKING NOTES` with no
release blocker. The atomic database command remains the sole acceptance
authority. The browser must never write receipt, package, opportunity, history,
revocation, audit, or outbox state separately.

## Current source boundary

- `app/proposal-room/page.tsx` renders the customer-safe proposal projection,
  supports question/change/decline, and deliberately exposes
  `acceptanceEnabled: false` with a disabled acceptance control.
- `app/api/public/proposal-room/route.ts` reads only through
  `read_crm_customer_proposal_room_internal` using the opaque session digest.
- `app/api/public/proposal-room/responses/route.ts` demonstrates the required
  uniform failure, idempotency-key, no-store and session-digest route pattern.
- `20261011000000_r3_5_c0_3_atomic_acceptance.sql` owns the private atomic
  acceptance command and immutable receipt. Its return projection already
  contains the durable receipt identity, selected associations, totals,
  currency, acceptance time, receipt hash and replay flag.
- `features/crm/components/crm-board.tsx` renders both Board and List from the
  caller-scoped `read_crm_pipeline_board` projection. It currently has no
  acceptance summary or in-app acceptance notice.

## Required implementation

### Database projection migration

Create a new additive C0.4 migration; do not edit the reviewed C0.3 migration.

1. Replace the private proposal-room reader so an eligible `accept_proposal`
   session projects `acceptanceEnabled: true`, while review/respond-only,
   revoked, expired, designated-approver, disabled-eligibility, terminal,
   deleted or already-conflicted state fails closed.
2. If the session owns the immutable receipt, project a customer-safe receipt
   object sufficient to survive refresh: receipt ID, version ID, accepted UTC
   time, selected association IDs, selected subtotal, full offered total,
   currency, consent version and receipt SHA-256. Do not expose signer-entered
   email/name back through the room unless the accepted contract explicitly
   requires it.
3. Add a caller-bound acceptance-summary reader for CRM Board/List. Enforce the
   existing organization role and opportunity visibility rules before receipt
   lookup. Project identifiers, time, totals, currency, selected-count and
   receipt hash only; do not expose customer action bearer/session material or
   signer-entered fields to viewers.
4. Preserve fixed `search_path`, explicit grants, RLS/FKs, append-only receipts,
   and identifier-only `proposal.acceptance_received` outbox evidence.

### Public acceptance route

Add `POST /api/public/proposal-room/acceptance` with:

- opaque `__Host-` session cookie validation and server-side HMAC digest;
- a bounded idempotency key retained across retry for the same normalized
  name/email/ordered-association selection;
- strict schema for unique, non-empty UUID association IDs and bounded
  signer-entered name/email;
- one call to `command_crm_accept_proposal_version_internal` and no other
  mutation;
- a single uniform unavailable response for malformed, unauthorized, stale,
  revoked, expired, terminal, already-conflicted and database-rejected input;
- no-store/referrer-policy/security headers matching the existing room routes;
  and
- no raw bearer/session, consent text, signer fields or proposal content in
  logs, error bodies, audit or outbox payloads.

### Customer UI and durable receipt

Replace the disabled placeholder only when `acceptanceEnabled` is true:

- unchecked consent control with the exact founder-retained
  `veltex-c0-acceptance-v1` non-signature wording;
- signer-entered name and email fields with explicit copy that entry is not
  identity verification or an electronic signature;
- selected-package controls initialized unchecked, non-empty on submit, ordered
  by stored display position, and accompanied by selected subtotal plus full
  offered total;
- final review state before submission and a 44px minimum primary target;
- keyboard/focus/live-status behavior, horizontal-overflow resistance and a
  recoverable network-error state that preserves the draft and request key;
- on success, a stable printable receipt using only server-returned/stored
  values; refresh must rehydrate the same immutable receipt from the room
  projection and must not resubmit acceptance; and
- truthful copy that claims proposal/package acceptance only—no e-signature,
  enforceability, payment, scheduling, delivery, email or SMS claim.

### Operator Board/List surface

- Load caller-scoped acceptance summaries with the Board/List data or through a
  dedicated same-organization route.
- Render the same concise accepted state, timestamp, selected/full totals and
  receipt reference in both views.
- Surface an in-app `proposal.acceptance_received` notice from identifier-only
  evidence; do not claim that an email or SMS was sent.
- Preserve viewer price redaction and existing owner/admin/assigned-estimator
  scope. Unassigned estimators must not gain an existence oracle.

## Evidence required before the C0.4 exit

- Focused route/schema/component tests for exact retry, changed retry and
  interrupted-request recovery.
- Invalid, expired, revoked, designated-approver, disabled, already-accepted,
  terminal, soft-deleted and cross-version/tenant negatives with uniform
  response behavior.
- Disposable PostgreSQL proof that refreshed receipt and operator summary match
  the immutable receipt/hash while signer/session data stays private.
- Customer and operator desktop plus genuine 390px flows; keyboard, focus,
  live-status, 44px targets, overflow, print and truthful-copy checks.
- Board/List equivalence and viewer/assigned-estimator/owner/admin access
  matrix; no existence oracle and no price leak to redacted viewers.
- Focused/full Jest, TypeScript, production build, fresh migration replay,
  migration-chain validation, definer/grant checks and diff hygiene.
- Exact Claude security/correctness review and complementary Cursor
  accessibility/customer-flow review.

Only the combined C0.0–C0.4 candidate may then enter the separately authorized
isolated-Preview gate. Production remains excluded until the full R3-5 release
gate and founder acceptance are complete.
