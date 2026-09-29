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
| 1 | R2 organization and tenancy | R2a foundations plus the R2b C0 security dependency needed by Bid-to-Won | Verified Release 1/R0 base and exact migration-chain reconciliation | Organizations and memberships; owner/admin/estimator/viewer authorization; single-user backfill; active-org semantics; immutable audit; outbox/inbox; U1 benchmark; U8 decision; C0-compatible token boundary; exact migrations/rollback; cross-tenant and concurrency matrices; hosted preview; responsive/operator checks; independent Claude PASS; founder acceptance | **IN PROGRESS / NOT RELEASED.** Candidate `d128518`; local gates and PostgreSQL 034 equivalence pass. Exact packet awaits Claude upload approval. Then run the 23 guarded prerequisite steps on isolated preview `ynzkwctwlssjcsjmahey`, apply R2 atomically, run hosted matrices and complete founder acceptance. |
| 2 | R3 Bid-to-Won | R3 Slice 1 plus the preserved later R3 increments required for the full approved stage | Stage 1 accepted; Release 1 truthfulness gates closed; U1 evidence and U8 runtime decision recorded | Customers/contacts/properties; opportunities, configurable pipelines, site packages, append-only stage history and tasks; walkthrough evidence; estimate/scenario links; immutable proposal versions; secure C0 acceptance/receipt; provider-neutral handoff; A0–A8 activation instrumentation; operator notification; role/RLS and IDOR proof; accessibility; real-format handoff/operator evidence; Claude PASS; founder acceptance | **NOT STARTED.** Read-only audit proves no product implementation exists. Reuse `CURSOR_R3_1_IMPLEMENTATION_CONTRACT.md`; do not rebuild R2 or modify proposal bytes/pricing/tracking/billing. |
| 3 | Onboarding and migration | R4 companion onboarding/import/export and the deferred Release 1 segment-onboarding obligations | Stage 2 domain contracts stable; organization ownership and customer/property keys accepted | Segment-aware organization onboarding for commercial, residential/turnover and ordinary specialty operators; CSV import with preview, validation, dedupe, resumability and audit; legacy user/proposal mapping preserving bytes/prices/links; organization export/deletion handling; truthful plan/capability seeding; accessibility; representative import fixtures and operator completion evidence; Claude PASS; founder acceptance | **PLANNED / NOT IMPLEMENTED.** Prompt 12 and R3 contract retain this scope; it must not be folded into R3-1 or silently omitted. |
| 4 | Invoicing and payments | Finance progression: finance handoff first, native invoicing F3 and hosted payments F4 only through their explicit gates | Accepted contract/work/service ownership and organization entitlement model; accounting decisions recorded | Invoice lifecycle, numbering, taxes/discounts/deposits/credits/refunds, immutable financial events, reconciliation and dunning; role separation; accounting export; Stripe/webhook idempotency if payments are enabled; PCI and counsel/accountant review; hosted sandbox evidence; accessibility; operator validation; Claude PASS; founder acceptance | **PLANNED / GATED.** Native invoicing/payments were deliberately gated in Prompt 14. Do not implement them against legacy single-user records or before contract/financial ownership is settled. |
| 5 | Scheduling and field execution | Contracts/service plans/jobs/visits, followed by workforce/time and offline field work | Accepted customers/properties/contracts and financial ownership; operator evidence that native FSM is needed | Recurring and one-off service plans; jobs/visits; assignment, availability and conflict handling; mobile/offline-safe field workflow; time, proof and exception capture; access-note privacy; audit/idempotency; timezone/DST and recurrence proof; 390 px/accessibility checks; field operator validation; Claude PASS; founder acceptance | **PLANNED / EVIDENCE-GATED.** Prompt 14 places native scheduling after Bid-to-Won and only when FSM-less demand is proven. The full founder-approved stage remains preserved. |
| 6 | Customer portal and quality assurance | C0 is part of Bid-to-Won; C1–C7 portal and Q1+ inspections/quality follow after evidence gates | Stage 2 C0 security accepted; contract/visit ownership stable; privacy and retention decisions recorded; B12/B13 evidence thresholds met | Customer-scoped identity/token model; proposal/contract/service/invoice visibility appropriate to enabled modules; communication and issue workflows; inspection templates/results/corrective actions; attachment privacy; notification consent/suppression; WCAG 2.2 AA target evidence; tenant/IDOR tests; operator/customer validation; Claude PASS; founder acceptance | **C0 DEPENDENCY IN STAGE 2; EXPANDED STAGE NOT STARTED.** Read-only portal audit says existing tracked-link logic is prototype-only and requires redesign before reuse. |
| 7 | Ordinary-specialty business breadth | Evidence-gated specialty packs, catalogs and workflows; regulated/high-hazard remains separately blocked | Stable catalog/versioning and pricing contracts; accepted onboarding; service-specific research and operator evidence | Ordinary specialty packs for approved services such as carpet, floor care, ground-level windows and post-construction; service-specific intake, units, productivity, equipment, scope/exclusions and safety flags; versioned pricing with regional/operator evidence; regression across existing five services; truthful marketing/onboarding; accessibility; specialty-operator validation; Claude PASS; founder acceptance | **FOUNDATION PARTIAL / STAGE NOT COMPLETE.** Release 1 catalogs and all-cleaning roadmap exist; broad production enablement and ordinary-specialty operator gates remain open. Regulated, biohazard and high-hazard workflows are not included without their specialist/legal/safety gates. |

## Immediate critical path

1. Obtain action-time approval and submit the integrity-verified `d128518`
   recovery packet to the existing Claude R2 review task.
2. Accept only an exact-candidate PASS or remediate its findings locally.
3. Execute the 23 generated prerequisite migrations sequentially on isolated
   preview `ynzkwctwlssjcsjmahey`; stop at the first failed postcondition.
4. Regenerate and apply the R2 atomic bundle against that fresh-preview
   fingerprint, then run role/tenant, last-owner concurrency, U1, tracked-link,
   PDF/send, signup-bootstrap and browser/operator matrices.
5. Freeze the accepted R2 head. Only then issue the bounded Cursor hardening
   assignment and begin R3-1 schema/RLS from the accepted head.

## No-duplication references

- Authoritative state: `docs/OPERATING_STATE_AND_DECISION_LEDGER.md`
- R2 roles/RLS: `R2_ROLE_AND_RLS_MATRIX.md`
- R2 hosted sequence: `R2_ISOLATED_PREVIEW_OPERATOR_EXECUTION_PACKET.md`
- R2 Cursor preflight: `R2_CURSOR_INTEGRATION_PREFLIGHT.md`
- R3 first increment: `CURSOR_R3_1_IMPLEMENTATION_CONTRACT.md`
- Full product architecture and gates: the founder-provided Prompt 1–14 reports,
  especially `CLAUDE_PROMPT14_FINAL_SYNTHESIS_AND_EXECUTABLE_RELEASE_ROADMAP.md`
- Cleaning breadth: `docs/product/ALL_CLEANING_SERVICES_EXPANSION_MASTER_PLAN.md`
