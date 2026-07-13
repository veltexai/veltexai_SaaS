# C6B Quick Proposal Save Checkpoint Completion

## 1. Executive Summary

This checkpoint implements C6B only: generated quick proposals can now be saved after the user reviews the generated content.

The quick flow keeps generation and saving as two separate user actions:

1. User completes the quick guided form.
2. User clicks `Continue to Generate Proposal`.
3. Generated content appears in the quick flow.
4. User reviews or lightly edits the generated content.
5. User clicks `Save Proposal`.
6. The proposal is saved through the existing `/api/proposals` endpoint.
7. On success, the user is redirected to `/dashboard/proposals/[id]`.

No C7 activation tracking was added.

## 2. Files Created

No new files were created for C6B.

## 3. Files Modified

- `features/proposals/quick/lib/build-quick-proposal-payload.ts`
- `features/proposals/quick/components/quick-proposal-flow.tsx`
- `features/proposals/quick/index.ts`
- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`
- `features/proposals/quick/__tests__/quick-flow-safety.test.ts`

## 4. What Was Built

### Save Payload Builder

Added:

```text
buildQuickProposalSavePayload(values, generatedContent)
```

This builder:

- Requires generated content before save.
- Reuses the existing full `ProposalFormData` payload shape.
- Includes the generated content in `generated_content`.
- Validates through the existing proposal form schema path.
- Returns typed validation errors instead of inventing placeholder values.

### Save Button

After successful generation, the quick flow now shows a real `Save Proposal` button.

The save button:

- Appears only after generated content exists.
- Has a separate loading state from generation.
- Uses the final generated content currently shown in the quick flow.
- Calls the existing `/api/proposals` endpoint.
- Preserves generated content if saving fails.
- Allows retry without regenerating.

### Success Redirect

After successful save, the quick flow redirects to:

```text
/dashboard/proposals/[id]
```

The ID comes from the existing `/api/proposals` response.

## 5. What Was Intentionally Not Built

C6B intentionally did not include:

- C7 activation tracking
- Supabase migrations
- `activation_events`
- `proposal_events`
- PricingEngine integration
- Stripe or billing changes
- Trial usage bypass
- Trial usage logic changes
- Download tracking
- Analytics dashboard
- Separate quick-save API
- Auto-save after generation
- Changes to `/dashboard/proposals/new`

## 6. Phone Requirement Before Save

The existing `proposalFormSchema` requires:

```text
global_inputs.contact_phone
```

Therefore:

- `clientPhone` remains optional before generation.
- `clientPhone` is required before save.
- No fake phone placeholder is used.
- No silent substitution is performed.

The quick form label was updated to:

```text
Client phone - required to save, helps with follow-up
```

If the user tries to save without phone, the save payload builder returns a typed validation error and the UI shows a clear user-facing message.

## 7. Existing `/api/proposals` Reuse Summary

C6B saves through the existing proposal create endpoint:

```text
/api/proposals
```

No new save API was created.

The quick save payload uses the existing `ProposalFormData` shape and includes:

- `title`
- `service_type`
- `template_id`
- `global_inputs`
- `service_specific_data`
- `pricing_enabled`
- `pricing_data`
- `generated_content`
- `status`
- `facility_details`
- `traffic_analysis`
- `service_scope`
- `selected_addons`
- `special_requirements`
- `ai_tone`

The existing API handles:

- Authentication
- Proposal limit check
- Proposal insert
- Selected add-ons insert
- Usage increment
- Existing first-proposal / trial-exhausted email behavior
- Existing Stripe-backed trial behavior

C6B does not bypass or duplicate any of that behavior.

## 8. Trial Usage Behavior Summary

Product decision:

> Quick-created saved proposals should count against trial proposal usage.

C6B satisfies this by reusing the existing `/api/proposals` save endpoint.

The quick flow does not call or modify usage logic directly. It relies on the existing endpoint, which already:

- Checks proposal creation eligibility through `get_user_usage_info`.
- Inserts the proposal.
- Calls `increment_user_usage`.
- Applies existing trial/subscription side effects.

Generation alone still does not count against usage. Usage is counted only when the user saves.

## 9. Generate vs Save Separation Summary

Generation and saving remain distinct actions.

Generation:

- Triggered by `Continue to Generate Proposal`.
- Calls `/api/proposals/generate`.
- Shows generated content in the quick flow.
- Does not save.
- Does not redirect.

Save:

- Available only after successful generation.
- Triggered by `Save Proposal`.
- Calls `/api/proposals`.
- Saves the reviewed generated content.
- Redirects to `/dashboard/proposals/[id]` on success.

No auto-save occurs after generation.

## 10. Editable Generated Preview Summary

The generated preview is editable with a simple textarea.

This keeps C6B lightweight while allowing the user to make small edits before saving.

The save action uses the current textarea value, so if the user edits the generated proposal, the edited content is saved.

No large rich-text editor was added.

## 11. Tests Added / Updated

Updated:

- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`
- `features/proposals/quick/__tests__/quick-flow-safety.test.ts`

Test coverage now includes:

- Save payload includes `generated_content`.
- Save payload validates through `proposalFormSchema`.
- Save payload does not use placeholder email or phone values.
- Missing required phone before save returns a clear typed validation error.
- Generated content is required before save.
- Generate request does not include save fields.
- Quick flow calls `/api/proposals/generate`.
- Quick flow calls existing `/api/proposals` for save.
- Generate and save remain separate functions/actions.
- Quick flow does not directly reference trial usage changes.
- Quick flow does not introduce activation events, proposal events, Stripe, PricingEngine, billing, or download tracking references.

## 12. Tests Blocked and Why

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

## 13. Static Safety Checks

Static safety searches confirmed:

- Runtime quick files contain no placeholder contact values.
- Quick flow calls `/api/proposals/generate`.
- Quick flow calls `/api/proposals`.
- Quick flow does not reference:
  - `activation_events`
  - `proposal_events`
  - `PricingEngine`
  - `pricing-engine`
  - `stripe`
  - `billing`
  - `download`
  - `increment_user_usage`
  - `trial`
  - `usage`

The quick flow relies on the existing `/api/proposals` endpoint for usage behavior rather than directly importing or calling usage logic.

## 14. Manual QA Checklist

### Generate First

- Open a demo proposal page.
- Click `Create My Real Proposal`.
- Complete the quick guided form.
- Enter a real client email.
- Leave client phone blank.
- Click `Continue to Generate Proposal`.
- Confirm generated content appears.
- Confirm no save occurs automatically.

### Save Requires Phone

- With generated content visible, click `Save Proposal` while phone is blank.
- Confirm a clear validation error appears.
- Confirm generated content remains visible.
- Confirm the user can retry without regenerating.

### Successful Save

- Enter a real client phone.
- Optionally edit the generated preview text.
- Click `Save Proposal`.
- Confirm the button shows a saving state.
- Confirm the proposal saves through `/api/proposals`.
- Confirm redirect goes to `/dashboard/proposals/[id]`.
- Confirm saved proposal contains the generated or edited content.
- Confirm proposal usage increments through existing API behavior.

### Regression Checks

- Confirm `/dashboard/proposals/new` still behaves as before.
- Confirm demo proposal preview still works.
- Confirm quick generation still works before save.
- Confirm no download is created.
- Confirm no C7 tracking UI or event behavior appears.

## 15. Risks / Blockers

- Automated verification remains blocked until dependencies are available.
- Existing `/api/proposals` includes usage, email, and Stripe-backed trial side effects. C6B intentionally reuses this behavior, but Claude should confirm this is acceptable for quick-created saved proposals.
- Phone is required before save due to the existing shared schema. This adds a small amount of friction at save time.
- Generated content is editable in a plain textarea, not a rich editor.
- If `/api/proposals` returns an unexpected response shape without `id`, the quick flow will show a save error and remain on the page.

## 16. Recommendation for Claude Review

Ask Claude to review:

- Whether save correctly reuses `/api/proposals`.
- Whether quick save payload cleanly validates against `proposalFormSchema`.
- Whether phone-required-before-save handling is clear and product-appropriate.
- Whether generated content is definitely included in the save payload.
- Whether generate and save are properly separated.
- Whether save failure preserves generated content and supports retry.
- Whether redirect to `/dashboard/proposals/[id]` uses the returned ID correctly.
- Whether static tests adequately prevent accidental C7/event/billing/download additions.
- Whether relying on existing `/api/proposals` usage/trial behavior is correct.

Claude should not expand the scope into C7 tracking during review.

## 17. Recommendation Before C7

Before starting C7:

1. Run lint, TypeScript, Jest, and build in a dependency-ready environment.
2. Have Claude review the C6B diff.
3. QA the full quick path:
   - demo click
   - auth redirect if logged out
   - quick form
   - generate
   - edit preview
   - save
   - redirect to detail page
   - usage increment
4. Confirm product accepts phone required before save.
5. Confirm product accepts plain-text generated preview editing.
6. Confirm no C7 event schema/migration is needed before adding lightweight tracking.

Do not proceed to C7 until C6B is reviewed and approved.
