# Multimodal walkthrough and profitability strategy

Status: **APPROVED / ACTIVE DELIVERY / IMPLEMENTATION DEPENDENCY-GATED**
Owner: Anthony Veliz  
Research date: 2026-10-03 Pacific

Founder implementation approval: 2026-10-03 Pacific. This program is part of
the active seven-stage product roadmap and is not a separate experimental
branch. Delivery must follow M0–M5 and the existing R3 dependency gates.

## Decision

Veltex should add private photo and short-video evidence to the walkthrough and
proposal workflow, but AI must not set the price or make safety, tax, legal or
accounting determinations. AI extracts visible observations and missing
questions into a constrained schema. The operator confirms those observations.
The existing deterministic pricing engine then calculates editable scenarios
from approved inputs and exposes the assumptions behind them.

This is an incremental capability, not a rewrite of R3. R3-2 remains the
accepted text-evidence foundation. The smallest multimodal increment should
follow R3-2 acceptance and connect to R3-3 estimate/scenario linkage without
blocking the ordinary Bid-to-Won path.

## What the technology can do

OpenAI's Responses API accepts one or more image inputs by URL, Base64 data or
Files API ID. Vision-capable models can describe visible content and read text,
while Structured Outputs can constrain the response to an application-owned
JSON schema. Images consume input tokens, so Veltex should resize and select
useful evidence rather than submit every original at maximum resolution.

Current general-purpose API models advertise text and image input, not raw
video input. Veltex should therefore retain a video privately, extract a small
set of representative frames, and optionally transcribe its audio. OpenAI's
file transcription endpoint accepts common audio/video container formats up to
its documented limit. The original video remains the evidence; frames and the
transcript are derived analysis inputs.

Official OpenAI references:

- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.openai.com/api/docs/models

## Smallest useful multimodal release

### Capture

1. Upload photos or short videos directly to a private organization-scoped
   storage bucket using short-lived signed upload credentials.
2. Link each asset to the organization, opportunity, property, walkthrough and
   optional room/area label. Store MIME type, bytes, duration, capture time,
   uploader, consent/notice state and lifecycle status.
3. Validate file signature, permitted type, size and duration; scan uploads;
   remove unnecessary location/device metadata from derived files; never accept
   access codes, payment data or government identifiers as intended evidence.
4. Make deletion and retention visible. Raw media, derivatives, analyses and
   proposal references need an auditable deletion state rather than silent
   orphaning.

### Analyze

1. Generate thumbnails and a bounded contact sheet/key-frame set for video.
2. Transcribe bounded narration when useful.
3. Submit only selected images/frames and approved context to a vision-capable
   model through a server-side job. API credentials never reach the browser.
4. Require schema-controlled output containing observations, evidence-frame
   references, confidence, missing questions and explicit `not_visible` or
   `uncertain` states. Reject unknown fields and oversized output.
5. Prohibit the model from asserting exact dimensions, contamination,
   structural defects, regulated hazards, required chemicals, compliance or
   price unless the operator supplies and confirms the relevant fact.

### Review and price

1. Present every AI observation as a suggestion with its source frame.
2. Require an authorized operator to accept, edit or reject it.
3. Convert only accepted facts into versioned estimating inputs.
4. Run the existing deterministic pricing engine for low/base/high scenarios.
5. Preserve provenance:
   `media version -> model/prompt/schema version -> suggested observation ->
   operator decision -> estimate snapshot -> proposal version`.

The customer-facing proposal may include operator-selected evidence, but never
internal confidence, cost, wage, margin or access information.

## All-cleaning-service design

Use one service-neutral observation vocabulary with versioned service packs.
The common vocabulary covers area/quantity, surface/material, visible
condition, soil/debris, obstacles, access, occupancy, frequency, equipment,
travel, uncertainty and safety questions. A service pack decides which facts
matter and which claims are forbidden.

Initial lower-risk packs should be commercial janitorial, residential,
short-term-rental turnover, move-in/out and post-construction intake. Carpet,
floor, window and exterior packs follow operator validation. Healthcare,
biohazard, trauma, sharps and other controlled-risk services remain blocked
until qualified safety/compliance review; visual AI cannot certify them.

## Profitability operating layer

Veltex should distinguish four numbers rather than show one vague green/red
label:

1. **Estimated revenue** — the selected price and billing basis.
2. **Estimated direct cost** — productive labor, supplies, equipment, travel,
   subcontractors and job-specific fees.
3. **Estimated contribution** — revenue minus direct cost.
4. **Estimated operating result** — contribution minus the operator's chosen
   overhead allocation.

The loaded labor model is planning math:

```text
loaded productive labor cost per hour =
  (wages + employer payroll burden + workers' compensation + benefits
   + paid nonproductive time + training/other entered labor costs)
  / expected productive hours
```

Every component must identify its source as operator actual, imported actual,
official benchmark or operator estimate, with effective date and jurisdiction
where relevant. State/local taxes, insurance and fees must be operator-entered
or externally sourced; Veltex must not infer a legally correct rate.

The account view should compare estimated, scheduled and actual values for an
account, recurring contract, project and one-time service. Red/amber/green is
based on an operator-configured threshold and missing-input policy—not a promise
that the business or job is profitable. Revenue, invoiced amount, collected
cash and accounting profit must remain visibly distinct.

### MVP profitability inputs

- productive and paid labor hours;
- base wage and configurable burden components;
- supplies/consumables;
- equipment/rental/depreciation allowance;
- travel/mileage and mobilization;
- subcontractor cost;
- payment or marketplace fees;
- explicit overhead allocation method;
- selected price, frequency and expected volume;
- actual imports with source and reconciliation status.

Veltex does not calculate payroll, file taxes, determine worker classification,
maintain a general ledger, provide legal/accounting advice or guarantee margin.
Exports and reconciled integrations can complement the business's accountant,
payroll provider and system of record.

## Evidence-based business risks and Veltex safeguards

There is no authoritative dataset proving one universal list of reasons that
all cleaning companies fail. BLS establishment data show that business closure
is common across industries and varies with cohort/economic conditions; it does
not assign a cleaning-specific cause to every closure. The Federal Reserve's
2024 employer-firm survey reported rising costs, uneven cash flow, paying
operating expenses and weak sales as common financial challenges. The following
is therefore a product inference grounded in those cross-industry findings and
cleaning-specific operating realities—not a causal guarantee.

| Recurring risk | Veltex safeguard | Roadmap placement |
|---|---|---|
| Underpricing or omitted scope | Confirmed walkthrough facts, deterministic estimate, margin guardrail and override reason | R3 multimodal + R3-3 |
| Wages treated as total labor cost | Loaded labor components and productive-hour denominator | Stage 5 workforce/profitability |
| Estimate differs from actual work | Estimate/scheduled/actual variance and recalibration history | Stage 5 |
| Uneven cash flow and slow collection | Cash-versus-revenue view, AR aging and reminders after finance gates | Stage 4 |
| Weak pipeline or excessive customer concentration | CRM stage aging, follow-up, win/loss and concentration indicators | R3 + analytics |
| Scope inconsistency and quality disputes | Versioned scope, evidence provenance, checklists and customer-approved changes | R3, Stage 6 |
| Unsafe work/chemical practices | Hazard questions, service-pack exclusions and escalation—not automated certification | Stage 7 |
| Weak records and owner-only memory | Append-only decisions, versions, audit/outbox records and reusable templates | All stages |
| Expanding into unsupported services | Versioned service-pack readiness gates and operator/domain review | Stage 7 |

Relevant primary evidence:

- BLS five-year startup survival varies by cohort and business cycle:
  https://www.bls.gov/spotlight/2024/business-employment-dynamics-twentieth-anniversary/
- Federal Reserve 2024 employer-firm financial challenges:
  https://www.fedsmallbusiness.org/-/media/project/clevelandfedtenant/fsbsite/reports/2024/2024-report-on-employer-firms.pdf
- BLS employer compensation includes wages and benefits; wages alone omit a
  material share of employer cost:
  https://www.bls.gov/charts/employer-costs-for-employee-compensation/costs-per-hour.htm
- IRS employment-tax obligations and recordkeeping:
  https://www.irs.gov/businesses/small-businesses-self-employed/employment-taxes
  and
  https://www.irs.gov/businesses/small-businesses-self-employed/employment-tax-recordkeeping
- OSHA/NIOSH cleaning-chemical hazards and safe-work guidance:
  https://www.osha.gov/sites/default/files/publications/OSHA3512.pdf
- FTC requirement for a reasonable basis behind advertising claims:
  https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business

## Truthful product and sales language

Approved direction:

- “Turn walkthrough evidence into a faster, reviewable scope and suggested
  estimate.”
- “See which assumptions and costs are driving the job.”
- “Compare estimated and actual results using your business inputs.”
- “Identify accounts that may need review based on your chosen thresholds.”

Do not claim:

- guaranteed accuracy, profit, business success or loss prevention;
- automatic code, health, safety, tax or legal compliance;
- that an image proves an invisible condition or exact measurement;
- that a green indicator is audited accounting profit; or
- support for a service vertical before its service pack passes its release
  gate.

## Delivery plan

The authoritative implementation tracker for this program is
`MULTIMODAL_AND_PROFITABILITY_EXECUTION_PLAN.md`. A later milestone may be
designed while an earlier release gate is pending, but code may not bypass the
dependency order below.

### M0 — product/privacy contract

- Confirm upload consent, retention, deletion, customer-visible use and
  prohibited-content rules.
- Fix media limits and cost budget; choose asynchronous job/runtime boundary.
- Define the observation schema and the first two lower-risk service packs.
- Threat-model tenant isolation, signed URLs, IDOR, malicious files and prompt
  injection in visible text.

### M1 — private evidence foundation

- Private storage, metadata, signed upload/read, lifecycle/delete, thumbnail and
  audit paths.
- Photo-first operator workflow; video storage may ship disabled until frame
  extraction is proven.
- No AI and no price mutation in this slice.

### M2 — reviewed photo intelligence

- Server-side Responses API analysis with Structured Outputs.
- Human accept/edit/reject and complete provenance.
- Cost caps, retry/idempotency, evaluation fixtures and no raw media in logs.

### M3 — bounded video assistance

- Short-video upload, key-frame extraction and optional transcription.
- Same observation review contract as photos; no separate pricing logic.

### M4 — estimate/proposal connection

- Approved facts populate R3-3 inputs; deterministic engine produces scenarios.
- R3-4 freezes selected evidence and estimate provenance into a proposal
  version without exposing internal economics.

### M5 — actual profitability

- After Stage 5 provides trustworthy time/material actuals, compare estimate,
  scheduled and actual performance. Stage 4 provides invoice/collection status
  without conflating cash with profit.

## Release gates

- Exact tenant isolation for originals, derivatives and model results.
- Malicious-file, content-type, signed-URL expiry, IDOR and deletion tests.
- Human confirmation before scope, risk or estimate changes.
- False-positive/false-negative evaluation across low/normal/high-complexity
  examples for every released service pack.
- Cost and latency budgets, graceful manual fallback and provider outage path.
- Accessibility and genuine mobile upload/review acceptance.
- Privacy/security review, operator validation, independent review and founder
  acceptance.
- No paid model use, hosted storage creation or production deployment without
  its action-specific approval.

## Next bounded action

Do not interrupt the accepted R3 dependency chain. First finish R3-2 external
review/preview/operator/founder gates. Then resolve the open R3-3 contract
questions and add an M0 multimodal contract as a companion design task. The
first implementation should be private photo evidence—not raw-video AI,
accounting automation or every service vertical at once.
