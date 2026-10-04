# Independent review assignment — bounded R3-3 estimate linkage

Review the exact committed archive identified by the packet SHA-256 supplied
with this assignment. Treat the archive as read-only. Do not access hosted
Supabase, Vercel, production, credentials, customer data, or external services.

Return exactly `PASS` or `FAIL`, followed by concrete findings ordered by
severity. A pass means no launch-blocking correctness, tenant isolation,
authorization, replay/concurrency, data-loss, pricing-integrity,
truthfulness, accessibility, or essential-workflow defect remains within R3-3.

## Bounded intended outcome

An authorized owner/admin or exact assigned estimator opens the existing
deterministic service-catalog workbench from an opportunity, reviews
low/base/high or a reasoned override, and appends an internal estimate snapshot
linked to the opportunity and optional package. The CRM immediately shows the
selected summary and prior runs remain read-only. This is not a proposal,
contract, acceptance, handoff, invoice, payment, attachment, or AI price.

## Required review

1. Audit migration `20261004000000_r3_3_estimate_scenario_linkage.sql` for
   organization-bound foreign keys, append-only behavior, authorization before
   receipt lookup, exact assigned-estimator checks, explicit refusal of
   commercial estimates until a dedicated engine exists, engine/version allowlisting, canonical hashes,
   scenario/amount/basis agreement, package locking, exact replay, changed
   replay, stale-token behavior, ID-only events and explicit service-role denial.
2. Audit the API for strict v2 input/output validation, direct imported
   `estimateJob` use, integer minor units, safe 400/404/409/422/503 responses,
   and absence of a second pricing implementation.
3. Audit the server CRM entry route for tenant/context validation rather than
   trusting query IDs. Confirm package/property/opportunity agreement.
4. Audit Board/List parity, prerequisite messaging, customer/property prefill,
   low/base/high and reasoned override selection, truthful internal-estimate
   labeling, error preservation, immediate reconciliation, append-only history,
   keyboard/touch semantics and likely 390px behavior.
5. Explicitly assess the commercial boundary: Board, List, server entry route,
   API and database must consistently refuse commercial estimates while the
   only allowlisted engine is the residential/turnover v2 model. Do not invent
   a new engine in review.
6. Inspect executable evidence rather than trusting prose: route/workbench/CRM
   tests, the 68-version validator, R3-3 adversarial matrix, definer allowlist,
   and the two-session package-token race.
7. Confirm no proposal bytes, sends, acceptances, handoffs, billing, photos,
   videos, access credentials, or hosted systems are mutated by this increment.

Also verify the command is callable only by the server service role, still
authorizes the supplied real actor inside the database, strips private access
notes, cannot regress later package states, and binds a package pointer to the
exact opportunity/property/package/run tuple.

Local evidence reported by the implementer will be frozen with the replacement
packet after remediation: full Jest, TypeScript, production build, 68-version
migration validation, and a
fresh disposable PostgreSQL 16 full harness including
`R3_3_ADVERSARIAL_ROLE_MATRIX_PASS` and `R3_3_CONCURRENCY_PASS`.
