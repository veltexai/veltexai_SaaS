# C1-C6B Activation Bundle Review Packet

## 1. Executive Summary

The Activation Bundle is implemented through C6B.

The current flow is:

```text
demo proposal -> Create My Real Proposal -> /dashboard/proposals/quick -> guided form -> generate -> edit preview -> save -> proposal detail
```

The quick proposal path now avoids the blank-dashboard dead end, carries demo context forward, uses cleaning-specific scope templates, collects essential inputs, generates a proposal preview, lets the user lightly edit generated content, and saves through the existing proposal creation API.

C7 tracking is not built yet.

## 2. Business Goal

After a user views the instant demo proposal and clicks `Create My Real Proposal`, they should land in a fast guided real proposal flow.

The flow should:

- Preserve demo context.
- Use cleaning-specific scope templates.
- Ask only essential questions.
- Generate a real proposal preview.
- Save through existing proposal infrastructure.
- Avoid bypassing trial usage behavior.
- Reduce friction between demo interest and real proposal creation.

## 3. Current Completed Scope

### C1: Static Smart Scope Templates

Implemented static cleaning-specific scope templates for common proposal types.

Templates include:

- `commercial_office`
- `medical_office`
- `retail`
- `bank`
- `gym_fitness`
- `school_daycare`
- `apartment_common_areas`
- `move_out_turnover`
- `post_construction`
- `floor_care_add_on`
- `window_cleaning_add_on`
- `restroom_breakroom_detail`

Each template includes:

- ID
- Label
- Property type
- Recommended frequency
- Scope sections
- Common add-ons
- Assumptions
- Warnings/red flags

### C2: Demo-to-Template Mapping

Demo proposal types now map into quick proposal templates:

- `commercial -> commercial_office`
- `residential -> move_out_turnover`

Commercial and residential demo constants include quick-flow defaults.

### C3: `/dashboard/proposals/quick` Shell

Created the authenticated quick proposal route:

```text
/dashboard/proposals/quick
```

The route reads:

- `source`
- `demoType`
- `scopeTemplateId`

It replaced the blank dashboard dead end with a real activation route.

### Auth Redirect Preservation

Auth redirect preservation was patched so logged-out users who click `Create My Real Proposal` can sign up or log in and land back on the quick proposal route with demo query params preserved.

Redirect values are encoded as one opaque `redirect` value and guarded as local paths.

### C4: Quick Schema / Defaults

Created a local quick proposal schema/default layer.

Fields include:

- Client name
- Client email
- Client phone
- Company name
- Service location
- City/state
- Property type
- Square footage
- Service frequency
- Scope template ID
- Add-ons
- Notes
- Traffic level
- Restroom count
- Breakroom count
- Cleaning goals

Quick defaults are prefilled from demo context where available.

### C5: Guided Form + Property Assumptions Lite

The quick route now renders a guided form:

- Step 1: Property basics
- Step 2: Scope and assumptions
- Step 3: Review draft inputs

Property Assumptions Lite suggests:

- Recommended scope template
- Recommended frequency
- Common add-ons
- Restroom/breakroom assumptions
- Traffic guidance
- Cleaning-specific warnings

### C6A: Generate-Only

The quick flow now calls:

```text
/api/proposals/generate
```

After successful generation, it displays the generated proposal preview inside the quick flow.

Generation does not save, redirect, or increment usage.

### C6B: Save Proposal Using Existing `/api/proposals`

After generation, the user can review/edit the generated content and click `Save Proposal`.

Save uses:

```text
/api/proposals
```

The existing save endpoint handles:

- Authentication
- Proposal limit checks
- Proposal insert
- Usage increment
- Existing first-proposal/trial side effects

On success, the user is redirected to:

```text
/dashboard/proposals/[id]
```

## 4. What Is Intentionally Not Built

The following are intentionally not built yet:

- C7 tracking
- `activation_events`
- `proposal_events`
- Supabase migration
- Analytics dashboard
- Download tracking
- New quick-save API
- PricingEngine integration
- Stripe/billing changes
- Trial usage bypass

## 5. Files Created

- `app/dashboard/proposals/quick/page.tsx`
- `app/dashboard/proposals/quick/loading.tsx`
- `features/proposals/quick/constants/scope-templates.ts`
- `features/proposals/quick/constants/demo-template-map.ts`
- `features/proposals/quick/components/quick-proposal-flow.tsx`
- `features/proposals/quick/components/property-assumptions-lite.tsx`
- `features/proposals/quick/schemas/quick-proposal.ts`
- `features/proposals/quick/lib/property-assumptions-lite.ts`
- `features/proposals/quick/lib/build-quick-proposal-payload.ts`
- `features/proposals/quick/index.ts`
- `features/proposals/quick/__tests__/scope-templates.test.ts`
- `features/proposals/quick/__tests__/demo-template-map.test.ts`
- `features/proposals/quick/__tests__/quick-proposal-defaults.test.ts`
- `features/proposals/quick/__tests__/property-assumptions-lite.test.ts`
- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`
- `features/proposals/quick/__tests__/quick-flow-safety.test.ts`
- `features/auth/utils/redirect.ts`
- `features/auth/utils/__tests__/redirect.test.ts`
- `docs/c1-c7-activation-bundle-codex-inspection.md`
- `docs/c1-c3-quick-proposal-checkpoint-completion.md`
- `docs/c4-c5-quick-proposal-checkpoint-completion.md`
- `docs/c6a-quick-proposal-generate-only-checkpoint-completion.md`
- `docs/c6b-quick-proposal-save-checkpoint-completion.md`
- `docs/pre-c7-readiness-check.md`

## 6. Files Modified

- `middleware.ts`
- `app/api/auth/callback/route.ts`
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `features/auth/actions/password.ts`
- `features/auth/actions/oauth.ts`
- `features/auth/actions/magic-link.ts`
- `features/auth/components/login-form.tsx`
- `features/auth/components/signup-form.tsx`
- `features/auth/components/magic-link-login-form.tsx`
- `features/auth/components/magic-link-signup-form.tsx`
- `features/auth/constants/index.ts`
- `features/demo-proposal/types/demo-proposal.ts`
- `features/demo-proposal/constants/commercial-demo.ts`
- `features/demo-proposal/constants/residential-demo.ts`
- `features/demo-proposal/components/demo-cta.tsx`
- `features/demo-proposal/components/demo-preview.tsx`

## 7. Key Product Decisions

### Quick-Created Saved Proposals Count Against Trial Usage

Quick proposals save through the existing `/api/proposals` endpoint, so saved quick proposals follow the same trial/proposal usage behavior as standard proposals.

Generation alone does not count against usage.

### Generate and Save Are Separate User Actions

The quick flow does not auto-save after generation.

The user must:

1. Generate.
2. Review or edit.
3. Save.

### Phone Is Optional for Generate but Required Before Save

Client phone can remain blank for generation.

Because the existing `proposalFormSchema` requires `contact_phone`, phone is required before saving.

The UI label is:

```text
Client phone - required to save, helps with follow-up
```

No fake phone placeholder is used.

### Save Uses Existing `/api/proposals`

C6B reuses the existing proposal save endpoint instead of adding a separate quick-save endpoint.

## 8. Known Risks / Blockers

### Automated Checks Pending

Automated checks are pending because the local dependency install is incomplete:

- `node_modules` exists.
- `node_modules/.bin` is missing.
- Previous offline `pnpm` attempts tried to fetch from `registry.npmjs.org`.
- Network access is restricted in this environment.

### C7 Blocked Until Tests Pass and Migration Number Confirmed

C7 should not start until lint, TypeScript, Jest, and build pass in a dependency-ready environment.

### `proposal_events` Status

`proposal_events` appears as a code reference in:

```text
app/api/proposals/[id]/send/route.ts
```

But no local migration or generated type was found for a real `proposal_events` table.

Recommendation: C7 should use a dedicated `activation_events` table and avoid `proposal_events` unless product/engineering confirms it exists outside this repo.

## 9. Manual QA Checklist

### Demo -> Quick Route

- Open a demo proposal page.
- Click `Create My Real Proposal`.
- Confirm the route lands on `/dashboard/proposals/quick`.
- Confirm `source=demo`, `demoType`, and `scopeTemplateId` context appear.

### Logged-Out Auth Redirect

- Log out.
- Open a demo proposal page.
- Click `Create My Real Proposal`.
- Confirm signup/login opens with the quick proposal redirect preserved.
- Complete auth.
- Confirm the user lands back on `/dashboard/proposals/quick` with demo context intact.

### Guided Form

- Confirm demo defaults are prefilled.
- Confirm scope template, property type, frequency, and add-ons can be adjusted.
- Confirm Property Assumptions Lite updates as inputs change.

### Generate

- Enter a real client email.
- Leave client phone blank.
- Click `Continue to Generate Proposal`.
- Confirm generated proposal content appears.
- Confirm no save occurs automatically.

### Edit Preview

- Edit generated content in the preview textarea.
- Confirm edits remain visible.

### Save

- Try saving without phone.
- Confirm a clear validation error appears.
- Enter phone.
- Click `Save Proposal`.
- Confirm save loading state appears.

### Redirect to Proposal Detail

- Confirm successful save redirects to:

```text
/dashboard/proposals/[id]
```

### Proposals List

- Navigate to the proposals list.
- Confirm the saved quick proposal appears.

### Usage Count

- Confirm usage increments exactly once on save.
- Confirm generation alone does not increment usage.

## 10. Test Commands That Must Be Run

Run in a dependency-ready local or CI environment:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec jest features/proposals/quick
pnpm build
```

## 11. Specific Questions for Mohamed

- Does the quick flow feel fast enough?
- Are the scope templates accurate for Veltex AI's target cleaning businesses?
- Is generated proposal quality strong enough?
- Is phone required before save acceptable?
- Is the proposal detail page the right post-save destination?
- Should C7 use `activation_events` and ignore `proposal_events`?
- Is the branch safe to merge/deploy after tests pass?

## 12. Recommendation

C1-C6B is ready for technical review.

C7 should wait until:

- Lint passes.
- TypeScript passes.
- Jest quick proposal tests pass.
- Build passes.
- The activation events migration naming is confirmed.
- Mohamed/product confirms the C1-C6B user flow is acceptable.
