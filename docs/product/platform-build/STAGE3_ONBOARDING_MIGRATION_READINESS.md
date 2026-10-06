# Stage 3 onboarding and migration readiness

Status: READ-ONLY AUDIT COMPLETE / IMPLEMENTATION NOT STARTED

Planning evidence only. Rebind and re-audit this packet at the exact accepted
Stage 2 predecessor before implementation; do not treat a historical audit
commit as current entry evidence.

Stage 3 is founder-approved, but its implementation gate is not open. It must
start from the founder-accepted R3 head because it consumes organization,
customer, contact, property, opportunity, proposal-version, acceptance and
activation contracts. No branch or worktree contains a completed CSV import,
organization export, durable onboarding-session or legacy proposal-to-CRM
migration implementation.

## Reuse; do not rebuild

- R2 organization, membership, active-organization, audit and outbox/inbox
  contracts after their hosted acceptance.
- R3 customer/contact/property keys, opportunity lifecycle, immutable proposal
  versions, C0 acceptance and A0–A8 activation registry only after their exact
  meanings, implementations and full R3 acceptance exist. References to A0–A8
  are not an implementation source while Prompt 12 semantics remain missing.
- Existing qualification route/card as input primitives, not as a completed
  segment router:
  `app/api/onboarding/qualification/route.ts` and
  `features/proposals/quick/components/qualification-card.tsx`.
- Existing company/business profile APIs and the Release 1 catalog packs, while
  adding explicit confirmation/version semantics rather than treating a save as
  confirmation.
- Existing demo content only as education. It is not a tenant-isolated sample
  workspace and must not count as activation or escape into send, acceptance,
  export or billing.
- Existing migration and hosted-verification harness patterns for additive
  schema, rollback, fingerprints, tenant negatives and immutable-byte checks.

The dashboard onboarding banner is a presentation primitive only. Its
local-storage behavior is not durable organization-scoped save/resume. Current
proposal PDF downloads and subscription cancellation are not organization data
export, deletion or grace-period portability.

## Current code reuse map

- Reuse the question enums and validation shape in
  `app/api/onboarding/qualification/route.ts`, but replace its user-profile
  persistence and marketing-funnel event with organization-scoped onboarding
  state and the accepted activation registry.
- Reuse fields from `app/api/service-catalog/profile/route.ts` and
  `app/api/company-profile/route.ts`, but add versioned organization ownership,
  explicit confirmation and assumption provenance. Both current routes are
  user-scoped.
- Reuse canonical record validation in `features/crm/schemas/records.ts`,
  `lead.ts` and `direct-opportunity.ts`. The R3-1 lead-conversion command is a
  transaction/idempotency pattern, not an import engine.
- Reuse organization RLS, composite foreign keys, command receipts,
  identifier-only outbox and adversarial harness patterns from R2/R3.
- Preserve legacy proposal bytes with reversible mapping records and nullable
  links. Do not run historical rows through the current R3-4 composer.

Current source enums need additive truthful import/legacy values. CSV or legacy
rows must not be mislabeled `manual` merely to fit the existing schema. The
local-storage onboarding banner is presentation-only, and the existing
proposal export/download endpoints are not organization portability.

## Required delivery increments

### S3-1 — durable segment-aware organization onboarding

- Organization-scoped versioned onboarding session/checklist and last completed
  step.
- Desktop/mobile save and resume with idempotent, concurrent-safe APIs.
- Canonical routing for commercial, residential/turnover, ordinary specialty,
  explore/consultant and regulated/high-hazard stop-and-route paths.
- Explicit business-profile/default confirmation with assumptions and version.
- Truthful start choices: real bid, isolated sample, or import only when the
  import capability exists.
- R3 A0–A8 activation integration without a parallel analytics registry.

### S3-2 — CSV dry-run and mapping

- Canonical schemas for customers, contacts, properties, leads and
  opportunities.
- A maximum of 10,000 rows plus a separately frozen byte ceiling, accepted
  encodings, malware/prohibited-field and CSV-formula-injection defenses.
- Mapping presets, normalization, row-level errors, deterministic duplicate
  suggestions and explicit operator confirmation; never silently merge.
- Resumable preview batches with provenance, hashes and audit.

### S3-3 — idempotent commit and legacy migration

- Idempotent import commit, conflict/merge review and operator-controlled undo
  until an explicitly defined finalization cutoff.
- Legacy user/proposal mapping into accepted R3 ownership using a reversible
  mapping record.
- Hash evidence that historical proposal bytes, prices and public links do not
  change.

### S3-4 — organization portability and stage acceptance

- Full organization export on every plan with a versioned completeness
  manifest, step-up authentication, encryption and expiring download.
- Cancellation, grace period, deletion, legal-hold and immutable-record rules.
- Representative operator imports, accessibility evidence, independent Claude
  exact-candidate PASS and founder acceptance.

## Entry gate

- R2 founder-accepted with hosted U1 and U8 decisions.
- Full R3 accepted, including C0, handoff and A0–A8.
- Release 1 truthfulness and catalog/profile semantics accepted.
- Privacy/DPA/access-logging rules for any concierge processing.
- Retention, deletion, legal-hold and lifecycle-email decisions recorded.
- Exact role grants for onboarding/import/merge/reversal/export and a legacy
  public-link preserve/revoke/expiry policy recorded.
- Imported consent without authoritative provenance is stored as unknown, never
  inferred as granted.
- Freeze normalization/dedupe keys, preview TTL/resume, batch provenance/hash,
  partial-failure and undo/finalization semantics before import coding.
- Freeze legacy owner/grouping/orphan/status mapping and public-link
  preserve/revoke/expiry policy before historical migration coding.

## Release gate

- Additive migrations and rollback; organization RLS/role matrix and IDOR
  negatives.
- Durable versioned save/resume with mobile no-data-loss evidence.
- All segment paths including regulated stop-route.
- Identity/profile confirmation before customer-facing output.
- No unsupported Team/API/white-label/integration claims.
- Sample isolation and analytics exclusion proved.
- Unit, API, integration and browser tests; TypeScript/build; 390 px keyboard,
  focus, label and contrast evidence.
- Historical proposal bytes/prices/links unchanged.
- Operator validation, Claude PASS, founder acceptance and separately authorized
  deployment.
