# C1-C6B Technical Diff Summary

## 1. Files Created

Quick proposal route:
- `app/dashboard/proposals/quick/page.tsx`
- `app/dashboard/proposals/quick/loading.tsx`

Quick proposal feature:
- `features/proposals/quick/index.ts`
- `features/proposals/quick/components/quick-proposal-flow.tsx`
- `features/proposals/quick/components/property-assumptions-lite.tsx`
- `features/proposals/quick/constants/scope-templates.ts`
- `features/proposals/quick/constants/demo-template-map.ts`
- `features/proposals/quick/schemas/quick-proposal.ts`
- `features/proposals/quick/lib/property-assumptions-lite.ts`
- `features/proposals/quick/lib/build-quick-proposal-payload.ts`

Tests:
- `features/proposals/quick/__tests__/scope-templates.test.ts`
- `features/proposals/quick/__tests__/demo-template-map.test.ts`
- `features/proposals/quick/__tests__/quick-proposal-defaults.test.ts`
- `features/proposals/quick/__tests__/property-assumptions-lite.test.ts`
- `features/proposals/quick/__tests__/quick-proposal-payload.test.ts`
- `features/proposals/quick/__tests__/quick-flow-safety.test.ts`
- `features/auth/utils/__tests__/redirect.test.ts`

Auth utility:
- `features/auth/utils/redirect.ts`

Documentation:
- `docs/c1-c7-activation-bundle-codex-inspection.md`
- `docs/c1-c3-quick-proposal-checkpoint-completion.md`
- `docs/c4-c5-quick-proposal-checkpoint-completion.md`
- `docs/c6a-quick-proposal-generate-only-checkpoint-completion.md`
- `docs/c6b-quick-proposal-save-checkpoint-completion.md`
- `docs/pre-c7-readiness-check.md`
- `docs/c1-c6b-activation-bundle-review-packet.md`
- `docs/c1-c6b-technical-diff-summary.md`

## 2. Files Modified

Demo proposal:
- `features/demo-proposal/components/demo-cta.tsx`
- `features/demo-proposal/components/demo-preview.tsx`
- `features/demo-proposal/constants/commercial-demo.ts`
- `features/demo-proposal/constants/residential-demo.ts`
- `features/demo-proposal/types/demo-proposal.ts`

Auth redirect preservation:
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
- `middleware.ts`

## 3. Key Logic Changes

- Added static cleaning-specific scope templates with typed template IDs.
- Added demo-to-template mapping so demo context can recommend a quick proposal scope.
- Added `/dashboard/proposals/quick` as the authenticated quick proposal destination.
- Added a three-step quick form:
  - Property basics
  - Scope and assumptions
  - Review and generated proposal
- Added Property Assumptions Lite recommendations for scope, frequency, add-ons, restroom/breakroom assumptions, traffic guidance, and warnings.
- Added quick proposal defaults derived from `demoType` and `scopeTemplateId`.
- Added quick proposal payload builders for generation and save.

## 4. Auth Redirect Changes

- Added shared redirect helpers to preserve safe internal redirects as opaque values.
- Updated login, signup, OAuth, magic-link, callback, and middleware paths to keep the quick proposal redirect intact.
- Target redirect example preserved through auth:
  `/dashboard/proposals/quick?source=demo&demoType=commercial&scopeTemplateId=commercial_office`
- Redirects remain limited to internal safe paths.

## 5. Proposal Generate/Save Changes

- Generate is connected from the quick flow to `/api/proposals/generate`.
- Save is connected only after successful generation.
- Save calls the existing `/api/proposals` endpoint with generated proposal content included.
- Generate and save are separate user actions.
- User sees the generated proposal before saving.
- Generated content is editable in a simple textarea before save.
- Successful save redirects to `/dashboard/proposals/[id]`.
- Save relies on the existing API for auth, database insert, and trial usage counting.
- No fake email or phone placeholders are used.
- Phone is optional for generation but required before save because the existing proposal schema requires it.

## 6. Safety Boundaries

- C7 tracking is not built.
- No `activation_events` table or migration was created.
- No `proposal_events` changes were made.
- No Supabase migrations were added.
- No PricingEngine integration was added.
- No Stripe or billing logic was touched.
- Trial usage logic was not modified or bypassed.
- `/dashboard/proposals/new` was not modified.
- Download tracking was not added.
- No analytics dashboard was built.

## 7. Known Blockers

- Local automated checks are still pending because dependencies are not currently runnable in this workspace.
- `node_modules` exists, but `node_modules/.bin` is missing or unusable.
- `pnpm` attempts dependency verification and tries to reach `registry.npmjs.org`, which is blocked by the network-restricted environment.
- C7 should not start until checks pass in a local or CI environment with dependencies available.
- `proposal_events` appears in code references, but no local migration/table/type was found.
- The next activation migration number must be confirmed before creating `activation_events`.

## 8. Exact Tests That Still Need To Run

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec jest features/proposals/quick
pnpm build
```

## 9. Areas Mohamed Should Inspect First

- Demo CTA path: confirm `Create My Real Proposal` lands on `/dashboard/proposals/quick` with demo context.
- Logged-out auth flow: confirm quick proposal redirect survives signup/login/OAuth/magic-link paths.
- Scope templates: confirm cleaning terminology, scope coverage, warnings, and add-ons are accurate.
- Guided form: confirm it feels fast and only asks for essential inputs.
- Generate preview: confirm proposal quality is strong enough before save.
- Save behavior: confirm generated/edited content is saved and redirects to the proposal detail page.
- Usage behavior: confirm quick-created saved proposals increment usage exactly once through the existing save API.
- C7 decision: confirm whether to use a new `activation_events` table and avoid `proposal_events`.
