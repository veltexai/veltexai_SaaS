# R3-1 implementation contract — first CRM / sales-pipeline slice

Status: **PREPARED / NOT STARTED**  
Date: 2026-09-25 Pacific  
Revision: Codex review correction, 2026-09-25 Pacific — increment wording, R3 completion map, R2 HEAD, ledger authority, R4/S5/S7 retention  
Author: Cursor (contract only)  
Audience: Codex (integration owner) for review before any implementation  
Authorization: this document authorizes **nothing**. It does not start migrations, UI, APIs, hosted work, merge, push, deployment, spend or customer messaging.

---

## 0. Source resolution (do not treat the assignment filenames as present)

The assignment named two files that are **absent** from `/Users/Antho/Downloads` and the repository:

| Requested filename | Result |
|---|---|
| `CLAUDE_PROMPT3_CRM_AND_SALES_PIPELINE_BLUEPRINT.md` | **Not found** |
| `CLAUDE_PROMPT14_IMPLEMENTATION_ROADMAP_AND_HANDOFF_PLAN.md` | **Not found** |

The only Prompt 3 / Prompt 14 artifacts present, and the Codex reviews that bind them, are:

| Artifact | Path | SHA-256 |
|---|---|---|
| Prompt 3 specification | `/Users/Antho/Downloads/CLAUDE_PROMPT3_CRM_AND_SALES_PIPELINE_SPECIFICATION.md` | `4c2f3750767793a2142dae19a4f39ac93918d9fac72181d02e5f6db607838d48` |
| Prompt 3 Codex review | `docs/product/cleaning-business-os/PROMPT3_CODEX_REVIEW_AND_DECISIONS.md` | `eb804cda2cc5df9d28dc37b7f313f6ace5c45d050b9077cd4d33eb3ae61c9a28` |
| Prompt 14 synthesis / roadmap | `/Users/Antho/Downloads/CLAUDE_PROMPT14_FINAL_SYNTHESIS_AND_EXECUTABLE_RELEASE_ROADMAP.md` | `a2d0eac0840079b4142232357aaa7d44888c78db6dfd69f935d1e8b1f8fbc25c` (matches the hash recorded in the Prompt 14 Codex review) |
| Prompt 14 Codex review | `docs/product/cleaning-business-os/PROMPT14_CODEX_REVIEW_AND_DECISIONS.md` | `1a6e1bde2d360f18da3a3195093b1e106896196b7f8ae9396526c7f3f041d4f3` |
| Prompt 2 Codex review (tenancy / U5 / 100D) | `docs/product/cleaning-business-os/PROMPT2_CODEX_REVIEW_AND_DECISIONS.md` | read in full for U1–U12 and “Architecture gates carried into Prompt 3” |
| Operating ledger for this lane | `/private/tmp/veltex-r2-integration/docs/OPERATING_STATE_AND_DECISION_LEDGER.md` | **Authoritative for R2 / R3-1 coordination.** Records the R2 local integrated PASS at product candidate `f99bb54`, the atomic preview harness at `302220d`, and the evidence-only ledger record at HEAD `bab6ae8`. Does not record an R3-1 start. The main-checkout copy of this filename is not the authority for this lane. |
| R2 coordination | `/private/tmp/veltex-r2-integration/docs/product/platform-build/COORDINATION_PLAN.md` | next-wave rule: customer/property work starts only after org identifiers, roles and authorization are frozen |
| Founder acceleration note | `docs/product/cleaning-business-os/FOUNDER_APPROVED_ACCELERATED_BUILD_STRATEGY.md` | Week 2–4 *target lane* bundles org + CRM + walkthrough workspace + estimates; it is a schedule hypothesis, not a license to collapse those into one R3-1 commit |

**No requirement in this contract is invented.** Where sources disagree, the contradiction is named. R3-1 uses the Prompt 3 S1+S2 reading as the **first implementation increment only**. That sequencing does **not** redefine or shrink the approved Prompt 14 **R3** Bid-to-Won stage. Codex must confirm the increment reading before coding.

The assignment’s paraphrased stage list (`lead`, `qualified`, `walkthrough_scheduled`, `walkthrough_completed`, `proposal_drafted`, `proposal_sent`, `negotiation`, `won`, `lost`, `dormant`) is **not** used. Prompt 3 §3.1 is the only canonical category set.

---

## 1. Exact source evidence

### 1.1 What R3-1 is

**R3-1** is the smallest first **bounded implementation increment** of the CRM / sales-pipeline track after **R2 acceptance**. It is Prompt 3 **S1 + S2 only** (Prompt 3 §12.3):

- **S1:** customers, contacts, properties; manual entry; in-product dedupe *prompts* (no auto-merge on save).
- **S2:** configurable pipelines; the two starter templates; canonical stage categories; opportunities; optional site work packages; append-only stage history; tasks / next actions; loss / disqualify reasons; reactivation as a *new* linked opportunity.

R3-1 is an increment of approved **R3**, not a replacement for it. Completing R3-1 does **not** make R3 complete and does **not** authorize calling Bid-to-Won Slice 1 done.

### 1.2 Approved R3 is unchanged

Prompt 14 §4 **R3 — Commercial Bid-to-Won Slice 1** remains the approved stage. Codex Prompt 14 decision 6 remains binding. R3-1 **does not redefine, rename, or shrink** that stage.

Approved R3 still **includes** (Prompt 14 §4 R3; Prompt 14 Codex decision 6):

- customers / contacts / properties, including multi-site parent + site packages (U5);
- persisted walkthrough evidence (notes; photos only after privacy review);
- commercial estimate / workbench with scenarios (deterministic engine);
- immutable proposal versions;
- C0 review + “Accept proposal” + receipt;
- provider-neutral handoff package (CSV/PDF/JSON);
- A0–A8 activation instrumentation;
- audit trail;
- minimal operator notifications (acceptance received).

Approved R3 still **excludes** scheduling, jobs, timekeeping, payroll, invoicing, payments, full portal, QA, inventory, named integrations, native SMS and AI vision.

R3-1 **defers** the remaining approved R3 inclusions to later R3 increments in §1.3. Deferred is not deleted.

### 1.3 Required R3 completion map

R3 may be called **COMPLETE** only after every increment below is separately implemented, independently reviewed and accepted. R3-1 is increment 1. None of the later increments are authorized by this contract.

| Increment | Required R3 inclusion | Prompt 14 / Prompt 3 evidence | R3-1 |
|---|---|---|---|
| **R3-1** | Customers, contacts, properties; configurable pipelines; both starter templates; canonical categories; opportunities; site work packages; stage history; in-app tasks / next actions; loss / disqualify / reactivation | Prompt 3 S1+S2; this contract | This increment |
| **R3-2** | Persisted walkthrough evidence (notes; photos only after privacy review) | Prompt 14 §4 R3; Prompt 14 Codex decision 6 | **NOT STARTED** — later R3 increment |
| **R3-3** | Estimate / scenario linkage to the opportunity and site work packages (deterministic Release 1 / commercial workbench; no recomposition of stored proposal bytes) | Prompt 14 §4 R3; Prompt 3 R13 estimate tail | **NOT STARTED** — later R3 increment |
| **R3-4** | Immutable proposal versions linked from the opportunity / package (existing Release 1 snapshots remain the source of truth; no rewrite) | Prompt 14 §4 R3; Prompt 3 §12.2 step 4 | **NOT STARTED** — later R3 increment |
| **R3-5** | C0 customer acceptance and receipt (“Accept proposal”; signer-entered identity; timestamp; consent text version; document hash; no “sign” / e-signature claim until counsel D2) | Prompt 14 §4 R3 and R2b; Prompt 3 AC-13; Codex D2 | **NOT STARTED** — later R3 increment |
| **R3-6** | Provider-neutral handoff package (CSV/PDF/JSON; idempotent `package_id` / hash; download; signed webhook and operator email remain later delivery options inside this increment’s design, not R3-1) | Prompt 14 §4 R3; Prompt 3 AC-14 | **NOT STARTED** — later R3 increment |
| **R3-7** | Activation instrumentation A0–A8 via the metric registry; sample/test excluded; no invented CRM-to-A0–A8 mapping in R3-1 | Prompt 14 §4 R3 and §10; Prompt 12 Codex A0–A8 | **NOT STARTED** — later R3 increment |
| **R3-8** | Required operator notifications for this stage, at minimum acceptance-received (Prompt 14 §4 R3). Broader Prompt 3 §8.1 reminder/digest mail remains later unless a subsequent R3 increment explicitly pulls a named notification | Prompt 14 §4 R3; Prompt 3 §8.1 | **NOT STARTED** — later R3 increment |

Audit trail is already an R2 foundation and must be reused, not rebuilt, as later R3 increments write CRM and acceptance events.

**After R3 is complete**, the next separately approved roadmap stage is Prompt 14 **R4** plus the Prompt 3 import/migration steps that R4 absorbs: companion onboarding, CSV import (S5 / X1), organization export, and legacy proposal → CRM migration (S7 / AC-26). Those items are **retained approved scope**, not discarded by R3-1. They are also **not** remaining R3 work; they must not be pulled forward to declare R3 complete, and they must not be dropped from the roadmap.

### 1.4 Sequencing note that Codex must keep visible

| Source | What it places in the “first” CRM / B2W slice |
|---|---|
| Prompt 3 §1.2 R1–R18 and §12.3 S1–S9 | Full Bid-to-Won CRM, sequenced S1→S9 |
| Prompt 3 Codex review | Approves that full slice *as specification*, not as one implementation |
| Prompt 14 §4 R3 vs R4 | Approved R3 = records + estimate/proposal/acceptance/handoff; pipeline *follow-up / import / AI* stay in R4 |
| Prompt 14 Codex review, decision 6 | Approved R3 inclusions listed in §1.2; “does not depend on scheduling…” |
| This assignment | R3-1 must preserve Prompt 3 canonical categories **and** both starter templates |
| Founder acceleration Week 2–4 | Same lane also lists import/export and a photo walkthrough workspace |

**Resolution used here (PROPOSED for Codex confirmation, not a new product rule):** keep Prompt 3’s categories and both templates in **R3-1** because the assignment and Prompt 3 S2 require them. Keep the remaining Prompt 14 R3 inclusions on the §1.3 completion map. Keep Prompt 14 R4 send / onboarding / CSV import / AI, and Prompt 3 S7 legacy migration, as the **next separately approved roadmap stage** — deferred, not removed (Prompt 14 §6: “R2a and R3 stay narrow; scope additions move to R4”; Prompt 14 Codex: day-90 R3 is a stretch, not a commitment).

### 1.5 Canonical stage categories (fixed; Prompt 3 §3.1)

Organizations may rename, reorder within the linear flow, add intermediate stages *inside* a category, and hide optional categories. They **may not** delete `won`, `lost` or `disqualified`, or remap a stage that already holds opportunities without the Prompt 3 §11 E13 remap wizard (that wizard is **later**, not R3-1).

| Category | Meaning | Default gate to enter |
|---|---|---|
| `new` | Captured, not yet worked | Contact method present |
| `qualifying` | Fit being assessed | — |
| `walkthrough` | Walkthrough scheduled or done | Scheduled walkthrough, or template skips it |
| `estimating` | Estimate in progress | Property linked |
| `proposing` | Proposal version sent | At least one sent `proposal_version` / existing sent proposal |
| `negotiating` | Revisions or questions | At least one sent version |
| `won` | Accepted | Customer acceptance **or** manual win with reason (Prompt 3 AC-6) |
| `handed_off` | Handoff delivered or exported | Package built and delivered or downloaded |
| `lost` | Closed lost | Loss reason |
| `disqualified` | Not a fit | Disqualify reason |
| `nurture` | Parked for later | Revisit date |

R3-1 implements the **enum, mapping, history and gates that can be evaluated with data R3-1 owns**. Entering `handed_off` is **blocked** until **R3-6** (handoff package). Entering `won` in R3-1 is allowed **only** as `acceptance_method = manual` with reason and audit (Prompt 3 AC-6 manual path). Customer-acceptance `won` waits for **R3-5** (C0; depends on R2b). Entering `proposing` / `negotiating` is allowed only when a **linked existing proposal** is already `sent` (Release 1 / current `proposals.status`); R3-1 must not compose or re-send a proposal to satisfy the gate. Immutable version linkage is **R3-4**.

### 1.6 Starter templates (Prompt 3 §3.5–3.6; Codex Prompt 3 D5–D6)

Seeded, organization-configurable, not hard-coded into analytics:

**Template A — `commercial_facility_v1`** (lead segment; default for commercial organizations)

| Order | Default label | Category |
|---|---|---|
| 1 | Lead | `new` |
| 2 | Qualification | `qualifying` |
| 3 | Walkthrough | `walkthrough` |
| 4 | Estimating | `estimating` |
| 5 | Proposal sent | `proposing` |
| 6 | Negotiation | `negotiating` |
| 7 | Won | `won` |
| 8 | Handed off | `handed_off` |
| — | Lost / Disqualified / Nurture | terminal / park |

Default commercial qualification checklist and loss categories in Prompt 3 §3.5 remain **REQUIRES DOMAIN REVIEW** (Codex D5). R3-1 may *seed* them as editable organization content. It must not treat them as operator-validated.

**Template B — `residential_turnover_v1`** (secondary)

| Order | Default label | Category | Notes from Prompt 3 |
|---|---|---|---|
| 1 | Inquiry | `new` | Often from a web form (form itself is later) |
| 2 | Service fit | `qualifying` | D6 content remains operator-gated |
| 3 | Quote | `estimating` → `proposing` | `walkthrough` hidden by default |
| 4 | Accepted | `won` | Customer acceptance is **R3-5**; manual win only in R3-1 |
| 5 | Handed off | `handed_off` | **R3-6** |
| — | Lost / Not a fit / Nurture | terminal / park | Prompt 3 residential loss list; D5/D6 |

External labels “Scheduled / Completed / Recurring” appear **only** after read-only re-import (Prompt 3 §3.6). That mirror is **out of R3-1**.

### 1.7 Opportunity and lead lifecycles (Prompt 3 §3.2–3.4)

R3-1 must implement the stored transitions it can complete without later modules:

- Opportunity: `new` → `qualifying` → (`walkthrough` or `estimating` if the template skips walkthrough) → `estimating` → `proposing` / `negotiating` only with a linked sent proposal → `won` (manual) / `lost` / `disqualified` / `nurture`.
- `reactivated_cycle` is **not** a stored state. Reactivation creates a new opportunity with `reactivated_from_id` in `qualifying` and copies customer, property, contacts and *latest scope as draft*. It does **not** copy acceptance, handoff or prices as current (Prompt 3 §3.7).
- Lead lifecycle (Prompt 3 §3.3) is in R3-1 for **manual** intake only: `new` → `contacted` | `converted` | `junk` | `merged` | `disqualified`. Hidden lead on direct opportunity create is required (“Leads are optional… a hidden lead record is created for attribution”).
- Site work package machine (Prompt 3 §3.4) is in R3-1 as data + status. Linking a package to a *new* estimate/scenario or immutable proposal version is **R3-3 / R3-4**; a package may point at an **existing** Release 1 proposal/estimate row without rewriting it.

### 1.8 Walkthrough gate without pulling S3 email

Template A’s default path requires a scheduled walkthrough to enter category `walkthrough` (Prompt 3 §3.1, §3.5). Prompt 3 S3 / AC-11 add confirmation email, `.ics` and human-send.

**R3-1 includes** a walkthrough *record* sufficient for the stage gate and overlap warning: property, IANA timezone, window start/end, estimator membership, site contact, status `scheduled` | `rescheduled` | `cancelled` | `no_show`. Overlap with that estimator’s other walkthroughs is detected in-app (AC-11 data clause).

**R3-1 excludes** confirmation / reschedule / cancel email, `.ics`, and any customer-facing send. Those remain S3/S6 / Prompt 14 R4 ICS. The AC-11 “sent only on explicit click / not suppressed” clause is **not** claimed in R3-1.

The R3-1 walkthrough **record** is not **R3-2** persisted walkthrough evidence (notes; photos after privacy review). R3-2 remains required before R3 is complete.

### 1.9 Prompt 3 acceptance-criteria map

| ID | Title (condensed) | R3-1 | Later phase |
|---|---|---|---|
| AC-1 | 390 px quick-add lead; ≤ 2 taps after fields; `source=manual`; `created_by`; appears in default-template `new` | **In** (manual only; no form/API) | Form/API intake = S6 |
| AC-2 | Email/phone match offers “link to existing”; never auto-merge on save | **In** | — |
| AC-3 | Convert: one confirmation creates/links customer, contacts+roles, property, opportunity; no re-type; audit IDs | **In** (S1 lists AC-4; S3 lists AC-3; both are the same convert step and are required for a usable pipeline) | — |
| AC-4 | Convert onto existing customer does not create a second customer | **In** | — |
| AC-5 | Exactly one stage; canonical category; unmet gate blocked with a specific message | **In** for gates R3-1 can evaluate | `proposing` without a sent proposal stays blocked; `handed_off` stays blocked until R3-6 |
| AC-6 | `won` via acceptance **or** manual win; `lost` / `disqualified` require reason | **Partial:** manual win / lost / disqualified only | Customer-acceptance `won` = R3-5 (C0) |
| AC-7 | Open opportunities without future next action on “Needs follow-up”; org setting can require next action on stage change | **In** (in-app list). Operator-email reminders = later (Prompt 3 §8.1) | Email digests = later |
| AC-8 | Pipeline totals never mix pricing bases; annualize only when an explicit disclosed rule is on | **In** (Codex D13: no combined total by default) | Annualization rule enablement is an org setting; formula remains D13 |
| AC-9 | Parent + N site packages; proposal may include a subset; acceptance records accepted packages | **Partial:** parent + packages + per-package loss | Package selection on acceptance = R3-5 |
| AC-10 | Parent `won` when ≥ 1 package accepted; package metrics separate from parent | **Partial:** package vs parent counters in-app | Acceptance-driven package win = R3-5 |
| AC-11 | Schedule walkthrough; overlap; confirmation email + `.ics` on click if not suppressed | **Partial:** record + overlap only | Email / `.ics` / suppression = S3 + S6 |
| AC-12 | Reassign estimator; optional open-task transfer; notify both; history | **Partial:** reassign + optional task transfer + history | Notification delivery = **R3-8** or later named increment; not discarded |
| AC-13 | Customer acceptance; “Accept proposal”; no “sign” | **Out of R3-1** | **R3-5** (R2b + counsel D2). Remains required for R3 complete |
| AC-14 | Idempotent handoff package | **Out of R3-1** | **R3-6**. Remains required for R3 complete |
| AC-15 | Signed webhook retry / dead-letter | **Out of R3-1** | Delivery option inside **R3-6** design; signed outbound webhooks also appear in Prompt 14 R4 |
| AC-16 | External status read-only mirror | **Out of R3-1** | After handoff; not required to call R3 complete; not discarded |
| AC-17–AC-19 | Send-time suppression / unsubscribe / DNC | **Out** | S6; counsel D1/D4 |
| AC-20 | CSV marketing consent without provenance → `unknown` | **Out** of R3-1 runtime; rule retained | Next separately approved stage: Prompt 3 S5 / Prompt 14 R4 |
| AC-21 | CSV ≤ 10k, preview, dedupe, undo until finalize | **Out** of R3-1 | Next separately approved stage: Prompt 3 S5 / Prompt 14 R4 X1. Not discarded |
| AC-22 | Merge review, undo window, handoff warning | **Out** of import merge. In-product single-record “link” on save remains AC-2 | Next separately approved stage: Prompt 3 S5. Not discarded |
| AC-23 | AI suggestions labelled “Suggested”; apply click + provenance; workflows work with AI off | **Out of features.** Workflows must complete with AI off (already true if no AI ships) | S9 / Prompt 14 R4 AI-1 |
| AC-24 | Cross-org CRM isolation including counts | **In** (extends R2 two-tenant harness) | — |
| AC-25 | Estimator “assigned” scope; no `cost.view` without permission | **In** (Codex D12 default: assigned/created). Viewer still cannot read raw cost (R2 matrix) | Broader estimator visibility = org setting + audit |
| AC-26 | Every legacy proposal → opportunity/customer/property; content hash unchanged; public link policy | **Out of execution.** Additive nullable links only; no backfill job in R3-1 | Next separately approved stage: Prompt 3 S7 + founder sign-off. Not discarded |

### 1.10 Prompt 3 capabilities: included vs later

Included in **R3-1** (subset of Prompt 3 §1.2): **R1** records (manual); **R2** manual lead capture only; **R3** first/last touch fields on the lead/opportunity as *empty or `manual`* (no UTM import UI); **R4** qualification checklist + outcome + required disqualify reason (seeded, operator-review content); **R5** configurable pipelines + both templates; **R6** opportunities + packages + owner/estimator + value+basis + close date + next action + win/loss; **R7** tasks/next action in-app (no operator-email reminder delivery); **R9** estimator assign/reassign; **R12** loss reasons + reactivation; **R13** convert without re-entry (not the estimate/proposal/acceptance tail); **R17** in-board value-by-basis and stage counts only (not §4.3 dashboards).

**Remaining approved R3 work** (do not start in R3-1; required before R3 is complete — §1.3): persisted walkthrough evidence; estimate/scenario linkage; immutable proposal versions; C0 acceptance and receipt; provider-neutral handoff; A0–A8 activation instrumentation; required operator notifications (acceptance received).

**Next separately approved roadmap stage** (Prompt 14 R4 and Prompt 3 S5/S7; **retained**, not discarded, and **not** part of declaring R3 complete): companion onboarding; CSV import and merge review; organization export; legacy proposal → CRM migration (AC-26); human-sent follow-up; consent/suppression engine; ICS; AI-1 drafts; team invitations.

**Still later or excluded** (do not start in R3-1): hosted intake form; inbound lead API/Zapier; activity-logging API; walkthrough confirmation email; external status mirror; §4.3 analytics dashboards; native SMS; sequences; two-way FSM; auto-routing; paid enrichment; regulated pricing; “signature” claims; 100D coupling; `sales_manager` role.

Prompt 3 §1.3 exclusions remain binding. Codex Prompt 3 corrections also remain binding: transactional proposal send/receipts may already exist; the “human click” rule applies to sales/marketing follow-ups, not those receipts.

### 1.11 Preconditions (Prompt 3 §1.4 + §12.3 S0 + coordination next-wave)

R3-1 implementation **does not start** until all of the following are true:

1. **R2 accepted** for this assignment’s gate: organization identifiers, membership roles and authorization contract frozen (COORDINATION_PLAN next-wave rule). Current R2 is **not** accepted for production (see §2).
2. Release 1 gates passed (Prompt 3 §1.4). Ledger in the R2 worktree still records Release 1 release **FAIL / blocked** on remaining external gates. Codex must not treat local catalog PASS as this precondition.
3. R3-3 definer remediation done (Prompt 3 §1.4). Ledger records repository-level R3-3 closed; hosted verification is separate.
4. Truthfulness corrections (Team access copy, API/White-label seed, trial FAQ, attachments UI) — Prompt 3 §1.4 / Prompt 14 R0. Still a Prompt 14 CX-2 / counsel track. R3-1 UI must **keep Team access hidden** (Prompt 3 §1.4; Prompt 2 U11; R2 `invitationsEnabled=false`).
5. Prompt 2 P1–P2 tenancy in place with membership lookup authoritative (U1). This is the R2 design already implemented locally.
6. S0 spikes: queue/runtime (U8) and membership-RLS benchmark (U1) documented; harness including definer gate green (Prompt 3 §12.3 S0; Codex D15). **UNKNOWN** whether S0 evidence exists on the current R2 candidate. If absent, S0 is a blocker, not an R3-1 coding task to invent.

### 1.12 Proposal preservation (Prompt 3 §0, §12.2, AC-26; Prompt 2 U4)

- R3-1 tables are **additive**.
- Do not rewrite `proposals` bytes, prices, tracking tokens, Release 1 `catalogJob` snapshots, or `proposal_status`.
- Do not recompose, regenerate or migrate proposal content to “fit” CRM.
- Optional nullable `opportunity_id` / `customer_id` / `property_id` on `proposals` (or a join table) may be added **without** backfilling every row in R3-1.
- Existing columns cited by Prompt 3 §12.2 remain the extraction source *when S7 runs*: `client_name`, `client_company`, `client_email`, `contact_phone`, `service_location` (VERIFIED on `types/database.ts` in the R2 worktree) plus `global_inputs`.
- Current `proposals.status` enum is `draft | sent | accepted | rejected` (`types/database.ts`). Prompt 3 §12.2 mapping (`draft→estimating`, `sent→proposing`, `accepted→won` with `acceptance_method=manual_legacy`, `rejected→lost` / `unknown_legacy`) is Prompt 3 **S7**, the next separately approved migration stage after R3 — **retained**, not R3-1, and not discarded.
- `marketing_attribution` and `marketing_funnel_events` stay untouched and must never be copied into tenant CRM (Prompt 3 §0, §12.2 step 6).
- 100D has no access to tenant CRM; no shared schema or credential (Prompt 3 §8.3; Prompt 2 U12; Codex D10). Not a launch dependency.

### 1.13 AI and automation (Prompt 3 §0, AC-23; Prompt 14 Codex decision 9)

- R3-1 ships **no** AI suggestion UI or apply path.
- No autonomous CRM mutation, auto-disqualify, auto-stage move, auto-send or auto-win.
- SMS is logging-only in the full spec and **not sent** in this slice (Prompt 3 §1.3, §8.2). R3-1 also has no SMS logging API.
- No outbound sequences, drips, newsletters or native SMS.

### 1.14 Permissions (Prompt 3 §7 vs frozen R2 roles)

R2 canonical roles are `owner | admin | estimator | viewer` (`features/organizations/domain.ts`; migration `20260925002000_r2_organization_tenancy.sql` CHECK). Prompt 3 §7’s **Sales mgr** actor is **not** an R2 role.

**R3-1 must not add `sales_manager`.** Map Prompt 3 sales-mgr cells onto `owner` / `admin` until a later, separately reviewed role exists.

R3-1 permission overlay (names from Prompt 3 §7; enforcement via R2 membership + new `app.has_perm` or equivalent **only if Codex adds it**; otherwise map onto `can_edit_organization_work` / `can_manage_organization` with estimator assigned-scope checks):

| Permission | Owner | Admin | Estimator | Viewer |
|---|---|---|---|---|
| `crm.lead.create` / `edit` | org | org | create any; edit own/assigned | no |
| `crm.opportunity.read` | org | org | assigned/created default (D12) | org identity only; **no** price/cost on board |
| `crm.opportunity.assign` | org | org | no | no |
| `crm.stage.move` | org | org | assigned; gates apply | no |
| `crm.mark_won_manual` | org | org | no | no |
| `crm.pipeline.configure` | org | org | no | no |

`crm.import`, `crm.merge`, `crm.export`, `comm.send_customer_email`, suppression, API keys, handoff, AI apply are **not** granted in R3-1 because those features are out.

Board shows **price value only**, never cost/margin, unless the member has `cost.view`. R2 already hides raw work from `viewer`. Estimators without a reviewed `cost.view` grant see price, not cost (Prompt 3 §7 Sensitive fields; R2 matrix).

Every request carries an explicit `organization_id`. `profiles.active_organization_id` is a pointer, not authorization (Prompt 2 U1 / Codex correction 3).

### 1.15 Events and analytics boundary (Prompt 3 §4)

**Domain events** (outbox; reuse R2 `organization_event_outbox`; do not create a second outbox): emit only for actions R3-1 performs, IDs only unless Prompt 3 §4.1 notes otherwise: `lead.created`, `lead.converted`, `lead.disqualified` / `junked` / `merged`, `customer.created` / `updated`, `contact.created` / `updated`, `property.created` / `updated`, `opportunity.created`, `opportunity.stage_changed`, `opportunity.owner_changed` / `estimator_changed`, `opportunity.won` (manual), `opportunity.lost` / `disqualified`, `opportunity.reactivated`, `work_package.status_changed`, `walkthrough.scheduled` / `rescheduled` / `cancelled`, `task.created` / `completed` / `overdue`.

**Do not emit** in R3-1: `message.*`, `consent.*`, `suppression.*`, `handoff.*`, `external_status.imported`, `ai_suggestion.*`, `proposal.accepted` (existing proposal send/view paths stay on current proposal code).

**Product analytics** (Prompt 3 §4.2): PII-free; allowed properties `organization_id` (pseudonymous), `template_key`, `segment`, `category`, `intake_method`, `device_class`, counts/durations. R3-1 may register and emit: `crm_lead_quick_added`, `crm_lead_converted`, `crm_pipeline_viewed`, `crm_stage_moved`. Others wait. Never join to `marketing_attribution`.

**§4.3 metric dashboards and golden-number suite** are S8 / later. R3-1 board may show counts and value-by-basis only.

Prompt 14 A0–A8 is an activation framework (Prompt 12 Codex), not a CRM dashboard spec. R3-1 must not invent A0–A8 CRM mappings. **R3-7** is the increment that instruments A0–A8 via the registry; that work remains required for R3 complete.

### 1.16 Import / export and legacy-migration boundary

| Surface | R3-1 | Where it lives |
|---|---|---|
| Manual create / convert | In | This increment |
| CSV import wizard, 10k rows, presets, undo | Out of R3-1; **not discarded** | Next separately approved stage: Prompt 3 S5; Codex D8/D9; Prompt 14 R4 X1 |
| Organization CRM export (`pii.export`, step-up auth) | Out of R3-1; **not discarded** | Next separately approved stage: Prompt 3 R18 / S5; Prompt 14 R4 |
| Legacy proposal → opportunity/customer/property (AC-26) | Out of execution; **not discarded** | Next separately approved stage: Prompt 3 S7 |
| Handoff CSV/JSON/PDF | Out of R3-1 | **R3-6** — required before R3 is complete |
| Founder Week 2–4 “import/export” line | Not pulled into R3-1 | Same retained later stages; not a license to shrink R3 |

---

## 2. Dependency and non-duplication map (Release 1 / R2)

### 2.1 Current R2 integrated status (2026-09-25, worktree `/private/tmp/veltex-r2-integration`)

| Fact | Evidence |
|---|---|
| Branch | `codex/r2-integrated-read-adapter` |
| Authoritative ledger | `/private/tmp/veltex-r2-integration/docs/OPERATING_STATE_AND_DECISION_LEDGER.md` |
| Ledger “CURRENT CANDIDATE” (product) | `f99bb54` — local integration candidate only |
| Evidence after the product candidate | `302220d` — atomic preview migration harness (`build-preview-migration-bundle.mjs`); PREPARED, not hosted execution |
| Worktree HEAD at this revision | `bab6ae8` (`docs: record atomic R2 preview bundle`) — **evidence-only** ledger commit after `302220d`. No product, migration or API change in `bab6ae8` |
| Independent integrated verdict | **PASS** on product/auth/privacy/fail-closed/RSC/accessibility of the integrated team read adapter (authoritative worktree ledger). Not a production or hosted RLS pass |
| Still required | Isolated Supabase two-tenant/four-role RLS; authenticated browser/operator evidence; final external Claude integrated review of the hosted/exact chain; founder acceptance; separately authorized production deploy. Production unchanged |
| Invitations | Hard-disabled. No invitation HTTP route. `invitationsEnabled` and `contactDetailsEnabled` false |
| Roles | `owner`, `admin`, `estimator`, `viewer` only |
| Helpers | `is_organization_member`, `organization_role`, `can_manage_organization`, `can_edit_organization_work` bind to `auth.uid()` only |
| Already tenant-owned | `proposals`, `business_service_profiles`, `company_profiles`, `user_branding_settings` via added `organization_id` |
| Already present | `organization_audit_log`, `organization_event_outbox`, inbox with `(consumer, event_id)` idempotency |
| Team UI | `/dashboard/settings/team` + `/api/team/*` on the integrated candidate |

**R3-1 is gated on R2 acceptance.** Local PASS at product candidate `f99bb54`, plus evidence-only commits `302220d` and `bab6ae8`, is **not** acceptance.

### 2.2 Reuse; do not rebuild

| Existing asset | R3-1 rule |
|---|---|
| `public.organizations` / `organization_memberships` / `profiles.active_organization_id` | Consume. Do not recreate |
| R2 caller-bound helpers and RLS pattern | Extend with CRM-table policies. Do not accept a user-id argument |
| R2 audit + outbox/inbox | Reuse. New CRM writes emit through the same transactional triggers |
| `features/organizations/**` | **Do not edit** in the R3-1 lane (Wave 1 Cursor/R2 ownership; invitations stay false) |
| `proposals` and Release 1 catalog / workbench / `/dashboard/proposals/new` | Do not recompose. Optional link only |
| `proposal_events`, `activation_events`, Stripe, billing, trial usage, `PricingEngine` | Do not modify unless a later assignment explicitly says so (product guardrail) |
| `marketing_attribution` / `marketing_funnel_events` | Untouched |
| 100D / `veltex-ai-100d-pilot` | Isolated |
| Resend / `lib/email/service.ts` | Not used for CRM customer mail in R3-1 |
| R2 hosted harness `quality/r2-hosted-verification-20260925/` | Extend with CRM isolation cases after R2 hosted pass; do not replace |

### 2.3 Release 1 relationship

Release 1 remains the estimate/proposal engine. R3-1 attaches CRM records in front of it. Conversion “opportunity → walkthrough → Release 1 estimate → proposal version → acceptance → handoff” (Prompt 3 R13 tail) is the **remaining approved R3 increment chain** (§1.3 R3-2…R3-6), not discarded scope. R3-1 may deep-link an opportunity to the **existing** proposal editor without changing generate/save/pricing behavior.

---

## 3. Ordered implementation slices and file-ownership suggestions

Codex remains integration owner (migrations, RLS, shared domain types, server APIs, tests, ledger, merges). Cursor owns a **new** isolated frontend worktree only after Codex freezes read/write contracts. Claude reviews exact ranges; it does not implement.

**Do not** start these slices until §1.11 gates clear. Suggested branch: `codex/r3-1-crm-pipeline` from the **accepted R2 head**, not from dirty `deploy/100d-pilot` and not from `cursor/r2-team-ui-shell`.

### Slice A — contract freeze (Codex, docs only)

- Confirm this document’s S1+S2 reading as the **first increment** of approved R3, not a redefinition of Prompt 14 §4 R3.
- Freeze the §1.3 completion map; R3 is complete only after R3-2…R3-8.
- Freeze canonical category enum, template keys, role mapping (no `sales_manager`), and “manual win only” for `won` in R3-1.
- Suggested files: this contract; ledger suggested entry (§6); `docs/product/platform-build/R3_1_ROLE_AND_RLS_MATRIX.md` (new, Codex-owned).

### Slice B — additive schema + RLS (Codex)

New tables only, Prompt 3 §6 subset that S1+S2 need:

`pipeline`, `pipeline_stage`, `opportunity`, `site_work_package`, `opportunity_stage_history` (append-only), `lead`, `lead_source`, `referral_source` (if not already specified elsewhere — do not invent columns beyond Prompt 3 §6), `attribution_touch`, `qualification_response`, `loss_reason`, `task`, `walkthrough` (gate fields only), plus customer / contact / property / contact↔customer M2M if they do not already exist.

Conventions from Prompt 3 §6 / Prompt 2 §2: `organization_id`, audit columns, UUIDv7 *if already the repo convention* or the existing `gen_random_uuid()` style used by R2 — **do not mix without a Codex decision**. Soft delete, `source`. Stage `category` CHECK-constrained to the 11 values. Partial unique on active contact email is **not** enforced (Prompt 3 §6 integrity).

RLS: restrictive organization gate, then permission checks; `anon` has no table access; no direct client write to stage history.

Suggested files:

- `supabase/migrations/YYYYMMDDHHMMSS_r3_1_crm_pipeline.sql` (new file only; do not edit R2 migrations)
- paired rollback documented like `docs/product/platform-build/R2_MIGRATION_AND_ROLLBACK.md`
- `types/database.ts` generated update (Codex)

Seed: both templates and default stages per §1.6; default loss reasons from Codex D5 list (price, timing, scope mismatch, incumbent retained, no decision, competitor, unqualified, unknown) as *editable* rows.

### Slice C — domain + server API (Codex)

Suggested ownership:

- `features/crm/domain.ts` — categories, template keys, transitions, permissions (mirror R2 `features/organizations/domain.ts` pattern)
- `features/crm/types/*.ts`
- `app/api/orgs/[organizationId]/crm/**` or `/api/crm/*` **always** with explicit organization ID in path or body
- Commands: create/update customer, contact, property; quick-add lead; convert lead; create/update opportunity; move stage; assign estimator; create/complete/snooze task; schedule/reschedule/cancel walkthrough record; reactivate; configure pipeline (owner/admin)
- Fail closed: no fixture fallback in production
- Idempotency keys on writes (Prompt 3 E16)

Do not add public intake, org API keys, or webhook receivers.

### Slice D — UI shell (Cursor, isolated worktree, after Slice C contract freeze)

Suggested ownership entirely under `features/crm/**` (or `features/pipeline/**`) plus app routes:

- `app/dashboard/crm/page.tsx` (or `/dashboard/pipeline`) — desktop board + list equivalent
- `app/dashboard/crm/leads/new` — 390 px quick-add (AC-1)
- Opportunity detail + convert confirmation + pipeline settings
- Adapters: `CrmReadAdapter` / `CrmWriteAdapter`; production unavailable adapter; mock **dev/test only**

Accessibility (Prompt 3 §5.3): WCAG 2.2 AA target; kanban **list-view equivalent** and keyboard move menu; 44 px touch targets; `aria-live` on stage changes. Responsive: 390 px and desktop (Prompt 3 §5.1–5.2).

**Do not edit** `features/organizations/**`, billing, proposal generate/save, or R2 team routes.

### Slice E — tests and evidence (Codex + Cursor in their lanes)

See §4.5.

### Slice F — operator validation + founder acceptance (not engineering)

Checklist in §4.6. No production deploy from this contract.

---

## 4. Gates

### 4.1 Migration

- Additive tables and nullable FKs only.
- Repeatable on a disposable Postgres 16 chain **after** the accepted R2 chain, including `CHECK_DEFINERS=1`.
- Seed templates/stages/loss reasons in the same migration or a follow-up seed migration, idempotent.
- Do not run S7 legacy extraction in R3-1. S7 remains the next separately approved migration stage after R3; it is retained, not discarded.
- Do not drop or rewrite proposal content columns.

### 4.2 Rollback

Follow R2’s application-first pattern (`R2_MIGRATION_AND_ROLLBACK.md`):

1. Feature-flag CRM routes/UI off.
2. Keep additive tables for diagnosis; do not drop `organization_id` or CRM rows after real use.
3. Destructive reversal only on an isolated disposable preview, and only if every CRM row can be abandoned without touching proposal bytes.
4. Production reversal requires backup + founder authorization (Prompt 14 §11.3).

### 4.3 Tenant isolation

- Two synthetic organizations; owner/admin/estimator/viewer/non-member/anon.
- AC-24: no read, list, **count**, or write of the other org’s CRM rows.
- Estimator assigned-scope (AC-25 / D12).
- Viewer: no export (feature absent); no raw cost; board must not leak another tenant’s opportunity counts via empty-state timing or error text.
- Stage history / qualification answers: append-only or equivalent enforcement.
- External parties have no R3-1 tokens (intake/API out).

### 4.4 Accessibility and responsive

- 390 px Today / quick-add / opportunity detail (Prompt 3 §5.1).
- Desktop board + opportunity detail (Prompt 3 §5.2).
- Keyboard-only stage move via list/menu, not drag-only.
- Screen-reader announcement of stage change.
- No conformance claim before an accessibility review (Prompt 14 §8).

### 4.5 Test matrix (R3-1 subset of Prompt 3 §12.1)

| Layer | R3-1 tests |
|---|---|
| Unit | Category mapping; legal/illegal opportunity/lead/package transitions; value aggregation per basis; convert without re-type; no auto-merge |
| Database | Org gate on every new CRM table; estimator own vs others; viewer denied cost/export; anon denied; append-only history; definer allowlist still passes |
| API | Explicit org ID; unauthenticated 401; cross-org 404/403 with no inference; malformed payloads; idempotent create; stage-gate 422 with specific message |
| UI | AC-1 path; AC-2 link prompt; convert confirm; board list fallback; production adapter never renders fixtures |
| Migration | New tables apply/rollback on clone; proposal content hash sample unchanged; attribution tables row-stable |
| Security | IDOR; no service-role data in browser responses |
| AI | Assert no suggestion apply path exists |
| Performance | Not the 5,000-opportunity p95 claim (full-spec). Record membership-RLS cost on the CRM list query as S0/U1 evidence if not already captured |

### 4.6 Operator-validation and founder-acceptance gates

R3-1 **local** acceptance (Codex + Cursor):

- Focused CRM suites + full app suite + `tsc` + production build + `git diff --check`.
- Disposable DB chain + role matrix + definer gate.
- Claude exact-range review **PASS**.

R3-1 **does not** satisfy Prompt 13 fieldwork (P13-1…P13-11 still NOT STARTED). Operator validation for R3-1 is therefore limited to:

- founder-approved **synthetic** commercial + residential walkthrough of quick-add → convert → stage move → manual win/lost, on 390 px and desktop;
- D5/D6 checklist/loss copy marked “unvalidated defaults”;
- no claim of Prompt 13 B1/B2 evidence.

Founder acceptance of R3-1 is a **separate** recorded decision. It does **not** mark approved R3 complete. It does not authorize production, invitations, customer email, or a closed B2W pilot (Prompt 14 §14.4 B2W checklist still requires C0, counsel D2, handoff D9, A0–A8, isolation on staging — those are R3-5…R3-8 plus R2 hosted gates).

---

## 5. Risk register

| ID | Risk | Source | Likelihood / impact | Mitigation in this contract |
|---|---|---|---|---|
| R3-1-01 | Coding starts before R2 hosted/founder acceptance | Assignment gate; R2 ledger | High / High | Status NOT STARTED until R2 accepted |
| R3-1-02 | Scope collapses Prompt 14 R3+R4+S3–S9 into one slice, **or** R3-1 is treated as shrinking approved R3 | Prompt 14 §6 RR-6 / RR-9 | High / High | R3-1 is increment 1 only; §1.2–§1.3 keep approved R3 intact |
| R3-1-03 | Invented stage names replace Prompt 3 categories | Assignment paraphrase vs §3.1 | Medium / High | §3.1 enum is exclusive |
| R3-1-04 | New `sales_manager` role drifts from R2 | Prompt 3 §7 vs R2 CHECK | Medium / High | Map to owner/admin |
| R3-1-05 | Proposal recomposition or hash change | Prompt 3 AC-26, §12.2 | Medium / High | Additive links; no S7 job in R3-1; S7 retained as next approved stage; no generate-path edits |
| R3-1-06 | Tenant CRM joined to `marketing_attribution` or 100D | Prompt 3 §4.2, §8.3; U12 | Low / High | Forbidden joins; no 100D dependency |
| R3-1-07 | AI or send path ships “because the board has a follow-up button” | AC-23; §1.3 | Medium / High | No AI, no customer email, no SMS |
| R3-1-08 | Template A stalls without walkthrough email | §3.5 vs S3 | Medium / Medium | Walkthrough **record** in R3-1; email later |
| R3-1-09 | Manual `won` treated as customer acceptance | AC-6; D2 | Medium / High | `acceptance_method=manual` + audit; no “signed” copy |
| R3-1-10 | Viewer / estimator sees cost on the board | Prompt 3 §7; R2 viewer rule | Medium / High | Price-only board; extend R2 tests |
| R3-1-11 | Auto-merge on email match | AC-2; shared inboxes | Medium / Medium | Prompt only; duplicates allowed |
| R3-1-12 | Editing R2 team files or enabling invitations | COORDINATION_PLAN; D14 | Medium / High | Separate lane; invitations stay false |
| R3-1-13 | Dirty main checkout used as base | Prompt 14 RR-10 | Medium / High | Branch from accepted R2 head |
| R3-1-14 | Qualification/loss copy treated as operator-validated | D5/D6 | High / Medium | Seed + “unvalidated defaults” |
| R3-1-15 | Mixed-basis pipeline totals | AC-8; D13 | Medium / Medium | Per-basis only; no default combined total |
| R3-1-16 | S0 U1/U8 spikes skipped | D15; Prompt 3 S0 | Medium / High | Blocker if evidence missing |
| R3-1-17 | Founder Week 2–4 import/export pulled into R3-1, **or** CSV/S7 treated as discarded | Founder acceleration vs S5/S7; Prompt 14 R4 | Medium / Medium | Import, export and legacy migration stay the next separately approved roadmap stage |
| R3-1-19 | R3-1 local acceptance labeled as R3 / Bid-to-Won Slice 1 complete | Prompt 14 §4 R3; §1.3 map | Medium / High | R3 complete only after R3-2…R3-8 |
| R3-1-18 | Active-org pointer used as auth | Prompt 2 U1 | Medium / High | Explicit org ID on every command |

Prompt 14 RR-1…RR-12 remain the roadmap register and are not restated as new R3-1 work.

---

## 6. Status

| Item | Status word |
|---|---|
| This contract | **PREPARED** |
| R3-1 implementation (schema, RLS, API, UI, analytics, import/export, tests) | **NOT STARTED** |
| R3-1 migrations | **NOT STARTED** |
| R3-1 hosted / production | **NOT STARTED** — not authorized |
| Approved Prompt 14 **R3** Bid-to-Won Slice 1 | Unchanged; **not** redefined or shrunk. **NOT COMPLETE** until R3-2…R3-8 |
| R3-2…R3-8 (walkthrough evidence, estimate/scenario, immutable versions, C0, handoff, A0–A8, operator notifications) | **NOT STARTED** |
| Prompt 14 R4 + Prompt 3 S5/S7 (onboarding, CSV import, legacy migration) | Next separately approved roadmap stage; **retained**, not discarded; **NOT STARTED** |
| R2 | Product candidate `f99bb54` local integrated **PASS**; HEAD `bab6ae8` evidence-only; **not** founder-accepted; production unchanged |
| Prompt 3 specification | **COMPLETE**; **APPROVED WITH GATES** (Codex) |
| Prompt 14 roadmap | **COMPLETE**; **APPROVED** with schedule/authorization corrections (Codex) |

### Suggested ledger entry (for Codex / founder; not written by this assignment)

> ### Cursor R3-1 contract revised — 2026-09-25 Pacific
> - **PREPARED / NOT STARTED:** `docs/product/platform-build/CURSOR_R3_1_IMPLEMENTATION_CONTRACT.md` (Codex-review revision).
> - Authoritative lane ledger: `/private/tmp/veltex-r2-integration/docs/OPERATING_STATE_AND_DECISION_LEDGER.md`. R2 product candidate `f99bb54`; evidence `302220d`; HEAD `bab6ae8` (docs-only preview-bundle record).
> - R3-1 remains Prompt 3 S1+S2 as the first increment after R2 acceptance. It does not redefine or shrink approved Prompt 14 R3. R3 is complete only after R3-2…R3-8 (walkthrough evidence, estimate/scenario linkage, immutable versions, C0 acceptance/receipt, provider-neutral handoff, A0–A8, required operator notifications). Onboarding/CSV import and legacy migration remain the next separately approved roadmap stage (Prompt 14 R4 / Prompt 3 S5/S7), not discarded scope.
> - No implementation, migration, merge, push or hosted change.

---

## Stop point

Revised contract is ready for Codex re-review. Only this artifact was updated. No R2 files were modified. No migrations or implementation were created. No hosted system was touched.
