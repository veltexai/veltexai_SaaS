# R3-5 C0.3 implementation audit

Status: **PREPARED / C0.2 INDEPENDENT PASS REQUIRED BEFORE IMPLEMENTATION TIP**

This audit maps the accepted C0 contract to the current schema so C0.3 can
start without reopening or bypassing accepted R3-1 through R3-4.1 behavior.
It does not enable acceptance, change hosted state, or waive the C0.2 exit
gate.

## Existing authoritative inputs

- `crm_customer_action_sessions` and `crm_customer_action_tokens` are private,
  HMAC-only, service-role boundaries. C0.3 must accept the session HMAC, never a
  raw bearer.
- `crm_proposal_versions` v2 and ordered
  `crm_proposal_version_packages` rows are the only acceptance price, scope and
  hash source.
- `crm_site_work_packages.proposal_version_id` is already relationally bound to
  a v2 association. C0.3 must lock and revalidate that pointer before changing
  a selected package.
- `crm_opportunities.acceptance_method` already permits
  `customer_acceptance`, but the accepted R3-1 stage trigger deliberately
  rejects every non-manual win. C0.3 therefore needs one receipt-bound private
  transition path; it must not weaken the authenticated manual stage command.
- `organization_event_outbox` is the accepted identifier-only notification
  transport. C0.3 emits `acceptance_received`; delivery remains R3-8.

## Additive migration shape

1. Add append-only `crm_proposal_acceptance_receipts` with organization,
   version, opportunity, token, session, request key/digest, signer-entered
   name and normalized email, exact consent version/text, ordered selected
   association IDs and hashes, selected work-package IDs, full offered total,
   selected subtotal, currency, package-set/content/rendered hashes,
   PostgreSQL acceptance time and canonical receipt hash.
2. Enforce one receipt per proposal version and one request key per session.
   Direct DML is denied to public, anon, authenticated and service role; only a
   fixed-search-path service-role definer may insert.
3. Add update/delete/truncate guards and organization-bound foreign keys. No
   correction or mutation path ships.
4. Add a private, receipt-bound customer-acceptance transition helper that can
   set the canonical won stage and `acceptance_method='customer_acceptance'`
   only while the just-created receipt is locked in the same transaction. The
   existing authenticated stage function and manual-win policy remain intact.
5. Add `command_crm_accept_proposal_version_internal` as the sole atomic
   command. It locks session, token, eligibility, version, opportunity, every
   frozen association and every selected package in deterministic order;
   derives all totals/hashes in PostgreSQL; inserts the receipt; moves only
   selected packages to `accepted`; preserves unselected packages; records
   stage history/audit/outbox; revokes other accept-purpose tokens for the
   exact version; and returns the immutable receipt projection.

## Fail-closed command rules

- Token purpose is exactly `accept_proposal`; session/token are live and bound
  to the same organization and v2 version; eligibility remains `enabled`.
- Selected association IDs are unique, non-empty, ordered by stored
  `display_position`, and form a subset of the complete frozen package set.
- Every selected association still points to the same organization,
  opportunity, property, package and version; selected packages are not
  deleted, declined, accepted through another version, or pointer-divergent.
- Signer name and email are bounded; email normalization is storage hygiene,
  not identity verification. Consent version and full text exactly match
  `veltex-c0-acceptance-v1`.
- Full and selected totals, association commitment and receipt hash are derived
  from stored immutable rows. Browser totals and hashes are never accepted.
- Exact retry returns the existing receipt; changed reuse and any second
  conflicting acceptance fail uniformly. Advisory and row locks make two
  simultaneous sessions converge on one receipt.
- Any exception rolls back receipt, package, opportunity, history, revocation,
  audit and outbox writes together.

## Required executable evidence

- Fresh full migration replay plus owner-matrix/definer/grant assertions.
- Proper-subset and full-set acceptance with deterministic totals and ordered
  commitments; unselected package preservation.
- Exact retry, changed retry, stale/superseded/revoked/wrong-purpose and
  cross-tenant/version/package refusal.
- True concurrent two-session submit proving one receipt and no partial state.
- Forced late failure proving transaction-wide rollback.
- Immutable receipt and exact receipt/version/package/hash correspondence.
- Existing manual stage command remains unable to claim customer acceptance.
- Identifier-only `acceptance_received` outbox and receipt-bound stage history.

## Gate

C0.3 implementation may begin from the exact C0.2 remediation descendant only
after the C0.2 independent Claude and Cursor exit verdicts pass. Public
acceptance UI remains disabled until C0.3 itself receives Claude `PASS`.
