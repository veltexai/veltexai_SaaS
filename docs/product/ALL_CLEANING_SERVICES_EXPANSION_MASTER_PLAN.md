# Veltex AI — All Cleaning Services Expansion Master Plan

Status: APPROVED PRODUCT DIRECTION / IMPLEMENTATION PLANNING  
Owner: Anthony Veliz  
Date: 2026-09-22 Pacific

## Product direction

Veltex AI will serve the full cleaning industry. It will not be positioned or architected as janitorial-only software.

The product promise is:

> Veltex AI helps cleaning businesses capture the job, build the right scope, understand the financial assumptions, and create a professional, defensible proposal.

Veltex AI must not claim that one number is the perfect or universally correct bid. Every calculated amount is an editable suggested price supported by visible labor, materials, equipment, overhead, margin, frequency, condition, access, and risk assumptions.

## One platform, vertical-specific engines

The expansion will use one shared account, customer, proposal, and analytics platform with segment-specific intake, estimating, scope, and proposal packages. This avoids creating separate products while preventing unsafe generic formulas.

### Market families

1. Commercial janitorial and facility services
2. Residential maid and recurring home cleaning
3. Airbnb and short-term-rental turnover
4. Move-in, move-out, apartment and real-estate turnover
5. Post-construction and renovation cleanup
6. Carpet, upholstery, tile, grout and textile cleaning
7. Hard-floor care: scrub/recoat, strip/wax, buffing, burnishing and refinishing
8. Interior, exterior, high-access and specialty window cleaning
9. Pressure washing, soft washing, exterior cleaning, roof and gutter cleaning
10. Hospitality, restaurant, kitchen-adjacent and entertainment cleaning
11. Healthcare, dental, veterinary and other regulated environments
12. Industrial, warehouse, manufacturing and distribution cleaning
13. Biohazard, trauma, hoarding, infectious-disease and controlled-risk cleaning
14. Other specialty cleaning configured through the admin catalog

## Required architecture

### 1. Versioned service catalog

Every service must be a data record rather than a hard-coded form choice. Each record carries:

- segment and service family;
- supported property/facility types;
- production unit: square feet, room, fixture, window pane, linear foot, appliance, load, hour or custom unit;
- quantity source and measurement guidance;
- available frequencies and one-time/recurring status;
- baseline production range and editable crew assumptions;
- labor, materials, equipment and subcontractor assumptions;
- minimum charge, travel, access, condition and urgency factors;
- risk, training, insurance and compliance questions;
- inclusions, exclusions, add-ons and customer responsibilities;
- proposal language and operator-editable notes;
- version, effective date and approval status.

### 2. Segment-aware intake

Onboarding asks what the business cleans and what services it offers. A job then asks only questions relevant to its selected vertical. Examples:

- Residential: bedrooms, bathrooms, occupied/vacant, pets, condition, appliances, recurrence.
- Turnover: checkout/check-in window, linen/laundry, restocking, inspection, damage documentation.
- Windows: panes, stories, screens, tracks, access method, hard-water condition.
- Exterior: surface area/type, water access, height, runoff, chemicals, obstacles.
- Floor care: floor material, measured area, finish condition, coats, furniture movement, cure/access window.
- Post-construction: rough/final/touch-up phase, dust load, debris, labels/adhesive, trade completion.
- Biohazard/regulated: capability confirmation, certification/training, PPE, disposal, exposure and exclusion gates.

### 3. Suggested-price workbench

Every vertical produces an editable recommendation with:

- estimated labor hours and crew size;
- wage burden and labor cost;
- materials and consumables;
- equipment and rental;
- travel, mobilization and minimum charge;
- overhead allocation;
- target gross margin and resulting suggested price;
- low/base/high scenario where uncertainty is material;
- warnings when required inputs are missing or assumptions are outside validated ranges;
- an operator override with a recorded reason.

### 4. Vertical proposal packages

The proposal generator composes the selected property profile and service packages into industry-appropriate scopes. Every package includes clear assumptions, exclusions, options, recommended frequency, price presentation, acceptance terms and editable customer-facing language.

### 5. Photo and video walkthrough evidence

Create a secure walkthrough workspace where the operator can upload and label photos or short videos by room, area, surface or issue. AI may identify visible conditions and suggest questions or scope items, but it must label observations as suggestions and require operator confirmation before changing quantities, risk classification, scope or price.

### 6. Admin-managed expansion

Authorized administrators must be able to add or revise facilities, services, questions, units, assumptions, proposal text and pricing factors without rewriting the main proposal form. Published proposals retain the catalog version used when they were generated.

## Delivery sequence

### Release 1 — Foundation and residential/turnover MVP

- Introduce the catalog and schema without breaking existing commercial proposals.
- Add business profile: markets served, services offered, crew/wage assumptions and equipment.
- Create residential recurring, standard, deep, move-in/out and Airbnb-turnover packages.
- Add segment-aware onboarding and quick proposal routes.
- Add suggested-price breakdown and editable assumptions.
- Add dedicated residential and turnover demo jobs, proposal examples and landing pages.

Why first: these are broad, high-frequency markets adjacent to capabilities already present in the code, with lower compliance risk than medical or biohazard work.

### Release 2 — High-demand specialty services

- Carpet/upholstery and tile/grout
- Floor care
- Window cleaning
- Pressure/soft washing, gutter and roof cleaning
- Post-construction
- Segment-specific measuring, production and equipment inputs

### Release 3 — Facility package expansion

- Hospitality, restaurant, entertainment, fitness and retail
- Industrial, warehouse, manufacturing and distribution
- Education, childcare, religious, government and public facilities
- Reusable bundled scopes and add-on packages

### Release 4 — Regulated and controlled-risk services

- Healthcare and terminal/infection-control workflows
- Biohazard, trauma, sharps, hoarding and infectious-disease workflows
- Specialist review of training, insurance, disposal, safety, compliance, exclusions and jurisdictional language before release
- Hard gates preventing ordinary janitorial assumptions from being reused automatically

## Marketing and sales architecture

The brand can truthfully say it supports cleaning businesses broadly only as each vertical passes release validation. Marketing uses:

- an umbrella homepage for cleaning businesses;
- dedicated landing pages by vertical and buyer problem;
- vertical-specific demonstrations, screenshots, sample proposals and proof;
- separate campaigns and creative for residential, commercial and specialty decision-makers;
- self-qualifying hooks naming the specific operator and job type;
- conversion tracking by segment, service family, facility type, proposal generated, proposal saved and upgrade intent.

Do not place every cleaning vertical into one advertisement or one landing-page message. The platform is broad; each acquisition path stays specific.

## Acceptance standard for every vertical

A vertical is ready to market only when all of the following pass:

1. Relevant intake questions and validation
2. Editable suggested-price calculation with transparent assumptions
3. Accurate scope, inclusions, exclusions and add-ons
4. Professional proposal and complete mobile/desktop rendering
5. Save, edit, regenerate, print/send/download and subscription rules
6. Analytics and attribution
7. Test fixtures covering low, normal and high-complexity work
8. Operator review by someone experienced in that service
9. Safety/compliance review when applicable
10. Founder acceptance test

## Assignment map

### Codex — product and engineering lead

- Inventory and preserve existing reusable commercial/residential code.
- Design and implement the versioned taxonomy/catalog schema.
- Build segment-aware onboarding, intake and proposal composition.
- Refactor pricing into service-specific strategies and transparent scenarios.
- Add tests, migration safety, analytics and release gates.
- Build the initial residential/turnover MVP before starting regulated verticals.

### Claude — independent product, UX and domain-quality reviewer

- Challenge the taxonomy for missing service families and contradictory terminology.
- Review each workflow for friction, missing operator questions and unsafe assumptions.
- Review proposal copy, exclusions, transparency and market positioning.
- Compare implementation against this acceptance standard and return severity-ranked findings.
- Claude does not silently expand scope or approve regulated services without domain evidence.

### Mohamed — implementation/release specialist when required

- Review the clean implementation branch and migration plan.
- Confirm compatibility with production, Supabase, Stripe and deployment configuration.
- Resolve infrastructure, permission or production-only integration blockers.
- Assist with release and rollback verification.
- Mohamed should receive a bounded technical handoff after Codex has working code and verification evidence, not an open-ended product-definition request.

### Founder/domain specialists

- Anthony approves prioritization, positioning and founder acceptance.
- Experienced operators validate service assumptions and proposal usefulness.
- Qualified safety/compliance professionals review regulated and controlled-risk verticals before release.

## Immediate next build assignment

Start Release 1 with a read-only implementation audit and schema proposal, then implement on a clean branch in this order:

1. catalog schema and compatibility adapter;
2. business markets/services profile;
3. residential recurring/deep/move-out/turnover packages;
4. segment-aware intake;
5. suggested-price breakdown and override controls;
6. proposal composition and samples;
7. analytics, tests and QA;
8. Claude independent review;
9. Mohamed production-readiness review if needed;
10. founder approval before deployment or marketing.

