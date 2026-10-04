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
   unsupported commercial, specialty and NULL-segment estimates until dedicated
   engines exist, exact residential/turnover snapshot-segment mapping,
   engine/version allowlisting, canonical hashes,
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
5. Explicitly assess the supported-segment boundary: Board, List, server entry
   route, API and database must allow only residential and turnover, must map
   turnover only to `short_term_rental`, and must consistently refuse
   commercial, specialty, NULL and disguised-segment estimates while the only
   allowlisted engine is the residential/turnover v2 model. Do not invent a new
   engine in review.
6. Inspect executable evidence rather than trusting prose: route/workbench/CRM
   tests, the 68-version validator, R3-3 adversarial matrix, definer allowlist,
   and the two-session package-token race.
7. Confirm no proposal bytes, sends, acceptances, handoffs, billing, photos,
   videos, access credentials, or hosted systems are mutated by this increment.

Also verify the command is callable only by the server service role, still
authorizes the supplied real actor inside the database, strips private access
notes, cannot regress later package states, and binds a package pointer to the
exact opportunity/property/package/run tuple.

## Mandatory regression of both prior FAIL verdicts

Do not return `PASS` unless source plus executable evidence closes each item:

1. The real workbench request omits the private `access` field and the route
   still accepts and validates that exact privacy-stripped request instead of
   returning `400`.
2. Commercial, specialty and NULL-segment opportunities cannot be disguised as
   residential or turnover at the page, API or SQL boundary.
3. Opening/reviewing an estimated package cannot demote it to scoping, and
   proposed/accepted/declined packages are read-only and reject new commands.
4. An exact idempotent replay still returns the original result after the
   package later advances; a changed payload with the same key still fails.
5. The displayed selected price, cost and margin are derived from the selected
   low/base/high or override scenario, not always from the base scenario.
6. Access-adjacent fields (`access`, scheduling, scope additions, cover letter,
   company name, operator notes and turnover restock text) are neither retained
   in the immutable snapshot nor accepted by SQL.
7. Fractional-cent overrides fail deterministically at the route boundary; the
   frozen v2 catalog schema is not globally narrowed to accomplish this.
8. Missing service configuration and thrown RPC failures produce bounded generic
   recovery responses, not leaked internals or an unhandled `500`.
9. The executable role matrix directly covers assigned and unassigned
   estimators, viewers, cross-tenant/package binding, private fields,
   specialty/NULL refusal, lifecycle regression, replay-after-lifecycle and
   authenticated direct-table/RPC denial. Do not accept prose-only claims.
10. The server entry page itself enforces the supported segment and package
    lifecycle allowlists; Board affordance hiding alone is insufficient.

Local evidence reported by the implementer will be frozen with the replacement
packet after remediation: full Jest, TypeScript, production build, 68-version
migration validation, and a
fresh disposable PostgreSQL 16 full harness including
`R3_3_ADVERSARIAL_ROLE_MATRIX_PASS` and `R3_3_CONCURRENCY_PASS`.
