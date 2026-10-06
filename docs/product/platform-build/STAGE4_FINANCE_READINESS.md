# Stage 4 invoicing and payments readiness

Status: READ-ONLY AUDIT COMPLETE / IMPLEMENTATION GATED

Planning evidence only. Rebind and re-audit this packet at the exact accepted
Stage 3 predecessor before implementation.

No customer invoicing or payment implementation exists on any current branch or
worktree. Existing Stripe routes, webhook handling, `billing_history`, billing
UI and plan/trial state are Veltex's own SaaS subscription billing. They must not
be reused as a cleaning company's customer-finance ledger, endpoint, credential
set or invoice store.

## Hard separation

- Never extend `billing_history` into tenant customer invoices.
- Never use Veltex's `STRIPE_SECRET_KEY` or `/api/webhooks/stripe` for a cleaning
  company's customer payments.
- Cleaning-company funds must flow through that organization's explicitly
  connected provider account after the provider/PCI model is approved.
- Existing signature verification is a reusable security pattern only. The
  current webhook does not provide the central event inbox, ordering and
  terminal replay guarantees required for customer finance.

## Current code reuse map

- The accepted immutable proposal-version and later C0 receipt/package-set
  chain is the source for agreement creation. Reuse its integer minor units,
  hashes, version/request uniqueness, strict customer-safe schemas and
  direct-DML denial; do not treat a proposal version as an agreement record.
- Reuse caller-bound organization context/idempotency patterns in the CRM
  shared route helpers, subject to separately decided finance permissions.
- Reuse R2 transactional audit/outbox, monotonic event sequence and inbox
  foundations. Extend them for provider account/object/event uniqueness,
  ordering, retry, terminal dead letter and replay lineage.
- Proposal agreement/payment-term renderers are display inputs only. Their
  renewal, finance-charge and payment language is not an authoritative billing
  schedule or counsel-approved agreement.

The platform Stripe client, checkout route, Stripe webhook,
`014_stripe_subscription_schema.sql` and `billing_history` are user-owned
Veltex subscription billing. They are wrong-account, wrong-ownership and wrong-
lifecycle primitives for customer finance. The existing visual proposal-
acceptance component also cannot become agreement authority without C0.

## Dependencies

1. Founder-accepted R2 tenancy, roles, organization entitlements, audit and
   hosted U1/U8 runtime evidence.
2. Founder-accepted R3 ownership for customers, properties, acceptance,
   immutable proposal versions and provider-neutral handoff.
3. Founder-accepted Stage 3 onboarding/import/export and stable ownership keys.
4. A bounded cross-stage contract bridge—immutable agreements/versions,
   change-order ownership and provider-neutral contract events—must precede
   finance. It belongs at the beginning of Stage 4 so the founder-approved
   invoicing-before-scheduling order does not create a circular dependency.
   Service plans, jobs, visits and field execution remain Stage 5.
5. Operator evidence that external finance re-keying is a material problem.
6. Accounting, legal, retention, separation-of-duty and PCI/provider decisions.

## Provider-neutral contract foundation

Contract preparation may proceed without a database or provider integration:

- `veltex.billing_instruction.v1` — outbound external-mode billing instruction.
- `veltex.invoice_status.v1` — inbound external invoice status.
- `veltex.payment.v1` — inbound external payment or later native event.
- Later contracts: `veltex.invoice.v1`, `veltex.tax_quote.v1`,
  `veltex.settlement.v1`, `veltex.accounting_ack.v1` and
  `veltex.account_mapping.v1`.

Every contract must use organization and immutable source identifiers, integer
minor units, ISO currency, source trace and generated timestamp. Immutable
document/version events use `(organization_id, object_type, object_id,
version)`. Provider/payment/refund/dispute/reversal/settlement events require a
separate command idempotency key plus provider-account and provider-event/object
uniqueness, raw-payload hash, received/processed timestamps, ordering policy,
retry count, terminal dead-letter state and replay lineage.

## Delivery progression

### F0B — evidence and finance decisions (first)

- Verify operator tools, cadence, terms, deposits, tax source and re-keying.
- Correct unsupported finance-charge/payment language only through approved
  copy/legal review.
- Record segment rollout mode (`external`, `native`, `none`),
  separation-of-duty and solo-owner fallback, retention, numbering/currency,
  tax authority, secret-store, connected-account/PCI and accounting-map
  decisions.
- A segment rollout mode of `external` or `none` does not satisfy or complete
  the founder-approved native invoicing/payments stage.
- Freeze agreement/change-order semantics, package recurrence,
  numbering/currency, tax authority, deposits/proration, finance roles,
  connected-account/merchant model, PCI scope and provider event ordering/
  reversal/refund/dispute/settlement rules before F0A/F1 coding.

### F0A — contract-boundary bridge (after F0B decisions)

- Immutable agreement and agreement-version records sourced from the accepted
  R3 proposal version and C0 acceptance receipt.
- Customer-visible change-order lifecycle, effective dating and immutable
  provenance.
- Provider-neutral `veltex.agreement.v1` and `veltex.change_order.v1` events
  through the accepted R2 outbox.
- Explicitly excludes service plans, visits, workers, location, timekeeping and
  billing calculations.

### F1 — billing foundations

- Organization billing account, immutable agreement-derived schedule,
  append-only billable events and reason-coded queue.
- Deposits, milestones and proration only after accountant approval.

### F2 — first shippable financial value

- Provider-neutral CSV/JSON/webhook billing-instruction export.
- Preview-before-commit invoice-status/payment import with validation, hashes,
  dedupe, conflict review and source trace.
- Accepted R2 outbox/inbox with ordering, retry, terminal dead-letter and replay.
- Real-format reconciliation against a pilot external system.

### F3 — native invoicing, evidence-gated

- Immutable draft-to-issued lifecycle; organization numbering; line/tax items;
  credits/debits; void-and-replace; write-off; PDF/delivery; accounting sync.
- Requires F2 evidence plus accountant and counsel approval.

### F4 — hosted payments, separately gated

- Organization-owned connected provider; hosted fields/session; separate signed
  webhook/inbox; receipts, refunds, disputes, autopay, reminders and
  reconciliation.
- No PAN, CVC or complete bank credentials in Veltex storage or logs.
- Requires accepted F3, explicit PCI scope and provider/counsel approval.

## Release gate

- Tenant/role and finance permission negatives, including separation of duties.
- Immutable issued-document and complete source-chain proof.
- Import preview, scanning, dedupe, conflict, rollback and idempotency tests.
- Hosted outbox ordering/retry/dead-letter/replay and inbox-idempotency evidence.
- One real-format reconciled operator period within approved tolerance.
- Accessibility, security/privacy review, Claude exact-candidate PASS and
  founder acceptance.
- Native invoices require numbering/document/tax/accounting signoff.
- Payments require connected-account sandbox coverage for success, failure,
  reversal, refund and dispute plus a zero-sensitive-data scan.
- Production deployment and provider activation remain separately authorized.
- Stage 4 is complete only after F0B, F0A, F1, F2, F3 and F4 each satisfy its
  applicable evidence and acceptance gate. External-mode value may ship in a
  bounded earlier increment, but it cannot redefine completion of this stage.
