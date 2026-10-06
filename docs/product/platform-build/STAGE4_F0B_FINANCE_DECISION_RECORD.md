# Stage 4 F0B finance boundary decisions

Status: **RECOMMENDED DEFAULTS PREPARED / PREDECESSOR AND FOUNDER GATED**

F0B decisions precede agreement, invoice or payment implementation. This
record does not create a provider account, credential, invoice or transaction.

## Recommended first-build defaults

| Decision | Recommended default | Status |
|---|---|---|
| Agreement formation | Accepted C0 receipt plus immutable proposal v2 package set creates an immutable agreement version; retain non-signature wording pending counsel | PENDING |
| Change orders | New immutable version with explicit effective date and customer acceptance; never mutate an accepted agreement | PENDING |
| Currency | One currency per organization/agreement/invoice; USD first; no conversion in first build | PENDING |
| Numbering | Organization-scoped monotonic issued-invoice number; drafts use non-legal internal IDs | PENDING |
| Taxes | Operator/provider-supplied tax decision with source/version; Veltex does not infer legally correct tax | PENDING |
| Deposits/proration | Disabled until accountant-approved rules and customer wording exist | PENDING |
| Finance roles | Owner/admin configure; separate prepare/approve/issue/refund permissions; solo-owner exception is explicit and audited | PENDING |
| External bridge | Provider-neutral billing-instruction export and previewed status/payment import before native invoices | PENDING |
| Native invoices | Immutable draft-to-issued, void-and-replace, credits and write-offs only after F2 reconciliation evidence | PENDING |
| Payments | Organization-connected hosted provider; Veltex never stores PAN/CVC/bank credentials | PENDING |
| Provider events | Account + event/object identity, raw-payload hash, received/processed order, retry/dead-letter/replay lineage | PENDING |
| Retention | Immutable issued documents/events retained under accepted organization/legal policy; secrets excluded from exports | PENDING |

## Required operator evidence

- Current accounting/invoice tools and re-keying volume by segment.
- Billing cadence, terms, deposits, milestones, taxes and payment methods.
- External/native/none rollout decision per segment; external/none cannot mark
  the native stage complete.
- Accountant review of numbering, tax source, credits/write-offs,
  reconciliation and export mappings.
- Counsel/provider review of agreement wording, connected-account ownership,
  merchant role, refunds/disputes and PCI scope.

## Non-negotiable separation

Veltex SaaS subscription checkout, global Stripe credentials, subscription
webhook, `subscriptions`, `subscription_plans` and `billing_history` remain
outside customer finance. They may supply security/testing patterns only.
