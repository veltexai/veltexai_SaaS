# R3-4 immutable proposal-version contract

Status: **ENTRY GATE SATISFIED / LOCAL IMPLEMENTATION AUTHORIZED**

R3-4 could start only after R3-3 had an independent `PASS`, isolated-Preview
acceptance and founder acceptance. Those prerequisites are now satisfied on
exact accepted R3-3 application commit
`44ca80391bd570fa5dc717686163f999529fe432`. This document freezes the
smallest useful first-build boundary so local implementation can proceed
without reopening accepted R2, R3-1, R3-2 or deterministic-estimate decisions.
This status does not authorize Preview or Production mutation.

## 1. Outcome

An authorized operator can take one existing Veltex proposal working copy,
bind it to its exact CRM opportunity/property, selected R3-3 estimate run and
optional site package, review the customer-visible scope and price, and publish
an immutable proposal version. The CRM can then truthfully identify the exact
version prepared for a package.

Publishing does not send the proposal, accept it, mark an opportunity won,
create a contract, generate an invoice, schedule work or hand off operations.
Those remain R3-5 and later gates.

## 2. Existing records remain authoritative

1. `public.proposals` remains the Release 1 editable working copy. R3-4 does
   not replace it or reinterpret earlier proposal rows as immutable versions.
2. `public.crm_estimate_runs` remains the append-only internal pricing
   evidence. R3-4 references one exact run and never recalculates its price.
3. Existing organization, opportunity, customer, property, package, audit and
   outbox records are reused. No parallel CRM or pricing model is introduced.
4. Customer-facing proposal versions exclude internal costs, margins, access
   notes, private walkthrough notes and other operator-only estimate fields.
5. Existing PDF, email, tracked-link and public-view paths are not silently
   switched to versions. A later reviewed adapter must explicitly consume an
   exact version before those paths are enabled for R3 proposal delivery.

## 3. Additive data boundary

Add one append-only table, `crm_proposal_versions`:

- `id uuid primary key`
- `organization_id uuid not null`
- `proposal_id uuid not null`
- `opportunity_id uuid not null`
- `property_id uuid not null`
- `work_package_id uuid null`
- `estimate_run_id uuid not null`
- `version_number integer not null check (version_number > 0)`
- `request_key text not null`
- `content_snapshot jsonb not null` — schema-versioned customer-visible fields
- `rendered_content text not null` — reviewed customer-visible source bytes
- `display_amount_minor bigint not null check (display_amount_minor >= 0)`
- `currency text not null default 'USD'`
- `pricing_basis text not null`
- `content_sha256 text not null`
- `rendered_sha256 text not null`
- `estimate_input_sha256 text not null`
- `estimate_output_sha256 text not null`
- `schema_version text not null` — initially `crm_proposal_version.v1`
- `created_by uuid not null`
- `created_at timestamptz not null default now()`

Required keys and relationships:

- unique `(organization_id,id)`;
- unique `(organization_id,proposal_id,version_number)`;
- unique `(organization_id,request_key)`;
- organization-bound foreign keys to the proposal, opportunity, property,
  optional package and estimate run;
- the estimate and package must belong to that exact opportunity/property;
- the proposal's CRM opportunity/customer/property linkage must agree; and
- the displayed amount, currency and basis must equal the selected R3-3 run.

Add nullable `proposal_version_id` to `crm_site_work_packages`, protected by an
organization-bound foreign key. Only the R3-4 command may set or replace the
pointer while the package remains in a pre-proposal state. The command moves
the package to `proposed` only when a separately reviewed delivery record later
proves customer delivery; publishing alone leaves it `estimated`.

Rows are insert-only. Corrections create the next version; no authenticated
UPDATE or DELETE path ships. Version numbers are allocated while locking the
proposal and package, so simultaneous publishers cannot create duplicates or
silently replace a selected version.

## 4. Content snapshot contract

`content_snapshot` contains only a strict versioned allowlist:

- proposal title and customer-facing introduction;
- organization display identity approved for the proposal;
- customer and service-location display fields;
- service type, frequency and customer-visible scope lines;
- exclusions, assumptions and customer-visible terms;
- selected price, pricing unit and optional initial-clean line;
- template/design identifier and renderer version; and
- the exact selected estimate/version identifiers for provenance.

It must reject unknown top-level keys and any known private fields, including
labor rates, modeled costs, margins, overhead, payroll burden, access text,
internal notes, raw walkthrough evidence, internal warnings and operator-only
override rationale. Hashing uses the repository's canonical JSON contract;
rendered text is hashed as exact UTF-8 bytes.

The stored version is the acceptance source for R3-5. R3-5 may record customer
acceptance only against the exact version ID and both stored hashes; it must
never accept the mutable `proposals` working row.

## 5. Write command

Expose one private server command equivalent to:

`command_crm_publish_proposal_version_internal(actor, organization, proposal,
opportunity, package, property, estimate_run, request_key, schema_version,
content_snapshot, rendered_content, expected_package_updated_at)`

The command must:

1. authorize the real actor before receipt lookup;
2. permit owner/admin or the opportunity's exact assigned estimator;
3. return the same non-enumerating denial for viewer, unrelated estimator,
   anonymous caller, another tenant and unknown records;
4. bind every supplied ID through organization-scoped foreign keys and verify
   proposal/opportunity/property/package/estimate agreement;
5. require an R3-3 estimate run and ensure its selected amount, currency and
   basis exactly match the customer-visible snapshot;
6. reject terminal opportunities and proposed/accepted/declined packages;
7. validate the strict v1 content schema before hashing or insertion;
8. allocate the next version under lock, insert once and update the package
   pointer with its existing optimistic-concurrency token;
9. return the original version for an exact idempotent retry, reject changed
   payload reuse and reject stale/concurrent package updates;
10. emit identifier-only audit/outbox evidence; and
11. deny authenticated direct table DML and direct execution of the internal
    service-role command.

The route composes the snapshot with existing Release 1 document utilities,
validates it again, and invokes the private command with the server service
client. The database validates binding, schema, amount and hashes; it does not
contain a second proposal renderer or pricing engine.

## 6. Read and operator experience

- Board and List expose the same `Prepare proposal version` action only when
  the opportunity, property and selected R3-3 estimate prerequisites exist.
- The server entry route resolves tenant and record context; query IDs are not
  authority.
- The operator reviews customer-visible content, price and scope before
  publishing. Private estimate economics are clearly separated.
- Success reconciles immediately and shows version number, created time and
  immutable status. Earlier versions remain readable with no edit/delete UI.
- An edit begins from the mutable proposal working copy and publishes a new
  version. It never modifies a prior version.
- Desktop and genuine 390px flows require keyboard operation, focus return,
  live success/error messaging, 44px targets and no page-level overflow.
- Copy uses `proposal version` or `prepared proposal`; it must not say sent,
  signed, accepted, contracted or won.

## 7. Explicit exclusions

- customer acceptance, signer identity, consent receipt or signature claims;
- tracked links, email/SMS send, public portal or delivery proof;
- automatic stage movement to proposing, negotiating, won or handed off;
- PDF recomposition, billing, payment, scheduling or field execution;
- AI-generated pricing or autonomous scope changes; and
- photo/video storage or multimodal inference.

## 8. Required proof before acceptance

### Database and security

- fresh 69-migration replay with definer allowlist;
- owner/admin/assigned-estimator success and every negative role/tenant case;
- exact organization/opportunity/property/package/proposal/estimate binding;
- strict privacy-key rejection and customer-visible amount agreement;
- append-only DML denial, exact replay, changed replay, stale token and a true
  two-session version-allocation/package-pointer race;
- terminal-state and lifecycle-regression refusal; and
- identifier-only audit/outbox payload assertions.

### Application and truthfulness

- representative residential and turnover versions reproduce the reviewed
  customer-visible Release 1 content and selected R3-3 price;
- changing the working copy produces a new version and leaves old bytes/hash
  unchanged;
- refresh preserves version history and package linkage;
- no internal economics or access-adjacent fields appear in stored snapshots,
  rendered bytes, logs or error responses; and
- no send, acceptance, contract, signature, win or handoff claim appears.

### Release gates

- focused and full tests, TypeScript, migration validation, production build,
  diff hygiene and disposable PostgreSQL harness;
- exact independent Claude `PASS` and complementary operator/accessibility
  audit on one committed packet;
- guarded isolated-Preview migration, authenticated desktop/390px evidence and
  preservation fingerprints for existing proposal/tracking content; and
- explicit founder acceptance limited to R3-4.

## 9. Entry decisions resolved by repository evidence

1. Immutable versions are additive children of the mutable Release 1 proposal;
   rewriting `public.proposals` would break existing edit/send/tracking paths.
2. R3-3 selected amount and hashes are the pricing provenance; R3-4 does not
   persist another internal estimate snapshot.
3. Package selection remains optional for direct residential/turnover
   opportunities, but when supplied it is exact-bound and concurrency guarded.
4. Publishing is not delivery. Package status remains `estimated` until a later
   reviewed delivery record satisfies the existing proposed-state evidence
   gate.
5. The first version schema supports existing residential and turnover output.
   Commercial and specialty proposal-version publishing waits for their
   dedicated deterministic estimate/service-pack support rather than relabeling
   residential output.

## 10. Next action

Implement only this additive R3-4 boundary on top of the accepted R3-3 bytes.
Begin with the append-only schema, private publish command, exact binding and
privacy/concurrency/idempotency matrices. Application composition and operator
UI follow only after that server contract is executable. Hosted Preview remains
a separately reviewed and approved gate; Production remains excluded.
