# Stage 5 scheduling and field-execution readiness

Status: READ-ONLY AUDIT COMPLETE / EVIDENCE-GATED

Planning evidence only. Rebind and re-audit this packet at the exact accepted
Stage 4 predecessor before implementation.

No current branch or worktree contains product implementation for agreements,
change orders, service plans, visit generation, operational workers, field time
entries, location consent or labor variance. Stage 5 is not hidden elsewhere.

## Dependencies and ordering

- R2 must be founder-accepted with hosted tenant/role/last-owner/U1 evidence and
  an accepted U8 retry/dead-letter runtime.
- Full R3 must provide stable organization, customer, property and site keys,
  immutable proposal/C0 acceptance and handoff ownership.
- Stage 3 must stabilize imported ownership keys and legacy mappings.
- Full Stage 4 must be accepted before Stage 5 implementation begins, preserving
  the founder-approved seven-stage dependency order. Stage 5 consumes the
  accepted agreement/version, change-order, invoice and payment ownership
  contracts; it does not duplicate them.
- O0 operator evidence may sequence `native`, `external` or `none` rollout per
  capability/segment, but `external` or `none` cannot mark the approved native
  scheduling/field-execution stage complete.

## Reuse; do not rebuild

- Accepted R2 organization/RBAC, active-organization, audit and outbox/inbox.
- Accepted R3 customers/properties/sites, acceptance, handoff identifiers and
  events.
- Release 1 frozen scope, cadence, person-hour and cost assumptions as planning
  inputs; never rewrite historical estimates or proposals.
- Location-pricing inputs only for bid planning. They are not a routing or
  worker-geolocation system.
- Existing migration and hosted-verification harness patterns.
- Veltex subscription billing is not customer finance and is not reusable here.

## Current code reuse map

- Reuse R2 tenant/RBAC/composite-key, command-receipt, optimistic-token,
  advisory-lock, audit/outbox/inbox and monotonic event-ordering patterns.
- Reuse R3 walkthrough schemas/routes/commands only as examples of bounded
  timezone capture, end-after-start validation, authorization, idempotency,
  overlap refusal, safe errors and reschedule concurrency. A presale
  walkthrough is not an operational visit.
- Reference immutable R3-3 estimate snapshots as the estimated baseline.
  `features/service-catalog/versions/v2` supplies deterministic planning-cost
  inputs and calculations, but neither record may be rewritten or presented as
  scheduled/actual cost.
- Reuse existing route, pricing, migration-contract and adversarial SQL test
  patterns for new service-plan/job/visit/workforce and actual-ledger borders.

No current schema implements agreements, change orders, service plans,
operational jobs/visits, workers, availability/time off, RRULE/blackouts,
generation/detachment, field time/check-ins, checklist versions, time-boxed
access-note reads, field evidence, actual costs, loaded-labor sources,
reconciliation or variance. Proposal “service agreement” prose is not the
Stage 4 agreement model. Current walkthrough timezones are bounded strings,
not proof of IANA/RRULE/DST semantics, and bid-location inputs are not routing
or worker geolocation.

## Delivery progression

### O0 — evidence and mode decision

- Prompt 13-compliant operator discovery after Bid-to-Won is usable.
- Record demand, external-system coexistence and the `native`/`external`/`none`
  choice for contracts, scheduling, field work and workforce actuals.
- Consume the counsel/accounting/provider decisions already accepted in Stage
  4; Stage 5 does not reopen or precede them.

### O1 — accepted agreement boundary

O1 is delivered by the Stage 4 F0A bridge so invoicing can precede scheduling.
Stage 5 consumes immutable agreement/version/change-order identifiers and
events; it does not create a second contract model.

### O2 — scheduling

- Service plans, jobs/phases and visits for recurring and one-off work.
- Defined RRULE subset, property IANA timezone, daylight-saving/overnight rules,
  blackout layers and idempotent rolling generation keys.
- Regeneration/detachment semantics, dispatch, assignment, conflict and travel
  warnings, availability/time off and eligibility evidence.

### O3 — online-first field execution

- Assignment-scoped, time-boxed encrypted access instructions through a logged
  RPC; never in exports, events, ICS, push or customer documents.
- Check-in/out alternatives, operational time entries, versioned checklists,
  evidence/notes/exceptions/missed/re-service and resumable idempotent sync.
- Minimum offline safety is local drafts, retry and visible not-synced state.

### O4–O7 — separately evidence-gated extensions

- O4 customer visit-email preferences, quiet hours and suppression.
- O5 full offline conflict system only after connectivity evidence.
- O6 foreground point-in-time geofence only after counsel, consent and
  jurisdiction review; never continuous/background location.
- O7 short-term-rental booking import only after demonstrated demand.

### Workforce and profitability

- Effective-dated planning-cost registry, crew templates and time categories.
- Imported actuals and append-only estimate/scheduled/actual variance.
- Approval-based calibration suggestions and provider-neutral payroll/FSM
  exports.
- Never build payroll, tax, HR, GL, banking or background-report storage.

## Required safety decisions

- Timezone: property IANA zone is authoritative; define nonexistent and repeated
  daylight-saving times, overnight attribution and UTC-duration previews.
- Location: off by default, foreground only, alternatives always available,
  versioned worker/device consent, bucketed results by default, encrypted raw
  coordinates with short TTL if ever enabled, and never customer-visible.
- Privacy: access notes and field evidence require retention, visibility and
  export-exclusion rules. Do not store SSNs, tax/bank/pay data, background
  reports or health data.
- Regulated/high-hazard work remains stop-and-route until its separate
  specialist/legal/safety gates pass.

## Release gate

- Accepted predecessor exact head and recorded mode decision.
- Cross-stage agreement/finance ownership ADR with no circular dependency.
- Additive migration/rollback and frozen-proposal hash proof.
- Organization/firm/worker/customer role matrix and IDOR negatives.
- Audit/outbox/inbox ordering, idempotency, retry and replay evidence.
- Timezone/DST/overnight/RRULE/blackout/generation/regeneration tests.
- Access-note and evidence privacy/exclusion proofs.
- Unit/API/integration/browser tests; TypeScript/build; 390 px, keyboard,
  accessibility and low-bandwidth field evidence.
- Four-week operator scheduling pilot before O2 acceptance; field-operator
  validation before O3 acceptance.
- Claude exact-candidate PASS, founder acceptance and separately authorized
  deployment/provider/spend actions.
