# R3-5 C0 execution sequence

Status: **PREPARED / R3-4.1 ACCEPTANCE-BLOCKED**

This sequence turns the approved C0 contract into small reviewable increments
without shrinking the required customer outcome. No R3-5 implementation,
public link, token, customer message or hosted action begins until R3-4.1 is
`COMPLETE / VERIFIED / ACCEPTED`.

## Operating rules

1. Branch from the exact accepted R3-4.1 application commit and bind every
   packet, migration and Preview artifact to that base.
2. Keep the legacy plaintext `/view/[trackingId]` path view-only. It is not a
   token source, session exchange, acceptance authority or receipt.
3. Store no raw bearer token, address, user agent or browser fingerprint.
4. Keep all customer-visible proposal terms sourced from immutable v2 parent
   and association rows. Never recompose them from mutable proposal, package or
   estimate records during review or acceptance.
5. Do not claim signature, legal enforceability, payment, delivery, scheduling
   or handoff. Use **Accept proposal** and **acceptance receipt** only.
6. An increment may be locally complete but cannot unlock its next hosted gate
   until its exact independent review and required predecessor evidence pass.

## C0.0 — consent and cryptographic boundary freeze

Before migration code:

- record the exact non-signature consent text and immutable consent-version ID;
- choose the server-held HMAC secret name and integer key-version convention;
- freeze 32-byte CSPRNG tokens encoded without ambiguous characters;
- freeze a seven-day maximum token lifetime and shorter operator-selected
  expiry choices;
- freeze the URL-fragment bootstrap, one-time POST exchange, opaque HttpOnly +
  Secure + SameSite cookie, `no-referrer` policy and no-store response headers;
- keep designated-approver matching disabled by default; and
- define trusted-proxy network-bucket input or disable the network component
  until that trust boundary is explicitly configured.

Exit evidence: founder decision to retain the contract's non-signature wording
pending counsel, or counsel-approved replacement copy; named environment and
rotation contract; schema tests proving rejected token/cookie/log shapes.

## C0.1 — private database foundation and operator issuance

Add one migration containing:

- `crm_customer_action_tokens`, bounded rate buckets and immutable eligibility/
  revocation records;
- keyed-hash-only issuance, rotation and revocation internals;
- owner/admin and exact assigned-estimator authorization before receipt lookup;
- service-role-only internal functions, fixed search paths, explicit grants,
  RLS, direct-DML denial and definer allowlisting;
- authenticated issue/revoke/status routes beside the proposal-version route;
  and
- Board/List metadata that shows link state without returning an existing
  bearer value.

Issuance accepts a v2 proposal-version ID, purpose and bounded expiry. The
server generates the raw value, computes its versioned keyed HMAC and passes
only the hash and key version across the database boundary. The database
verifies the full ordered association set and returns token metadata. The
server combines that metadata with the in-memory raw value for a one-time
response; exact retry returns metadata without pretending the unrecoverable raw
value can be replayed. The raw value is never persisted or logged.

Exit evidence: migration replay; role/IDOR/purpose/expiry/revocation/rotation/
raw-token-absence matrices; exact and changed issuance replay; focused routes;
Claude database/security `PASS`. No public room is enabled yet.

## C0.2 — fragment exchange and read/respond room

Add a new non-legacy public route family that:

- receives the raw token only from the browser fragment through a bounded POST;
- hashes it server-side and exchanges it for a short-lived opaque session;
- resolves one customer-safe immutable v2 projection;
- supports question, change-request and decline append-only responses; and
- applies uniform invalid/expired/revoked/rate-limited responses.

The room displays organization customer-facing identity, version number,
ordered packages, scopes, amounts/bases, full offered total, current selected
subtotal, allowed actions and approved consent copy. It excludes every internal
cost, margin, wage, note, walkthrough detail, estimator identity, audit row and
unrelated record.

Exit evidence: raw-fragment/log/referrer tests; cookie/header tests; IDOR and
forwarded-link/designated-approver negatives; response replay and immutability;
desktop and 390px review/question/change/decline flows; Claude and Cursor
`PASS`. Acceptance mutation remains disabled.

## C0.3 — atomic proper-subset acceptance and receipt

Add the acceptance command and append-only receipt records. In one transaction
the command must:

- validate and lock token, v2 parent, selected ordered associations,
  opportunity and packages;
- require a non-empty subset of the frozen association set;
- derive selected subtotal and all hashes from stored immutable rows;
- bind signer-entered name/email and exact allowlisted consent text/version;
- return the same receipt on exact retry and reject changed or concurrent
  conflicting attempts;
- move only selected packages to `accepted`, preserve unselected packages and
  move the parent to the canonical won stage with
  `acceptance_method='customer_acceptance'` through a receipt-bound internal
  transition;
- revoke remaining accept-purpose tokens for that exact version; and
- emit identifier-only audit/outbox `acceptance_received` evidence.

No browser route separately writes receipt, package or opportunity state.

Exit evidence: proper-subset/full-set totals, unselected preservation, exact/
changed retry, true two-session double submit, partial-failure rollback,
stage-history and immutable receipt/hash proof; Claude `PASS`.

## C0.4 — acceptance UI, durable receipt and operator surfacing

Enable the acceptance action only after C0.3 passes. Require unchecked consent,
signer-entered name/email and a final review of selected packages, selected
subtotal, full offered total and exact consent copy. After success show a stable
printable receipt that survives refresh. CRM Board and List expose the same
caller-scoped acceptance summary and in-app notification; they must not claim
email/SMS delivery before R3-8.

Exit evidence: customer and operator desktop/genuine-390 flows; keyboard,
focus, live-status, 44px target, overflow and truthful-copy checks; invalid,
expired, revoked, already-accepted and network-interruption recovery; Cursor
`PASS`; full repository/build/migration gates.

## Final R3-5 release gate

Only the combined C0.0–C0.4 candidate may receive guarded isolated-Preview
execution, synthetic end-to-end acceptance, real operator/customer-format
review and founder disposition. Preview must never use a real customer or
create a legally represented acceptance. Production remains separately gated.

R3-5 becomes `COMPLETE / VERIFIED / ACCEPTED` only when the exact combined
candidate has independent Claude and Cursor `PASS`, database and application
evidence, desktop and genuine-390 acceptance, credential teardown and explicit
founder acceptance. That acceptance opens R3-6; no individual increment does.
