# C6A Quick Proposal Generate-Only Checkpoint Completion

## 1. Executive Summary

This checkpoint implements C6A only: quick proposal generation is now connected from `/dashboard/proposals/quick`, while saving remains intentionally disconnected.

The quick flow now collects a real client email, accepts an optional client phone, prepares a generate-only request, calls `/api/proposals/generate`, and displays the generated proposal content in-place for review.

No proposal is saved. No usage is incremented. No activation tracking, billing, migrations, download tracking, or C7 work was added.

## 2. Files Created

No new files were created for C6A.

## 3. Files Modified

- `features/proposals/quick/schemas/quick-proposal.ts`
- `features/proposals/quick/lib/build-quick-proposal-payload.ts`
- `features/proposals/quick/components/quick-proposal-flow.tsx`
- `features/proposals/quick/index.ts`
- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`
- `features/proposals/quick/__tests__/property-assumptions-lite.test.ts`
- `features/proposals/quick/__tests__/quick-flow-safety.test.ts`

## 4. What Was Built

### Contact Fields

Added contact handling to the quick proposal flow:

- `clientEmail`
- `clientPhone`

`clientEmail` is required before generation because the existing proposal schema requires email and because generated proposals should not be created with fake client contact data.

`clientPhone` is optional for generation.

### Generate-Only Request Builder

Added a generate-only request builder in:

```text
features/proposals/quick/lib/build-quick-proposal-payload.ts
```

The generate request builder prepares the flat request shape expected by `/api/proposals/generate`.

### Generate Button Wiring

The `Continue to Generate Proposal` button now:

- Validates quick form inputs.
- Shows helpful validation errors.
- Calls `/api/proposals/generate`.
- Displays generated proposal content in the quick flow.
- Shows the message that saving will be connected in the next checkpoint.

### Generated Preview

After successful generation, the quick flow displays:

- A generated proposal preview
- A clear next-step message:

```text
Review this generated proposal. Saving will be connected in the next checkpoint.
```

A disabled save-style button is shown only as a coming-next cue:

```text
Save coming in next checkpoint
```

## 5. What Was Intentionally Not Built

C6A intentionally did not include:

- C6B save proposal
- Calls to `/api/proposals`
- Database writes
- Trial usage increments
- Redirects to proposal detail pages
- Proposal emails
- Downloads
- C7 activation tracking
- Supabase migrations
- `activation_events`
- `proposal_events`
- PricingEngine integration
- Stripe or billing changes
- Trial usage behavior changes
- Download tracking
- Analytics dashboard
- Changes to `/dashboard/proposals/new`

## 6. How Placeholder Email/Phone Issue Was Resolved

Before C6A, the quick payload adapter used placeholder values to satisfy the existing proposal form schema:

- `pending-client@example.com`
- `Not provided`

C6A removes those placeholder values from runtime quick proposal code.

Current behavior:

- `clientEmail` is collected in the quick form and required before generation.
- `clientPhone` is collected as optional.
- The generate-only request uses actual form values only.
- If `clientEmail` is missing or invalid, the UI shows a user-facing validation error.
- If the stricter future-save payload builder is used without `clientPhone`, it returns a typed validation error instead of inventing a phone value.

This keeps C6A generation safe while preserving the C6B decision point for save behavior.

## 7. Generate-Only Implementation Summary

The quick flow now calls:

```text
/api/proposals/generate
```

The generate request includes:

- `client_name`
- `client_email`
- `client_company`
- `contact_phone`
- `service_location`
- `regional_location`
- `city`
- `title`
- `service_type`
- `service_frequency`
- `facility_size`
- `service_specific_data`
- `pricing_enabled: false`
- `facility_details`
- `traffic_analysis`
- `service_scope`
- `special_requirements`
- `ai_tone`
- `template_id`
- `selected_addons`

The generate request does not include:

- `generated_content`
- `status`
- save-specific identifiers
- database persistence fields

The generated response content is rendered inside the quick flow for review.

## 8. Save-Disconnected Safety Summary

Save remains disconnected.

Safety checks confirmed the quick flow only references:

```text
/api/proposals/generate
```

The quick flow does not reference:

- `/api/proposals` save endpoint
- `proposal_events`
- `activation_events`
- `increment_user_usage`
- trial usage code
- billing code
- Stripe code
- download tracking

Quick-created proposals should count against trial usage when they are saved later, but that save behavior was not implemented in C6A.

## 9. Tests Added / Updated

Updated:

- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`
- `features/proposals/quick/__tests__/property-assumptions-lite.test.ts`

Added:

- `features/proposals/quick/__tests__/quick-flow-safety.test.ts`

Test coverage now includes:

- Adapter validates with a provided real `clientEmail`.
- Adapter uses provided `clientPhone`.
- Generate adapter does not emit placeholder email or phone values.
- Missing `clientEmail` returns an explicit safe validation error.
- Missing `clientPhone` returns an explicit future-save adapter error for the stricter existing schema.
- Generate request does not include save fields such as `generated_content` or `status`.
- Quick flow calls `/api/proposals/generate`.
- Quick flow does not call `/api/proposals`.
- Quick flow does not reference trial usage changes.

## 10. Tests Blocked and Why

Automated commands were not run because dependencies are not available in the current environment.

Observed blockers:

- `node_modules/.bin` is empty.
- Previous offline `pnpm` attempts entered dependency install/verification.
- `pnpm` attempted to reach `registry.npmjs.org`.
- Network access is restricted, causing `ENOTFOUND registry.npmjs.org`.

Commands still need to be run in a dependency-ready environment:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec jest features/proposals/quick
pnpm build
```

Static safety searches were performed and confirmed the quick runtime files do not contain placeholder contact values or save/usage/event/billing/download references.

## 11. Manual QA Checklist

### Generate-Only Happy Path

- Open a demo proposal page.
- Click `Create My Real Proposal`.
- Confirm `/dashboard/proposals/quick` loads with demo context.
- Complete the guided form.
- Enter a real client email.
- Leave client phone blank.
- Click `Continue to Generate Proposal`.
- Confirm generated proposal content appears in the quick flow.
- Confirm the next-step message says saving will be connected in the next checkpoint.

### Missing Email Validation

- Clear the client email field.
- Click `Continue to Generate Proposal`.
- Confirm a helpful user-facing validation error appears.
- Confirm no generation request succeeds.

### Save Safety

- Confirm no proposal is saved.
- Confirm the user is not redirected to a proposal detail page.
- Confirm no usage/trial count changes.
- Confirm no download is created.
- Confirm no email is sent.

### Regression Checks

- Confirm `/dashboard/proposals/new` still behaves as before.
- Confirm demo proposal preview still works.
- Confirm quick form assumptions still update as property inputs change.

## 12. Risks / Blockers

- Automated verification remains blocked until dependencies are available.
- `/api/proposals/generate` already contains internal pricing fallback behavior. C6A did not modify or add PricingEngine integration, but Claude should review whether calling this existing API is acceptable for the generate-only checkpoint.
- `clientPhone` remains optional for generation, but the existing full proposal schema requires phone for future save payload validation.
- C6B needs a product/engineering decision on whether save should require phone, relax the save contract, or collect phone before saving.
- The generated content is preview-only; users may expect a save action next.

## 13. Recommendation for Claude Review

Ask Claude to review:

- Whether quick generation is correctly limited to `/api/proposals/generate`.
- Whether save remains fully disconnected.
- Whether placeholder contact values are fully removed from runtime quick code.
- Whether `clientEmail` required before generation is the right low-friction tradeoff.
- Whether optional `clientPhone` for generation is safe.
- Whether the future-save typed validation error for missing phone is clear enough.
- Whether generated preview UI is acceptable before C6B.
- Whether tests sufficiently guard against accidental save, trial usage, and placeholder regressions.
- Whether the existing generate API's internal pricing fallback creates any C6A concern.

Claude should not expand the scope into C6B save or C7 tracking during review.

## 14. Recommendation Before C6B

Before starting C6B:

1. Run lint, TypeScript, Jest, and build in a dependency-ready environment.
2. Have Claude review the C6A diff.
3. Manually QA generation with a real authenticated user and valid OpenAI configuration.
4. Decide how saving should handle `clientPhone`:
   - Require phone before save,
   - Make phone optional in a safe save adapter/API path,
   - Or add a dedicated quick-save contract.
5. Confirm trial usage should increment only on save, not generation.

Do not proceed to C6B or C7 until C6A is reviewed and approved.
