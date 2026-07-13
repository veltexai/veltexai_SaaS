# C1-C7 Activation Bundle Codex Inspection

## Goal

Inspect the Veltex AI repo and create a precise implementation plan for the C1-C7 Activation Bundle.

No code changes were made during this inspection. This report is focused on activation after a user views the instant demo proposal and clicks "Create My Real Proposal."

## Existing Map

### Demo Proposal Files and Routes Found

- `app/demo-proposal/page.tsx`
  - Client-rendered demo proposal page.
  - Lets users choose a demo type, generate a demo preview, and view the demo proposal.
  - Current demo types are `commercial` and `residential`.

- `app/demo-proposal/layout.tsx`
  - Demo proposal route layout.

- `features/demo-proposal/index.ts`
  - Barrel export for demo proposal types, constants, and components.

- `features/demo-proposal/types/demo-proposal.ts`
  - Defines:
    - `DemoType`
    - `DemoSection`
    - `DemoProposalData`
    - `DemoCardConfig`
  - `DemoType` is currently `"commercial" | "residential"`.

- `features/demo-proposal/constants/index.ts`
  - Exports `getDemoData(type)`.
  - Maps `commercial` to `COMMERCIAL_DEMO_DATA`.
  - Maps `residential` to `RESIDENTIAL_DEMO_DATA`.

- `features/demo-proposal/constants/commercial-demo.ts`
  - Static commercial demo proposal content.
  - Demo appears closest to a commercial office janitorial proposal.
  - Current scope template label: `Standard Office Janitorial`.

- `features/demo-proposal/constants/residential-demo.ts`
  - Static residential deep clean demo proposal content.
  - Residential demo is outside the requested C1 commercial-heavy template list, but can still map to a safe fallback if needed.

- `features/demo-proposal/components/demo-type-selector.tsx`
  - Shows selectable demo cards for commercial and residential demos.

- `features/demo-proposal/components/demo-preview.tsx`
  - Renders the generated demo preview.
  - Includes gated Save, Download PDF, and Send Proposal buttons that only toast.
  - Renders `DemoCTA` at the bottom.

- `features/demo-proposal/components/demo-cta.tsx`
  - Current "Create My Real Proposal" button points to `AUTH_ROUTES.SIGNUP_FROM_DEMO`.
  - Current "Start Free Trial" button also points to `AUTH_ROUTES.SIGNUP_FROM_DEMO`.
  - No current demo context is preserved beyond `?from=demo`.

- `features/demo-proposal/components/demo-section.tsx`
  - Renders demo proposal content sections.

- `features/demo-proposal/lib/demo-accent.ts`
  - Visual styling helpers for demo variants.

### Dashboard Proposal Files and Routes Found

- `app/dashboard/layout.tsx`
  - Protects all `/dashboard/*` routes.
  - Fetches current user/profile via `getUser()`.
  - Redirects unauthenticated users to `/auth/login`.
  - Provides dashboard layout and branding context.

- `app/dashboard/proposals/page.tsx`
  - Authenticated proposals list page.
  - Fetches proposals via `getUserProposals(user.id)`.
  - Fetches permissions via `getProposalPermissions(user.id)`.
  - Renders `ProposalsHeader`, `EmptyProposals`, or `ProposalsList`.

- `app/dashboard/proposals/new/page.tsx`
  - Authenticated full proposal builder route.
  - Performs usage check via Supabase RPC `get_user_usage_info`.
  - Redirects to `/dashboard/billing?error=subscription_required` if user cannot create proposals.
  - Renders `ProposalForm`.

- `app/dashboard/proposals/[id]/page.tsx`
  - Existing proposal detail route.

- `app/(dashboard)/proposals/[id]/page.tsx`
  - Additional proposal detail/edit route exists in grouped dashboard area.
  - Uses direct Supabase reads/updates for proposal editing.

- `features/proposals/components/new/proposal-form.tsx`
  - Existing full guided builder.
  - Six-step flow:
    1. Facility Intelligence Input
    2. Client-Ready Output Format
    3. Client & Site Context
    4. Scope & Frequency Logic
    5. Facility Intelligence Detail
    6. Labor + Margin Modeling
  - Calls `/api/proposals` to save.
  - Requires generated content before final submit.

- `features/proposals/components/proposals-header.tsx`
  - Current New Proposal CTA points to `/dashboard/proposals/new`.

- `features/proposals/components/empty-proposals.tsx`
  - Current empty-state CTA points to `/dashboard/proposals/new`.

- `queries/get-user-proposals.ts`
  - Fetches all proposals for a user from `proposals`.

- `queries/get-user-proposal-by-id.ts`
  - Fetches a single proposal by `id` and `user_id`.

- `queries/get-proposal-permissions.ts`
  - Fetches proposal permissions.

## APIs Found

### Proposal Generate API

- `app/api/proposals/generate/route.ts`
  - Authenticated POST endpoint.
  - Uses OpenAI.
  - Requires at least `service_type` and `client_name`.
  - Accepts:
    - `client_name`
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
    - `pricing_data`
    - `pricing_enabled`
    - `facility_details`
    - `traffic_analysis`
    - `service_scope`
    - `special_requirements`
    - `ai_tone`
    - `is_regenerate`
    - `template_id`
    - `selected_addons`
  - Uses `proposal_templates` when `template_id` is provided.
  - Formats enhanced facility data into the AI prompt.
  - Can work with the proposed quick-flow adapter if the adapter sends the same shape.

### Proposal Save API

- `app/api/proposals/route.ts`
  - Authenticated POST endpoint.
  - Checks usage via Supabase RPC `get_user_usage_info`.
  - Validates body with `proposalFormSchema`.
  - Inserts into `proposals`.
  - Inserts selected add-ons into `proposal_additional_services` when provided.
  - Increments usage via RPC `increment_user_usage`.
  - Can trigger first-proposal and trial-expired emails.
  - May update Stripe-backed trial state when trial proposal limits are reached.

### Proposal Update/Get/Delete API

- `app/api/proposals/[id]/route.ts`
  - Authenticated GET, PUT, DELETE.
  - GET checks proposal ownership.
  - PUT validates partial `proposalSchema`.
  - DELETE checks ownership before deleting.

### Proposal Download API

- `app/api/proposals/[id]/download/route.ts`
  - Generates PDF using `generateProposalPDF`.
  - Tracks download only when a public tracking ID query param is present.
  - Updates `proposal_tracking`, inserts into `proposal_downloads`, and increments proposal `download_count` if `tracking` is provided.
  - For activation tracking, authenticated dashboard downloads may need a lightweight separate event, because this route currently tracks public proposal downloads only when a `tracking` param exists.

### Proposal Send API

- `app/api/proposals/[id]/send/route.ts`
  - Authenticated POST endpoint.
  - Generates PDF with Playwright when needed.
  - Creates a `proposal_tracking` row.
  - Sends enhanced proposal email.
  - Updates proposal status to `sent`.
  - Attempts to insert into `proposal_events`.
  - Risk: `proposal_events` is referenced in code, but no migration/type was found for that table.

### Pricing API

- `app/api/pricing/calculate/route.ts`
  - Authenticated pricing endpoint.
  - Validates service type, facility size, and frequency.
  - Uses user pricing settings and `PricingEngine`.
  - Full quick path may not need this if Property Assumptions Lite only produces basic assumptions and lets existing generate/save handle the proposal.

## Auth Pattern

- Primary dashboard protection is in `app/dashboard/layout.tsx`.
- It calls `getUser()` from `features/auth/services/get-user`.
- If no user is present, it redirects to `/auth/login`.
- This means `/dashboard/proposals/quick` will be authenticated automatically if created under `app/dashboard/proposals/quick/page.tsx`.
- The full builder route `app/dashboard/proposals/new/page.tsx` adds a proposal-usage gate before rendering.
- Recommendation: reuse the same usage-gate logic for quick save or quick route entry so trial/billing behavior remains consistent.

### Auth Redirect Observations

- `features/auth/constants/index.ts`
  - `SIGNUP_FROM_DEMO` is currently `/auth/signup?from=demo`.

- `app/auth/signup/page.tsx`
  - Reads only `method` from search params.
  - If already authenticated, redirects to `/dashboard`.
  - Does not currently honor `from`, `redirect`, `next`, or demo context.

- `app/auth/login/page.tsx`
  - Reads only `method`.
  - If already authenticated, redirects to `/dashboard`.

- `features/auth/components/signup-form.tsx`
  - Email/password signup uses `signUp`.
  - Google signup uses `signInWithGoogle`.
  - Does not pass a custom redirect destination today.

- `features/auth/actions/password.ts`
  - `signIn` redirects to `/dashboard`.
  - `signUp` confirmation email redirects through `/api/auth/callback?redirect=/dashboard`.

- `features/auth/actions/oauth.ts`
  - Google OAuth redirect is hardcoded to callback with redirect `/dashboard`.

- `app/api/auth/callback/route.ts`
  - Supports `redirect` query param and defaults to `/dashboard`.
  - Therefore preserving quick-flow return is feasible, but signup/login actions need to pass the redirect.

## Tracking Pattern

### Existing Analytics and Tracking

- `lib/analytics/meta-pixel.ts`
  - Client-side Meta Pixel helper.
  - Provides `trackInitiateCheckout`, `trackStartTrial`, and `trackPurchase`.

- `components/MetaPixel.tsx`
  - Initializes Meta Pixel and tracks PageView.

- `components/MetaPixelTracker.tsx`
  - Tracks `CompleteRegistration` when signup metadata indicates completion.

- `types/tracking.ts`
  - Existing tracking types are mostly proposal engagement oriented.
  - Current event types include proposal viewed/downloaded/shared/status/email events, not activation-funnel events.

- `app/api/tracking/view/[trackingId]/route.ts`
  - Tracks public proposal view engagement by `trackingId`.

- `app/api/tracking/scroll/route.ts`
  - Tracks public proposal scroll depth.

- `app/api/tracking/time-spent/route.ts`
  - Tracks public proposal time spent.

- `app/api/tracking/click/route.ts`
  - Attempts to insert detailed click tracking.
  - Potential schema mismatch risk: route inserts `tracking_id`, `element_class`, and `clicked_at`, while the migration found for `proposal_click_tracking` defines fields like `proposal_id`, `session_id`, `element_type`, `element_id`, `element_text`, `page_section`, click position, and `timestamp_offset_seconds`.

- `supabase/migrations/023_proposal_tracking.sql`
  - Creates `proposal_tracking`.

- `supabase/migrations/026_enhanced_tracking_tables.sql`
  - Enhances proposal tracking tables.
  - Creates `proposal_downloads`.
  - Creates `proposal_click_tracking`.

- `supabase/migrations/022_enhanced_proposal_system.sql`
  - Creates `proposal_views`.
  - Adds proposal tracking fields.

### Tracking Recommendation

Use a small dedicated activation-event table/API for the C7 events instead of reusing public proposal tracking tables.

Requested activation events:

- `demo_proposal_viewed`
- `create_real_proposal_clicked`
- `quick_proposal_started`
- `scope_template_selected`
- `guided_form_completed`
- `real_proposal_generated`
- `real_proposal_saved`
- `proposal_download_clicked`
- `upgrade_or_trial_prompt_viewed`

Recommended storage:

- New `activation_events` table with:
  - `id`
  - `user_id`
  - `anonymous_id`
  - `event_name`
  - `source`
  - `demo_type`
  - `scope_template_id`
  - `proposal_id`
  - `metadata`
  - `created_at`

Recommended API:

- `app/api/activation-events/route.ts`
  - Accepts authenticated and unauthenticated events.
  - Uses current user when available.
  - Stores anonymous/session ID when user is not available.
  - Returns success even if non-critical metadata is absent.

## Existing Proposal Template or Demo Type Logic

- Demo type logic is static and simple:
  - `commercial`
  - `residential`

- Existing proposal templates for output design appear database-backed:
  - `proposal_templates`
  - `features/templates/*`
  - `features/proposals/components/new/template-selection-section.tsx`

- Existing service types in proposal schema:
  - `residential`
  - `commercial`
  - `carpet`
  - `window`
  - `floor`

- Existing building/property type options:
  - `features/proposals/constants/facility-options.ts`
  - Commercial options include office, warehouse, retail, restaurant, medical, educational, daycare, church, hospitality, industrial, other.

- Existing scope model:
  - `service_scope.areas_included`
  - `service_scope.areas_excluded`
  - `service_scope.special_services`
  - `service_scope.frequency_details`
  - `service_scope.area_notes`
  - `service_scope.special_notes`

This is compatible with static C1 scope templates.

## Files to Create

- `app/dashboard/proposals/quick/page.tsx`
  - Authenticated quick route shell.
  - Should use dashboard auth/layout automatically.
  - Should not be a blank page.
  - Should perform or reuse proposal-usage gating.

- `features/proposals/quick/components/quick-proposal-flow.tsx`
  - Main guided form component.
  - Keeps form short and activation-focused.
  - Handles demo context, assumptions, generate, save, and redirects to proposal detail.

- `features/proposals/quick/components/property-assumptions-lite.tsx`
  - Small assumptions panel/section.
  - Suggests scope, frequency, add-ons, traffic/restroom/breakroom assumptions based on property type and square footage.

- `features/proposals/quick/constants/scope-templates.ts`
  - Static C1 templates.
  - Should include:
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

- `features/proposals/quick/constants/demo-template-map.ts`
  - Maps demo types/packages to scope template IDs.
  - Initial likely mapping:
    - `commercial` -> `commercial_office`
    - `residential` -> `move_out_turnover` or a safe fallback if residential remains in the demo path.

- `features/proposals/quick/lib/build-quick-proposal-defaults.ts`
  - Converts demo context and query params into initial quick form defaults.

- `features/proposals/quick/lib/build-quick-proposal-payload.ts`
  - Converts quick form state into existing `proposalFormSchema` shape.
  - Main adapter to keep `/api/proposals` reusable.

- `features/proposals/quick/lib/activation-events.ts`
  - Client helper for firing lightweight activation events.

- `features/proposals/quick/types.ts`
  - Quick form types, template IDs, assumption types, event names.

- `features/proposals/quick/__tests__/scope-templates.test.ts`
  - Unit tests for unique IDs and required templates.

- `features/proposals/quick/__tests__/demo-template-map.test.ts`
  - Unit tests for demo mapping coverage.

- `features/proposals/quick/__tests__/build-quick-proposal-payload.test.ts`
  - Unit tests proving quick payload validates against `proposalFormSchema`.

- `app/api/activation-events/route.ts`
  - Lightweight event ingestion.

- `supabase/migrations/037_activation_events.sql`
  - Creates `activation_events`.
  - Adds basic RLS policies.

## Files to Modify

- `features/demo-proposal/types/demo-proposal.ts`
  - Add optional demo context fields:
    - `scopeTemplateId`
    - `defaultServiceType`
    - `defaultPropertyType`
    - `defaultFrequency`
    - `defaultSquareFootage`
    - possible `defaultAddOns`

- `features/demo-proposal/constants/commercial-demo.ts`
  - Add `scopeTemplateId: "commercial_office"`.
  - Add quick defaults based on current demo:
    - service type: commercial
    - property type: commercial office
    - square footage: 12000
    - frequency: `5x-week`
    - restrooms: 4
    - breakrooms: 1

- `features/demo-proposal/constants/residential-demo.ts`
  - Either map to `move_out_turnover` or keep a fallback quick context.
  - Avoid expanding C1 beyond requested cleaning-specific templates unless approved.

- `features/demo-proposal/components/demo-cta.tsx`
  - Replace hardcoded signup href with quick-flow-aware href.
  - Preserve demo context via query params and/or client-side storage.
  - Track `create_real_proposal_clicked`.

- `features/demo-proposal/components/demo-preview.tsx`
  - Track `demo_proposal_viewed` when demo preview is shown.
  - Keep existing gated action behavior intact.

- `app/demo-proposal/page.tsx`
  - May need to pass selected demo type/context into `DemoPreview` or `DemoCTA`.

- `features/auth/constants/index.ts`
  - Add route constants for:
    - `/dashboard/proposals/quick`
    - signup/login from quick with redirect.

- `app/auth/signup/page.tsx`
  - Read and preserve redirect/demo params if needed.
  - Authenticated users from demo should redirect to quick instead of generic dashboard.

- `app/auth/login/page.tsx`
  - Same redirect support for returning users.

- `features/auth/components/signup-form.tsx`
  - Pass redirect destination into signup and Google auth flows if implementing post-auth quick return.

- `features/auth/components/login-form.tsx`
  - Pass redirect destination into sign-in flow if implementing post-auth quick return.

- `features/auth/actions/password.ts`
  - Add safe redirect support to `signIn` and `signUp`.
  - Keep default `/dashboard` behavior for all existing flows.

- `features/auth/actions/oauth.ts`
  - Add optional redirect target to Google auth.
  - Keep default `/dashboard` behavior.

- `features/proposals/components/proposals-header.tsx`
  - Optional: add quick proposal CTA beside existing full builder CTA.

- `features/proposals/components/empty-proposals.tsx`
  - Optional: point first-proposal CTA to quick flow, or add quick and advanced options.

- `app/api/proposals/[id]/download/route.ts`
  - Optional small addition to track `proposal_download_clicked` for authenticated quick-created proposals when no public tracking ID exists.
  - Should not break current tracking-by-`tracking` behavior.

- `types/database.ts`
  - Update after migration/types generation if generated database types are maintained in this repo.

## Recommended Checkpoint Implementation Plan

### Checkpoint 1: Static Scope Templates and Demo Mapping

Deliver C1 and C2 first.

- Create static scope template constants.
- Include all required template IDs.
- Add demo-to-template mapping.
- Add demo context defaults.
- Do not build an admin editor.

Acceptance:

- Every required template exists.
- Template IDs are stable strings.
- Commercial demo maps to `commercial_office`.
- Demo data can produce quick-flow defaults without touching the full builder.

### Checkpoint 2: Quick Route Shell

Deliver C3.

- Create `/dashboard/proposals/quick`.
- Use existing dashboard auth by placing it under `app/dashboard`.
- Reuse usage-gate logic from `app/dashboard/proposals/new/page.tsx` or extract a small shared helper if needed.
- Render a real quick-flow shell with demo context, not an empty dashboard page.

Acceptance:

- Unauthenticated users are redirected to login.
- Authenticated users see a usable quick proposal screen.
- Users without proposal capacity are directed to billing/trial prompt.

### Checkpoint 3: Minimal Schema Defaults and Adapter

Deliver C4.

- Define a quick proposal schema/default model.
- Adapter should output the existing `proposalFormSchema` shape.
- Include:
  - service type
  - property type
  - square footage
  - frequency
  - location
  - scope template ID
  - add-ons
  - client/company info
  - notes
  - pricing assumptions where appropriate

Acceptance:

- Quick payload validates against existing proposal schema.
- No changes required to `/api/proposals` for basic save.
- No existing proposal builder behavior changes.

### Checkpoint 4: Guided Form and Property Assumptions Lite

Deliver C5.

- Build a short guided form.
- Keep the required questions minimal:
  - client name
  - client email
  - client/company
  - phone
  - service address/location
  - property type
  - square footage
  - frequency
  - scope template
  - optional notes/add-ons
- Property Assumptions Lite should suggest:
  - default scope areas
  - default frequency
  - relevant add-ons
  - restroom/breakroom assumptions
  - traffic level/basic cleaning assumptions

Acceptance:

- User can complete the quick flow without going through the full six-step builder.
- Changing property type updates assumptions predictably.
- User can override essentials.

### Checkpoint 5: Generate and Save with Existing APIs

Deliver C6.

- Generate content using `/api/proposals/generate`.
- Save using `/api/proposals` if the adapter proves clean.
- If clean reuse is blocked, add a minimal safe adapter endpoint instead of a major refactor.
- Do not break demo proposal behavior.

Acceptance:

- Real proposal content is generated.
- Real proposal is saved in `proposals`.
- User lands on `/dashboard/proposals/[id]` after save.
- Usage counting remains consistent with existing proposal creation.

### Checkpoint 6: Lightweight Tracking

Deliver C7.

- Add `activation_events` migration and API.
- Add client helper.
- Fire events:
  - `demo_proposal_viewed`
  - `create_real_proposal_clicked`
  - `quick_proposal_started`
  - `scope_template_selected`
  - `guided_form_completed`
  - `real_proposal_generated`
  - `real_proposal_saved`
  - `proposal_download_clicked`
  - `upgrade_or_trial_prompt_viewed`

Acceptance:

- Events are captured without a large analytics dashboard.
- Event failures do not block proposal generation/save.
- Anonymous and authenticated contexts are handled.

### Checkpoint 7: QA and Tests

- Add unit tests for templates, mapping, and quick payload adapter.
- Run typecheck/build.
- Manually QA demo-to-quick-to-save path.

Acceptance:

- Tests pass.
- Existing demo page still works.
- Existing full builder still works.
- Quick flow is fast and clear.

## Risks and Blockers

- `proposal_events` is referenced by `app/api/proposals/[id]/send/route.ts`, but no migration or generated database type was found. Reusing it for activation events is risky until the real database schema is confirmed.

- `app/api/tracking/click/route.ts` appears to insert columns that may not match the `proposal_click_tracking` migration. This suggests existing tracking code/schema may have drifted.

- Signup/login currently do not preserve demo context or quick-flow redirect cleanly. The callback supports `redirect`, but forms/actions need to pass it.

- Existing `/api/proposals` increments usage and may trigger trial/billing side effects. This is probably correct for a real proposal, but Mohamed should confirm quick-created proposals should count against trial proposal usage.

- Existing `/api/proposals/generate` requires OpenAI configuration and may fail locally without `OPENAI_API_KEY`.

- `GlobalInputsSection` includes a `6x-week` option, but `serviceFrequencySchema` does not include `6x-week`. Quick flow should avoid `6x-week` unless schema expansion is approved.

- The residential demo does not align perfectly with the requested C1 template list. Decide whether to keep residential demo as a fallback into `move_out_turnover`, add a residential template later, or route only commercial demo context into the quick flow.

- `PricingEngine` constructor throws if no settings are passed, while some code appears to instantiate with `settings || null`. Avoid relying on fresh pricing-engine paths in quick flow unless verified.

- There is no visible Jest config or test script in `package.json`, even though Jest dependencies and tests exist. Test commands may need direct `pnpm exec jest ...` usage or a small test-script addition in a later implementation.

## Acceptance Criteria

- Clicking "Create My Real Proposal" after viewing the demo lands the user in `/dashboard/proposals/quick`, not a generic dashboard dead end.

- Demo context carries forward:
  - demo type
  - mapped scope template ID
  - service/property defaults
  - basic size/frequency assumptions where available

- Static scope templates include all required C1 template types.

- The quick route is authenticated and follows existing dashboard protection.

- Guided form asks only essential questions and shows Property Assumptions Lite suggestions.

- User can generate proposal content through existing generation API.

- User can save a real proposal through existing save API if the adapter validates cleanly.

- User lands on the saved proposal detail page after save.

- Existing demo proposal behavior remains intact.

- Existing `/dashboard/proposals/new` full builder remains intact.

- Lightweight activation events are fired at the specified points.

- No Stripe, billing, auth, or unrelated refactors occur unless explicitly approved.

## Test Commands to Run

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm exec jest features/proposals/quick`
- `pnpm build`

Manual QA:

- Start dev server with `pnpm dev`.
- Visit `/demo-proposal`.
- Generate commercial demo.
- Click "Create My Real Proposal."
- Verify authenticated redirect behavior.
- Verify quick form starts with commercial office defaults.
- Complete required fields.
- Generate proposal.
- Save proposal.
- Confirm redirect to proposal detail.
- Confirm proposal appears in `/dashboard/proposals`.
- Confirm existing `/dashboard/proposals/new` still works.
- Confirm public demo preview still works.
- Confirm activation events are inserted without blocking UI.

## What Mohamed Should Review After Codex Builds

- Final static scope template wording and whether the included tasks match Mohamed's cleaning-industry expectations.

- Demo-to-template mapping, especially how to handle the current residential demo.

- Whether quick-created proposals should count against free trial proposal usage.

- Whether unauthenticated demo users should be required to sign up before quick form entry, or whether a pre-auth quick draft should be allowed later.

- Whether activation events should use a dedicated `activation_events` table or an existing production table not visible in local migrations.

- Exact pricing assumptions shown in Property Assumptions Lite.

- Whether quick flow should become the primary CTA in proposals empty state and header, or remain demo-only for the first release.

- Whether auth redirect changes for signup/login are acceptable in the activation scope.

## Recommended Minimal Release Shape

The safest implementation is:

1. Static scope templates and demo mapping.
2. Protected `/dashboard/proposals/quick` route.
3. Quick form with Property Assumptions Lite.
4. Adapter that validates into existing `proposalFormSchema`.
5. Generate through `/api/proposals/generate`.
6. Save through `/api/proposals`.
7. Dedicated activation events table/API.
8. Focused unit tests plus manual QA.

This keeps the bundle focused on activation and friction reduction while avoiding a major proposal-builder refactor.
