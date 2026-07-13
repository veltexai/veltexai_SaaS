# C1-C3 Quick Proposal Checkpoint Completion

## Summary

This checkpoint implemented the safe first slice of the C1-C7 Activation Bundle:

- C1: Static smart scope templates
- C2: Demo-to-template mapping
- C3: `/dashboard/proposals/quick` route shell
- Minimal auth redirect preservation so demo users do not land in a blank dashboard after signup/login

No C4-C7 work was started.

## Files Created

- `features/proposals/quick/constants/scope-templates.ts`
- `features/proposals/quick/constants/demo-template-map.ts`
- `features/proposals/quick/components/quick-proposal-flow.tsx`
- `features/proposals/quick/index.ts`
- `features/proposals/quick/__tests__/scope-templates.test.ts`
- `features/proposals/quick/__tests__/demo-template-map.test.ts`
- `app/dashboard/proposals/quick/page.tsx`
- `app/dashboard/proposals/quick/loading.tsx`

## Files Modified

- `features/demo-proposal/types/demo-proposal.ts`
- `features/demo-proposal/constants/commercial-demo.ts`
- `features/demo-proposal/constants/residential-demo.ts`
- `features/demo-proposal/components/demo-cta.tsx`
- `features/demo-proposal/components/demo-preview.tsx`
- `features/auth/constants/index.ts`
- `middleware.ts`
- `app/auth/login/page.tsx`
- `app/auth/signup/page.tsx`
- `features/auth/actions/password.ts`
- `features/auth/actions/oauth.ts`
- `features/auth/actions/magic-link.ts`
- `features/auth/components/login-form.tsx`
- `features/auth/components/signup-form.tsx`
- `features/auth/components/magic-link-login-form.tsx`
- `features/auth/components/magic-link-signup-form.tsx`

## What Was Built

### C1: Static Smart Scope Templates

Created cleaning-specific static scope templates with string literal union IDs so TypeScript can catch mapping drift.

Templates included:

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

- `id`
- `label`
- `propertyType`
- `recommendedFrequency`
- `scopeSections`
- `commonAddOns`
- `assumptions`
- `redFlagsOrWarnings`

### C2: Demo-to-Template Mapping

Created a demo-to-template mapping layer for the existing demo proposal types.

Current mappings:

- `commercial -> commercial_office`
- `residential -> move_out_turnover`

The commercial and residential demo constants now include:

- `scopeTemplateId`
- `defaultQuickInputs`

The existing demo preview behavior was preserved.

### C3: Quick Proposal Route Shell

Created `/dashboard/proposals/quick` as the landing page after a user clicks `Create My Real Proposal`.

The route reads:

- `source`
- `demoType`
- `scopeTemplateId`

The shell displays:

- Selected or recommended scope template
- Demo context when present
- Scope sections and cleaning tasks
- Common add-ons
- Practical assumptions
- Red flags or warnings
- A clear message that guided proposal generation is coming in the next checkpoint

The shell does not call generate, save, pricing, or analytics APIs.

## What Was Intentionally Not Built

The checkpoint intentionally did not include:

- C4 guided form implementation
- C5 payload adapter
- C6 generate/save integration
- C7 activation tracking
- Supabase migrations
- `proposal_events`
- `activation_events`
- PricingEngine integration
- Download route tracking
- Trial usage behavior changes
- Stripe or billing changes
- `/dashboard/proposals/new` replacement
- `proposals-header.tsx` CTA changes
- `empty-proposals.tsx` CTA changes
- Full analytics dashboard
- Admin template editor

## Auth Redirect Changes

Auth redirect preservation was required.

Inspection showed the auth callback route already supported a `redirect` parameter, but the login/signup pages and auth form actions generally defaulted back to `/dashboard`, which could drop the intended quick proposal destination.

Minimal redirect preservation was added so unauthenticated users who click `Create My Real Proposal` are sent through signup/login and then returned to:

```text
/dashboard/proposals/quick?source=demo&demoType=<demoType>&scopeTemplateId=<scopeTemplateId>
```

The redirect handling was kept local and guarded:

- Redirects must start with `/`
- Redirects cannot start with `//`
- Invalid values fall back to `/dashboard`

Updated auth paths include password login/signup, Google OAuth, and magic link flows because those are all exposed from the login/signup screens.

### Claude Review Follow-Up: Redirect Encoding

Redirect encoding was rechecked after Claude's conditional approval.

The quick proposal redirect contains its own query string:

```text
/dashboard/proposals/quick?source=demo&demoType=commercial&scopeTemplateId=commercial_office
```

This redirect is now passed through a shared auth redirect helper so it is treated as one opaque `redirect` value when attached to auth URLs. The nested query params are encoded as part of the redirect value instead of becoming separate signup/login/callback query params.

Example encoded signup URL:

```text
/auth/signup?from=demo&redirect=%2Fdashboard%2Fproposals%2Fquick%3Fsource%3Ddemo%26demoType%3Dcommercial%26scopeTemplateId%3Dcommercial_office
```

The auth callback now reads the already-decoded `redirect` search param from `URLSearchParams` and applies the same local-path guard. It no longer double-decodes the redirect value.

### Claude Review Follow-Up: Magic Link Decision

Magic-link redirect support was kept.

Reason:

- Magic-link submit flows use the same guarded callback URL helper as password signup and Google OAuth.
- Magic-link resend preserves `redirectTo`.
- Magic-link secondary links between email/password and magic-link screens preserve `redirectTo`.
- The redirect guard rejects missing, external, and protocol-relative redirects.

If later QA finds a provider-specific Supabase magic-link behavior that drops callback query params, the safe fallback is to revert magic-link-specific redirect forwarding and leave magic-link users on `/dashboard`.

## Test Commands Attempted

The intended checkpoint commands are:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm exec jest features/proposals/quick
```

During the Claude review follow-up, `pnpm lint --offline` was attempted first. Even with the offline flag, `pnpm` entered its dependency verification/install path and attempted to fetch packages from `registry.npmjs.org`. The process was stopped before running the remaining commands because dependencies are not available offline in this environment.

Additional local sanity checks were performed to confirm the quick checkpoint files do not reference:

- `/api/proposals/generate`
- `/api/proposals`
- `proposal_events`
- `activation_events`
- `PricingEngine`
- Stripe or billing code
- Trial usage behavior
- Download tracking

## Why Tests Were Blocked

The test and build commands were blocked by dependency/network setup.

`pnpm` attempted to verify or install dependencies and failed because network access to `registry.npmjs.org` is restricted in the current environment:

```text
ENOTFOUND registry.npmjs.org
```

Because the dependency state could not be resolved offline, lint, TypeScript, build, and Jest verification could not complete in this environment.

## Manual QA Checklist

### Demo Proposal Page

- Open an existing demo proposal page.
- Confirm the demo preview still renders as before.
- Confirm no existing demo content appears removed or redesigned.

### Create My Real Proposal CTA

- Click `Create My Real Proposal`.
- Confirm the destination is:

```text
/dashboard/proposals/quick?source=demo&demoType=<demoType>&scopeTemplateId=<scopeTemplateId>
```

### Quick Proposal Route

- Confirm the quick route loads under the authenticated dashboard shell.
- Confirm the page is not a blank dashboard dead end.
- Confirm the page displays the demo context when present:
  - `source=demo`
  - `demoType`
  - `scopeTemplateId`
- Confirm the selected template appears.
- Confirm scope sections, common add-ons, assumptions, and warnings appear.
- Confirm the page says guided proposal generation is coming in the next checkpoint.

### Logged-Out Flow

- Log out.
- Open a demo proposal page.
- Click `Create My Real Proposal`.
- Confirm the browser goes to signup with a single encoded `redirect` parameter, for example:

```text
/auth/signup?from=demo&redirect=%2Fdashboard%2Fproposals%2Fquick%3Fsource%3Ddemo%26demoType%3Dcommercial%26scopeTemplateId%3Dcommercial_office
```

- Confirm the signup/login URL does not expose `source`, `demoType`, or `scopeTemplateId` as top-level auth page query params.
- Complete password signup/login.
- Confirm the final destination is `/dashboard/proposals/quick`.
- Confirm `source=demo` is preserved.
- Confirm `demoType` is preserved.
- Confirm `scopeTemplateId` is preserved.
- Repeat with Google OAuth if available in the QA environment.
- Repeat with magic link if email delivery is available in the QA environment.
- If magic-link provider behavior drops the callback redirect query, pause and revert magic-link-specific redirect support before C4-C5.
- Open a demo proposal page.
- Click `Create My Real Proposal`.
- Confirm signup/login opens with the quick proposal redirect preserved.
- Complete authentication.
- Confirm the user lands back on `/dashboard/proposals/quick` with the original query parameters intact.

### Regression Checks

- Confirm `/dashboard/proposals/new` still exists and behaves as before.
- Confirm no proposal is generated automatically from the quick route.
- Confirm no proposal is saved automatically from the quick route.
- Confirm no pricing or trial usage behavior is triggered from the quick route.

## Risks / Blockers

- Automated verification is still pending because the current environment cannot reach the package registry.
- Auth redirect changes touched several auth entry points because the UI exposes password, Google, and magic link flows.
- Some secondary auth links inside the magic link screens may warrant a focused review to ensure every navigation path preserves redirect context, though the primary submit flows were updated.
- The quick route is intentionally a shell. It does not validate or persist real proposal inputs yet.
- Residential demo currently maps to `move_out_turnover` as a safe fallback because the activation target is cleaning-business proposal creation and the requested template set does not include a dedicated residential recurring template.

## Recommendation for Claude Review

Ask Claude to review this checkpoint for:

- Type safety of `ScopeTemplateId` and template map drift protection
- Whether the static scope template wording is practical for cleaning businesses
- Whether demo constants were updated without breaking existing demo preview behavior
- Whether the quick route avoids accidental generate/save/pricing/tracking behavior
- Whether auth redirect preservation is minimal, safe, and correctly guarded against external redirects
- Whether tests cover the intended mapping and template integrity checks

Claude should not expand the scope into C4-C7 during review.

## Recommendation for Mohamed Review

Mohamed should review:

- The exact cleaning scope templates and whether the wording matches Veltex AI's target customers
- The commercial demo mapping to `commercial_office`
- The residential fallback mapping to `move_out_turnover`
- The quick route experience after clicking `Create My Real Proposal`
- The logged-out signup/login redirect experience
- Whether the route shell feels like the right starting point before guided inputs and generation are added

Recommended approval decision:

- Approve this checkpoint if the route, mappings, and scope templates feel right.
- Then proceed to C4-C5 in the next checkpoint: guided schema/defaults and Property Assumptions Lite.
