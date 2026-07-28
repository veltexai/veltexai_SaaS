# C4-C5 Quick Proposal Checkpoint Completion

## 1. Executive Summary

This checkpoint continues the C1-C7 Activation Bundle by implementing C4-C5 only:

- C4: Minimal guided proposal schema/defaults
- C5: Guided form with Property Assumptions Lite

The `/dashboard/proposals/quick` route is now a real, short guided proposal flow instead of a shell. It collects essential cleaning-specific inputs, shows scope assumptions, prepares a draft payload for the existing proposal form shape, and stops before generation or saving.

No C6 or C7 work was started.

## 2. Files Created

- `features/proposals/quick/schemas/quick-proposal.ts`
- `features/proposals/quick/lib/property-assumptions-lite.ts`
- `features/proposals/quick/lib/build-quick-proposal-payload.ts`
- `features/proposals/quick/components/property-assumptions-lite.tsx`
- `features/proposals/quick/__tests__/quick-proposal-defaults.test.ts`
- `features/proposals/quick/__tests__/property-assumptions-lite.test.ts`
- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`

## 3. Files Modified

- `features/proposals/quick/components/quick-proposal-flow.tsx`
- `features/proposals/quick/index.ts`

## 4. What Was Built

### C4: Minimal Quick Proposal Schema and Defaults

Created a local quick proposal schema for the quick flow with the required fields:

- `clientName`
- `companyName`
- `serviceLocation`
- `city`
- `state`
- `propertyType`
- `squareFootage`
- `serviceFrequency`
- `scopeTemplateId`
- `addOns`
- `notes`
- `trafficLevel`
- `restroomCount`
- `breakroomCount`
- `cleaningGoals`

The schema is local to the quick proposal flow and does not modify the existing proposal form schema.

Safe service frequency values are used:

- `one-time`
- `1x-month`
- `bi-weekly`
- `weekly`
- `2x-week`
- `3x-week`
- `5x-week`
- `daily`

Unsupported `6x-week` is not exposed in the quick flow.

Demo-aware defaults were added for:

- Commercial demo: commercial office, 12,000 sq ft, Seattle WA, `5x-week`
- Residential demo: move-out/turnover, 2,800 sq ft, Tacoma WA, `one-time`

### C5: Guided Form With Property Assumptions Lite

The quick route now renders a guided three-step form:

- Step 1: Property basics
- Step 2: Scope and assumptions
- Step 3: Review draft inputs

The form is intentionally short and cleaning-specific. It prepares the user for proposal generation in the next checkpoint but does not generate, save, price, or track anything.

The final button is:

```text
Continue to Generate Proposal
```

When clicked, it only shows:

```text
Proposal generation will be connected in the next checkpoint.
```

## 5. What Was Intentionally Not Built

This checkpoint intentionally did not include:

- C6 generate/save integration
- C7 activation tracking
- Supabase migrations
- `activation_events`
- `proposal_events`
- PricingEngine integration
- Stripe or billing changes
- Trial usage changes
- Download route tracking
- Analytics dashboard
- Calls to `/api/proposals/generate`
- Calls to `/api/proposals`
- Changes to `/dashboard/proposals/new`
- Hard pricing
- Profitability promises

## 6. Guided Form Structure

### Step 1: Property Basics

Collects:

- Client name
- Company name
- Service location
- City
- State
- Square footage
- Property type
- Service frequency

### Step 2: Scope and Assumptions

Collects or confirms:

- Scope template
- Traffic level
- Restroom count
- Breakroom count
- Common add-ons
- Cleaning goals

This step also shows Property Assumptions Lite in the side panel so the user can see practical cleaning recommendations while answering.

### Step 3: Review Draft Inputs

Shows:

- Client
- Location
- Property type and square footage
- Frequency
- Scope template
- Traffic level
- Notes
- Draft prepared title

The final action does not generate or save. It only confirms that generation will be connected in C6.

## 7. Property Assumptions Lite Summary

Property Assumptions Lite is implemented as a pure local helper plus a display component.

It recommends or estimates:

- Recommended scope template
- Recommended frequency
- Common add-ons
- Restroom count
- Breakroom count
- Traffic level
- Traffic guidance
- Cleaning assumptions
- Cleaning-specific warnings/red flags

Inputs used:

- `propertyType`
- `squareFootage`
- `scopeTemplateId`
- `serviceFrequency`
- `trafficLevel`
- `restroomCount`
- `breakroomCount`
- `addOns`

Examples:

- Medical property types recommend `medical_office`.
- Retail/store property types recommend `retail`.
- Large or high-traffic sites are treated as heavier traffic.
- Heavy traffic with monthly service creates a warning.
- Large sites with weekly service create a warning.

No pricing, profitability, labor modeling, or PricingEngine logic is used.

## 8. Adapter Payload Summary

Created:

```text
features/proposals/quick/lib/build-quick-proposal-payload.ts
```

The adapter prepares a draft `ProposalFormData`-shaped payload for the existing proposal form schema.

It maps quick inputs into:

- `title`
- `service_type`
- `template_id`
- `global_inputs`
- `service_specific_data`
- `facility_details`
- `traffic_analysis`
- `service_scope`
- `selected_addons`
- `special_requirements`
- `ai_tone`

The adapter explicitly sets:

- `pricing_enabled: false`
- `generated_content: ""`
- `status: "draft"`

The adapter does not call APIs, generate content, save a proposal, calculate pricing, or change usage/trial counts.

## 9. Placeholder Email/Phone Concern

The existing `proposalFormSchema` requires:

- `global_inputs.client_email`
- `global_inputs.contact_phone`

The quick form intentionally does not collect email or phone in C4-C5 because the business goal is to reduce friction and collect only essential proposal-scoping inputs.

To allow draft payload shape validation against the existing schema, the adapter currently uses placeholder values:

- `pending-client@example.com`
- `Not provided`

This should be reviewed before C6.

Recommended C6 decision:

- Either collect client email/phone in the quick flow before generate/save,
- Or create a minimal safe adapter/API path that permits quick drafts without those fields,
- Or keep placeholders only if product approves that behavior and the generated proposal clearly prompts review before sending.

Do not connect this adapter to saving until the placeholder decision is made.

## 10. Tests Added

Added tests for:

- Quick defaults from demo context
- Property Assumptions Lite recommendations
- Property Assumptions Lite restroom/breakroom estimates
- Property Assumptions Lite warning behavior
- Adapter payload validation against `proposalFormSchema.safeParse(payload).success === true`
- No unsupported `6x-week` quick frequency value

Test files:

- `features/proposals/quick/__tests__/quick-proposal-defaults.test.ts`
- `features/proposals/quick/__tests__/property-assumptions-lite.test.ts`
- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`

## 11. Tests Blocked and Why

The requested test commands were not run because dependencies are not available in the current environment.

Observed blockers:

- `node_modules/.bin` is empty.
- Previous `pnpm lint --offline` still entered dependency verification/install.
- `pnpm` attempted to reach `registry.npmjs.org`.
- Network access is restricted, causing `ENOTFOUND registry.npmjs.org`.

Commands still need to be run in a dependency-ready environment:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec jest features/proposals/quick
pnpm build
```

Static search confirmed the quick proposal feature does not reference:

- `/api/proposals/generate`
- `/api/proposals`
- `proposal_events`
- `activation_events`
- PricingEngine
- Stripe or billing code
- Trial usage code
- Download tracking
- `fetch(`

## 12. Manual QA Checklist

### Demo Entry

- Open a demo proposal page.
- Click `Create My Real Proposal`.
- Confirm the route lands on `/dashboard/proposals/quick`.
- Confirm `source=demo`, `demoType`, and `scopeTemplateId` context is visible.

### Step 1: Property Basics

- Confirm demo defaults are prefilled.
- Edit client name, company name, location, city, state, property type, square footage, and frequency.
- Confirm `6x-week` is not available.

### Step 2: Scope and Assumptions

- Change the scope template.
- Confirm property type, recommended frequency, and add-ons update appropriately.
- Confirm Property Assumptions Lite updates as inputs change.
- Confirm restroom and breakroom assumptions appear.
- Confirm traffic guidance appears.
- Confirm warnings appear for risky combinations, such as heavy traffic with monthly service.

### Step 3: Review Draft Inputs

- Confirm the review summary matches the entered values.
- Add notes.
- Click `Continue to Generate Proposal`.
- Confirm the only result is:

```text
Proposal generation will be connected in the next checkpoint.
```

### No-Save / No-Generate Checks

- Confirm no proposal is generated.
- Confirm no proposal is saved.
- Confirm no pricing is shown.
- Confirm usage/trial count does not change.
- Confirm no analytics dashboard or activation event UI appears.

## 13. Risks / Blockers

- Automated verification remains blocked until dependencies are available.
- The adapter uses placeholder email/phone values to satisfy the existing schema.
- C6 should not save quick proposals until the placeholder email/phone decision is resolved.
- The quick schema is local and intentionally minimal; it may need a carefully scoped bridge to the existing proposal create/generate APIs in C6.
- Property Assumptions Lite is intentionally simple and not a full property intelligence system.

## 14. Recommendation for Claude Review

Ask Claude to review:

- Whether the quick schema is appropriately local and minimal.
- Whether service frequencies align with the existing proposal schema.
- Whether the guided flow is short enough for activation.
- Whether Property Assumptions Lite is practical and cleaning-specific.
- Whether the adapter payload is safe as preparation only.
- Whether the `proposalFormSchema.safeParse` adapter test is sufficient for C5.
- Whether placeholder email/phone should block C6 until resolved.
- Whether any accidental C6/C7 behavior slipped in.

Claude should not expand the scope into generate/save or tracking during review.

## 15. Recommendation Before C6

Before starting C6, product and engineering should decide how quick proposals handle client email and phone.

Recommended checkpoint before C6:

1. Run lint, TypeScript, Jest, and build in a dependency-ready environment.
2. Have Claude review the C4-C5 diff.
3. Have Mohamed/product QA the guided form.
4. Decide whether C6 should:
   - Add email/phone to the quick form,
   - Use a minimal safe API adapter for quick drafts,
   - Or continue with placeholders only with explicit product approval.

Do not proceed to C6 until the placeholder decision and C4-C5 review are complete.
