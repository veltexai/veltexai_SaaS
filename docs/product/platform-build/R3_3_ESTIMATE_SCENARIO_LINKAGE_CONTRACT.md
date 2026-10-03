# R3-3 estimate and scenario linkage contract

Status: **ENTRY DECISIONS RESOLVED / DEPENDENCY-BLOCKED ON R3-2 ACCEPTANCE**
Implementation may begin only after bounded R3-2 is independently reviewed,
accepted on isolated preview and founder accepted.

## 1. Purpose and authoritative boundary

R3-3 connects an opportunity and, when present, one site work package to a
deterministic estimate created with the existing Release 1 pricing engine. It
does not create the immutable customer-facing proposal-version model (R3-4),
customer acceptance (R3-5), handoff (R3-6), activation instrumentation (R3-7)
or operator notification (R3-8).

Authoritative sources:

- `CURSOR_R3_1_IMPLEMENTATION_CONTRACT.md` §1.3, §1.7 and §5.3;
- `SEVEN_STAGE_RELEASE_GATE_MATRIX.md` stage 2;
- the accepted R3-1 CRM tables, role matrix and package state machine;
- the accepted R3-2 walkthrough-evidence boundary;
- `features/service-catalog/versions/v2/pricing.ts`, its catalog/schema and
  location-pricing inputs; and
- existing proposal rows and generated proposal content, which remain owned by
  Release 1 and must not be recomposed or rewritten by this increment.

This contract is read-only preparation. It neither authorizes code nor claims
R3-3 has started.

## 2. Smallest functional first-build outcome

An authorized operator can start from an opportunity, open the existing
versioned estimating workbench with the known customer/property context, review
low/base/high deterministic scenarios, select or explicitly override the
working price, and save one append-only estimate snapshot linked to that
opportunity and optional site work package. The CRM then shows the selected
estimate and can truthfully mark that package `estimated`.

The saved snapshot is internal planning evidence. It is not a sent proposal,
contract, invoice, customer acceptance or guarantee of margin.

## 3. No-duplication decisions

1. Reuse `estimateJob` and the existing versioned catalog/job schemas. Do not
   implement pricing formulas in SQL or a second TypeScript engine.
2. Reuse organization, membership, opportunity, property, walkthrough,
   package, audit and outbox contracts. Do not create parallel CRM records.
3. Do not mutate historical proposal `generated_content`, `pricing_data`,
   `service_specific_data`, templates, tracking, PDFs or sends.
4. Do not treat the legacy proposal row as the estimate snapshot. R3-4 still
   needs an immutable proposal-version boundary; conflating the two would make
   proposal acceptance ambiguous.
5. Persist one complete versioned JSON input/output snapshot per estimate run,
   rather than normalizing every pricing driver and scenario into new tables.
   This keeps the first build auditable without duplicating the engine schema.

## 4. Proposed additive data contract

One new append-only table is sufficient:

### `crm_estimate_runs`

- `id uuid primary key`
- `organization_id uuid not null`
- `opportunity_id uuid not null`
- `work_package_id uuid null`
- `property_id uuid not null`
- `request_key text not null`
- `engine_key text not null` — initially `service_catalog`
- `engine_version text not null` — exact catalog/pricing version
- `input_snapshot jsonb not null`
- `output_snapshot jsonb not null` — exact low/base/high result and warnings
- `selected_scenario text not null` — `low`, `base`, `high` or `override`
- `selected_amount_minor bigint not null check(selected_amount_minor >= 0)`
- `currency text not null default 'USD'`
- `pricing_basis text not null` — exact supported basis such as `per_visit`,
  `per_turn`, `one_time` or `monthly`
- `input_sha256 text not null`
- `output_sha256 text not null`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`
- unique `(organization_id,id)` and `(organization_id,request_key)`
- composite foreign keys to the exact organization-bound opportunity,
  property and optional package

The table is insert-only. No authenticated UPDATE or DELETE path ships.
Superseding an estimate creates a new run; history remains inspectable.

Add nullable `estimate_run_id` to `crm_site_work_packages` with a composite
organization-bound foreign key. The package command remains the sole way to
change that pointer and uses the package's existing `updated_at` concurrency
token. A package may enter `estimated` only when its selected estimate belongs
to the same organization, opportunity, package and property.

Do not add `proposal_version_id` in R3-3. That belongs to R3-4.

## 5. Write contract

Expose one caller-bound command and private receipt behavior consistent with
R3-1/R3-2:

`command_crm_estimate_run(organization, opportunity, package, property,
request_key, engine_key, engine_version, input_snapshot, output_snapshot,
selected_scenario, selected_amount_minor, currency, pricing_basis,
expected_package_updated_at)`

Requirements:

1. Authenticate before looking up a receipt or target record.
2. Require owner/admin or the opportunity's exact assigned estimator. A
   viewer, unrelated estimator, anonymous caller and another tenant receive the
   same non-enumerating denial.
3. Bind organization, opportunity, property and optional package in the
   database; package and opportunity properties must agree.
4. Require a completed R3-2 walkthrough for commercial opportunities before
   the first estimate is saved. Residential/turnover may follow its accepted
   no-walkthrough path when the pipeline permits it.
5. Validate engine/version against the committed supported-engine allowlist.
   Reject unknown versions rather than silently interpreting their JSON.
6. Canonicalize and hash both JSON snapshots in PostgreSQL; compare the stored
   hashes on replay. The command does not recalculate prices in SQL.
7. Require the selected amount/basis/currency to match the selected scenario in
   the output snapshot, except `override`, which must include the existing
   bounded operator reason in the input snapshot.
8. Lock the package before changing its selected pointer. Exact retries return
   the original estimate; changed payload reuse fails; stale package tokens
   fail; concurrent writers cannot silently replace one another.
9. Insert ID-only audit/outbox evidence. Pricing inputs, costs, amounts,
   customer data, access notes and warnings do not enter event payloads.
10. Direct authenticated table INSERT/UPDATE/DELETE is denied. Service-role
    behavior must be explicit and tested; no browser service key is introduced.

The API must compute the snapshot with the same imported `estimateJob` used by
the workbench, validate its versioned input and output schemas, and then invoke
the command through the authenticated user client. Because authorized operators
already control manual pricing overrides, the database boundary records and
hashes the reviewed snapshot rather than duplicating pricing formulas.

## 6. Read and UI contract

- Extend the scoped CRM read projection with only the selected estimate's ID,
  engine version, selected amount, currency, basis and created timestamp.
- Full input/output snapshots are readable only by owner/admin or the exact
  assigned estimator. Viewers receive no estimate amounts, costs or pricing
  drivers.
- Board and List show the same `Estimate` action and selected-price summary.
- Opening from CRM passes server-validated organization/opportunity/package
  context to the existing workbench; customer/property fields are prefilled
  without copying real access notes into customer-facing fields.
- Saving reconciles immediately without reload, announces success/failure and
  preserves the workbench on errors.
- Prior estimate runs remain viewable as internal history; there is no edit or
  delete affordance.
- The UI must clearly say `Internal planning estimate` and must not claim a
  proposal was sent, accepted or contractually approved.

## 7. Explicit exclusions

- no new pricing formula, AI price suggestion or autonomous scenario choice;
- no proposal byte rewrite, immutable proposal version or PDF generation;
- no tracked link, email/SMS, signature or customer portal exposure;
- no acceptance, win, handoff, invoice, payment or scheduling mutation;
- no import/migration workflow; and
- no photos, attachments or access credentials.

These are preserved downstream requirements, not discarded scope.

## 8. Required executable evidence

### Database and security

- fresh 68-migration chain, repeatability and rollback;
- exact owner/admin/assigned-estimator success and viewer/unrelated/
  anonymous/cross-tenant denial;
- opportunity/property/package mismatch and unknown engine/version refusal;
- commercial incomplete-walkthrough refusal and accepted residential path;
- exact replay, changed replay, stale token and simultaneous-writer proof;
- append-only estimate history and direct DML denial;
- package `estimated` state impossible without the exact selected estimate;
- audit/outbox payloads contain identifiers only; and
- all existing proposal/content/pricing/tracking/billing and R3-2 evidence
  digests remain unchanged.

### Engine and API

- the persisted low/base/high output equals direct `estimateJob` output for
  representative commercial/residential/turnover fixtures;
- catalog version, location inputs, overrides, warning output, integer minor
  amount and pricing basis survive round-trip exactly;
- invalid/NaN/non-finite/negative/malformed snapshots reject;
- safe 404/409/422/503 route mapping and no raw database leakage; and
- no alternate unversioned pricing implementation appears in the route.

### Operator and accessibility

- desktop and genuine 390px opportunity → estimate → saved summary flow;
- Board/List parity, keyboard operation, Escape/focus return, live status,
  44px touch targets and no page-level horizontal overflow;
- saved snapshot persists across refresh and prior runs remain read-only; and
- truthfulness review confirms no proposal/send/acceptance/handoff claim.

### Release gates

- full repository tests, TypeScript, migration validation and production build;
- full disposable PostgreSQL harness with the new adversarial matrix;
- exact independent Claude `PASS` on a committed packet;
- guarded isolated-preview migration and authenticated operator evidence; and
- founder acceptance limited to R3-3.

## 9. Resolved entry decisions

Repository evidence resolves the four entry questions without changing the
existing engine or proposal records:

1. The existing `/dashboard/proposals/category` page accepts general proposal
   query parameters but does not validate CRM tenant context. R3-3 must add a
   server-validated CRM estimate entry route that loads the authenticated user,
   explicit organization, opportunity, property and optional package through
   the caller-bound CRM projection, then passes an internal typed context into
   `CatalogWorkbench`. Raw query identifiers alone are never authority.
2. The first supported engine is exactly `service_catalog` version
   `2026-09-22.2`, validated by the committed strict `jobSchema` in
   `features/service-catalog/versions/v2/schema.ts`. The stored output is the
   direct `estimateJob` result for that validated input. Adding another engine
   or version requires a new reviewed allowlist entry and fixtures.
3. A package remains nullable because R3-1 deliberately supports direct
   opportunities and residential/turnover estimating before a package exists.
   The first commercial estimate requires the exact linked work package; a
   residential or turnover estimate may be opportunity/property scoped without
   one. A later package may select that same-organization estimate only through
   its concurrency-controlled command.
4. Every first commercial estimate requires a completed R3-2 walkthrough. This
   matches the commercial starter pipeline's `requires_walkthrough` rule before
   estimating. Residential/turnover retains its committed
   `walkthrough_optional` path; when a walkthrough exists and is selected as
   evidence, it must be completed.

These decisions are approved contract inputs, not permission to start R3-3
before R3-2 receives independent review, isolated-preview acceptance and
founder acceptance.
