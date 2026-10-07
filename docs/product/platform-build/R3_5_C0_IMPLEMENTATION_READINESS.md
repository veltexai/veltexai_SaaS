# R3-5 C0 implementation readiness

Status: **PLANNING COMPLETE / IMPLEMENTATION DEPENDENCY-BLOCKED**

R3-4 is accepted, and the additive R3-4.1 package-set bridge has received
independent Claude and Cursor `PASS`. R3-5 cannot begin until R3-4.1 receives
isolated-Preview evidence and founder acceptance. This memo maps the current repository to the approved
C0 contract so implementation can begin without rediscovery or accidental
scope reduction after that remaining gate.

## Reusable authoritative primitives

- `crm_proposal_versions` is the immutable customer-visible source. R3-5 must
  reuse its stored snapshot, rendered bytes, price and hashes; it must never
  recompose acceptance content from mutable `proposals` rows.
- `crm_opportunities.acceptance_method` already permits
  `customer_acceptance`, and package status already includes `accepted` and
  `declined`.
- R3-3 owns package lifecycle constraints. R3-5 may extend the authorized
  proposed-to-accepted/declined path but must not reopen terminal packages.
- The existing stage command and stage-history trigger remain the canonical
  opportunity transition/history mechanism. They currently enforce manual
  wins, so anonymous acceptance cannot invoke them unchanged or update the
  opportunity directly.
- Organization audit/outbox tables and R3-4 identifier-only events are the
  patterns for the required `acceptance_received` event. Outbox delivery is
  still R3-8 scope.
- Existing plaintext proposal tracking identifiers are view/download legacy
  behavior only. They are not acceptance authority and must not be upgraded
  into R3-5 tokens.

## Decisions frozen for the first implementation

1. Canonical purposes are `review_proposal`, `respond_proposal` and
   `accept_proposal`. Only `accept_proposal` can create a receipt or move
   lifecycle state.
2. Raw bearer tokens use at least 128 bits of CSPRNG entropy. They arrive in a
   URL fragment, are exchanged once through a bounded POST, and are replaced by
   an opaque, short-lived HttpOnly, Secure, SameSite session cookie. Referrer
   policy is `no-referrer`; analytics, monitoring, errors and logs must redact
   the fragment and request body.
3. The server computes a versioned keyed HMAC before crossing the database
   boundary. Database functions accept only token hash plus key version, never
   raw token bytes. Token rotation creates a new token record and revokes the
   previous token without mutating proposal versions or receipts.
4. C0 designated-approver enforcement defaults off per organization. When on,
   the same server-held key scheme hashes the normalized configured and
   signer-entered email for constant-time equality. The UI describes this as a
   match to the designated address, not identity verification.
5. Initial expiration is bounded to seven days, configurable downward at
   issuance. Rotation never extends beyond an explicitly chosen new expiry.
   Owner/admin and the exact assigned estimator may issue or revoke a link for
   an eligible opportunity; only owner/admin may enable designated-approver
   enforcement.
6. Rate limiting is additive and database-backed using token ID plus a keyed,
   privacy-bounded network bucket derived only from a reviewed trusted-proxy
   address. It stores no raw address, user agent or browser fingerprint.
7. Consent is an allowlisted versioned constant stored verbatim in the
   receipt. Public enablement remains blocked until counsel approves the copy
   or the founder explicitly retains the contract's non-signature C0 wording.
8. Operator surfacing uses a caller-scoped receipt-summary reader in the CRM;
   clients do not read audit/outbox tables.

## Package-set conflict resolved locally — acceptance gate remains

The approved R3-5 command accepts `accepted_package_ids` and requires atomic
multi-package acceptance. Accepted R3-4 binds one package/estimate to a v1
version, which could not prove an arbitrary package set. The local R3-4.1
candidate resolves that shape without modifying v1 bytes:

- a `crm_proposal_version.v2` parent commits `package_count`,
  `package_set_sha256`, one currency, full offered `display_amount_minor`,
  immutable content/rendered hashes and null single-package estimate identity;
- append-only `crm_proposal_version_packages` rows commit ordered association
  identity, work-package and estimate identity, customer-visible
  title/scope/amount/basis and estimate input/output, scope and association
  hashes;
- `command_crm_publish_proposal_package_set_internal` publishes the parent,
  every association, package pointers, receipt, audit and outbox atomically;
  and
- `read_crm_proposal_package_set_preview_internal` derives the exact ordered
  customer-visible preview from server state before publication.

R3-5 must consume only accepted v2 parents and association rows. Its command
may accept only a non-empty subset of the exact frozen association set, retain
the parent `package_set_sha256`, preserve association display order and compute
the selected subtotal from stored association amounts. It must not re-read
mutable estimates or reconstruct customer-visible terms during acceptance.
Token issuance stays disabled until the independently verified R3-4.1
candidate is operationally accepted in isolated Preview and by the founder.

Shipping an array parameter that currently permits only one package would be a
smaller implementation, but it would not satisfy the approved multi-package
outcome and is rejected as a silent scope reduction.

## Required database shape after the gate

After R3-4.1 is accepted, an additive R3-5 migration should provide:

- hashed action tokens, append-only responses and acceptance receipts;
- additive proposal-version eligibility/revocation records rather than a
  mutable flag on `crm_proposal_versions`;
- issuance, revocation, token exchange/resolution, response and acceptance
  functions with fixed search paths and explicit grants;
- a receipt-bound internal opportunity transition that reuses canonical stage
  validation/history while allowing `customer_acceptance` only from the atomic
  acceptance command;
- direct-DML and UPDATE/DELETE/TRUNCATE guards, rate-limit buckets, scoped
  operator readers, identifier-only audit/outbox events and complete definer
  allowlisting.

## Required application shape after the gate

- strict acceptance schemas, consent constants and canonical receipt hashing;
- authenticated operator issue/revoke/status routes beside the proposal-version
  route;
- a new non-legacy customer review room using fragment exchange and the opaque
  cookie session;
- separate review, question, change-request, decline and accept actions;
- exact per-package scopes/amounts, selected subtotal, full offered total and
  consent review before an unchecked confirmation;
- stable printable receipt and exact-retry recovery; and
- minimal Board/List receipt/link metadata using the shared CRM surface.

## Proof matrix

The implementation gate must add an R3-5 migration contract, adversarial SQL
matrix and true two-session double-submit race to the authoritative PostgreSQL
harness. Tests must cover purpose, entropy, HMAC versioning, expiry, revocation,
legacy-token refusal, raw-token absence, rate limiting, IDOR/cross-tenant and
cross-version/package failures, designated-approver behavior, exact/changed
retry, concurrent acceptance, atomic failure, proper-subset/full-set outcomes,
selected-subtotal correspondence, unselected-package preservation,
immutable receipt/version/hash/consent binding, stage history, direct-DML
denial, desktop/genuine-390 accessibility, truthful copy and receipt refresh.

No code, migration, public link, acceptance, customer message or hosted change
is authorized by this planning memo.
