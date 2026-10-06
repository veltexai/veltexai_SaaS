# Veltex AI seven-stage release gate matrix

Status: ACTIVE — dependency and no-duplication control

This matrix maps the founder-approved seven-stage objective onto the canonical
Prompt 1–14 architecture and the current repository evidence. It does not
reduce the final product scope, convert a later module into a completed one, or
authorize deployment. A stage is complete only when its entire exit gate has
current evidence.

## Rules common to every stage

1. Start from the accepted predecessor head; never from the dirty main checkout
   or an older Cursor/Claude branch.
2. Codex owns implementation integration, database migrations, authorization,
   shared contracts, test evidence and the operating ledger.
3. Cursor receives bounded UI/accessibility work only after Codex freezes the
   corresponding server contract.
4. Claude independently reviews an exact commit or commit range and returns
   findings with executable evidence. Claude does not mutate the release branch.
5. Required evidence is proportional to the feature: migration and rollback,
   tenant/role and IDOR negatives, unit/integration/E2E tests, TypeScript,
   production build, security/privacy/accessibility checks, isolated hosted
   execution, operator validation, rollback rehearsal and founder acceptance.
6. Production deployment, credentials, payments, external messages and preview
   deletion retain their action-specific gates.
7. A downstream stage may have read-only research or a contract prepared while
   blocked, but implementation cannot begin until its entry gate passes.

## Dependency order and current truth

| # | Founder-approved stage | Canonical Prompt 14 mapping | Entry gate | Required exit evidence | Current status / next unfinished outcome |
|---|---|---|---|---|---|
| 1 | R2 organization and tenancy | R2a foundations plus the R2b C0 security dependency needed by Bid-to-Won | Verified Release 1/R0 base and exact migration-chain reconciliation | Organizations and memberships; owner/admin/estimator/viewer authorization; single-user backfill; active-org semantics; immutable audit; outbox/inbox; U1 benchmark; U8 decision; C0-compatible token boundary; exact migrations/rollback; cross-tenant and concurrency matrices; hosted preview; responsive/operator checks; independent Claude PASS; founder acceptance | **COMPLETE / VERIFIED IN PRODUCTION.** The exact 64-migration reconciliation committed with stable catalog, effective-privilege, invariant and normalized-content hashes; the postflight production capture matched the reviewed contract. R2 is the frozen release base and must not be rebuilt. |
| 2 | R3 Bid-to-Won | R3 Slice 1 plus the preserved later R3 increments required for the full approved stage | Stage 1 accepted; Release 1 truthfulness gates closed; U1 evidence and U8 runtime decision recorded | Customers/contacts/properties; opportunities, configurable pipelines, site packages, append-only stage history and tasks; walkthrough evidence; estimate/scenario links; immutable proposal versions; secure C0 acceptance/receipt; provider-neutral handoff; A0–A8 activation instrumentation; operator notification; role/RLS and IDOR proof; accessibility; real-format handoff/operator evidence; Claude PASS; founder acceptance | **IN PROGRESS.** Bounded R3-1, R3-2 and R3-3 are `COMPLETE / VERIFIED / ACCEPTED`. R3-3's additive 68th migration, deterministic-engine linkage, scoped CRM entry route, Board/List summary and append-only history passed independent review, isolated-Preview PostgreSQL 17, hosted desktop save/persistence, genuine 390px acceptance and founder acceptance on exact application commit `44ca803`. The first R3-4 69th-migration packet `6e3345c` received independent Claude and Cursor `FAIL` verdicts. Its coherent local remediation now passes the full 69-migration PostgreSQL harness, application regression, production build and focused operator recovery/preview gates: authorization precedes source reads, rendered bytes are bound to the allowlisted snapshot and selected price, relied-upon bindings/pointers are guarded, and the operator reviews exact content/price/scope with explicit stale-token and deliberate-new-version controls. R3-4 is `LOCAL REMEDIATION VERIFIED / INDEPENDENT RE-REVIEW REQUIRED`; it is not accepted and does not unlock R3-5. Production remains on the accepted R2 base; R3-1 has entered a separately gated controlled production-release preflight. The multimodal M0–M5 track follows R3-3 without replacing deterministic pricing. R3-5 through R3-8 remain required. |
| 3 | Onboarding and migration | R4 companion onboarding/import/export and the deferred Release 1 segment-onboarding obligations | Stage 2 domain contracts stable; organization ownership and customer/property keys accepted | Segment-aware organization onboarding for commercial, residential/turnover and ordinary specialty operators; CSV import with preview, validation, dedupe, resumability and audit; legacy user/proposal mapping preserving bytes/prices/links; organization export/deletion handling; truthful plan/capability seeding; accessibility; representative import fixtures and operator completion evidence; Claude PASS; founder acceptance | **PLANNED / NOT IMPLEMENTED.** Prompt 12 and R3 contract retain this scope; it must not be folded into R3-1 or silently omitted. |
| 4 | Invoicing and payments | Contract-boundary bridge → finance handoff F2 → native invoicing F3 and hosted payments F4 only through their explicit gates | Stage 3 accepted; organization/customer/proposal/acceptance ownership stable; accounting decisions recorded | Immutable agreement/version and change-order ownership bridge; invoice lifecycle, numbering, taxes/discounts/deposits/credits/refunds, immutable financial events, reconciliation and dunning; role separation; accounting export; organization-connected provider/webhook idempotency; PCI and counsel/accountant review; hosted sandbox evidence; accessibility; operator validation; Claude PASS; founder acceptance | **PLANNED / GATED.** F0B decisions precede F0A release. External-mode increments may ship earlier, but Stage 4 is not complete until native invoicing and hosted-payment gates pass. Do not implement against legacy single-user records or reuse Veltex subscription billing. |
| 5 | Scheduling and field execution | Service plans/jobs/visits after the accepted agreement boundary, followed by workforce/time and evidence-gated offline field work | Full Stage 4 accepted, including stable agreement/change-order, invoice/payment ownership and finance event contracts; operator evidence that native FSM is needed | Recurring and one-off service plans; jobs/visits; assignment, availability and conflict handling; mobile/offline-safe field workflow; time, proof and exception capture; access-note privacy; audit/idempotency; timezone/DST and recurrence proof; 390 px/accessibility checks; field operator validation; Claude PASS; founder acceptance | **PLANNED / EVIDENCE-GATED.** The approved dependency order requires full Stage 4 acceptance before implementation. Segment rollout may coexist with external tools but cannot redefine Stage 5 completion. “Offline-safe” means local drafts/idempotent retry first; it does not pre-authorize a full offline-first system. |
| 6 | Customer portal and quality assurance | C0 is part of Bid-to-Won; C1–C7 portal and Q1+ inspections/quality follow after evidence gates | Stage 2 C0 security accepted; contract/visit ownership stable; privacy and retention decisions recorded; B12/B13 evidence thresholds met | Customer-scoped identity/token model; proposal/contract/service/invoice visibility appropriate to enabled modules; communication and issue workflows; inspection templates/results/corrective actions; attachment privacy; notification consent/suppression; WCAG 2.2 AA target evidence; tenant/IDOR tests; operator/customer validation; Claude PASS; founder acceptance | **C0 DEPENDENCY IN STAGE 2; EXPANDED STAGE NOT STARTED.** Read-only portal audit says existing tracked-link logic is prototype-only and requires redesign before reuse. |
| 7 | Ordinary-specialty business breadth | Evidence-gated specialty packs, catalogs and workflows; regulated/high-hazard remains separately blocked | Stable catalog/versioning and pricing contracts; accepted onboarding; service-specific research and operator evidence | Ordinary specialty packs for approved services such as carpet, floor care, ground-level windows and post-construction; service-specific intake, units, productivity, equipment, scope/exclusions and safety flags; versioned pricing with regional/operator evidence; regression across existing five services; truthful marketing/onboarding; accessibility; specialty-operator validation; Claude PASS; founder acceptance | **FOUNDATION PARTIAL / STAGE NOT COMPLETE.** Release 1 catalogs and all-cleaning roadmap exist; broad production enablement and ordinary-specialty operator gates remain open. Regulated, biohazard and high-hazard workflows are not included without their specialist/legal/safety gates. |

## Immediate critical path

1. Preserve exact accepted R3-3 candidate `44ca803`, its independent `PASS`,
   isolated-Preview database/application evidence and founder acceptance.
2. Complete the separately gated R3-1 controlled production release from exact
   commit `0d765d7` before preparing a cumulative R3-2/R3-3 production artifact.
3. Remediate the independently confirmed R3-4 security, data-binding and
   operator-flow defects, expand the exact proofs and obtain independent delta
   `PASS` verdicts before any isolated-Preview or responsive acceptance step.
   The prepared R3-5 contract remains dependency-blocked.
4. Continue the approved multimodal M0 privacy/product decisions without
   replacing deterministic pricing; this is not production authorization.

## No-duplication references

- Authoritative state: `docs/OPERATING_STATE_AND_DECISION_LEDGER.md`
- R2 roles/RLS: `R2_ROLE_AND_RLS_MATRIX.md`
- R2 hosted sequence: `R2_ISOLATED_PREVIEW_OPERATOR_EXECUTION_PACKET.md`
- R2 Cursor preflight: `R2_CURSOR_INTEGRATION_PREFLIGHT.md`
- R3 first increment: `CURSOR_R3_1_IMPLEMENTATION_CONTRACT.md`
- Full product architecture and gates: the founder-provided Prompt 1–14 reports,
  especially `CLAUDE_PROMPT14_FINAL_SYNTHESIS_AND_EXECUTABLE_RELEASE_ROADMAP.md`
- Cleaning breadth: `docs/product/ALL_CLEANING_SERVICES_EXPANSION_MASTER_PLAN.md`
