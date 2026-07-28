# C1-C6B Manual QA Checklist

Owner: Anthony
Scope: C1-C6B local browser verification only
Do not start C7 during this QA pass.

## Current manual QA status

Last updated: 2026-07-08
Tester: Anthony
Environment: local (`pnpm dev`)

### Verified so far

- [x] Local app successfully started with `pnpm dev`.
- [x] `.env.local` is loading.
- [x] `/demo-proposal` loads successfully.
- [x] Demo proposal page compiles and returns HTTP 200.

### External blocker (not a C1-C6B code failure)

Auth-dependent manual QA could not continue because the Supabase project hostname is not resolving.

Observed:

- `nslookup`, `curl`, and Chrome all return **NXDOMAIN** / **could not resolve host** for `iwoaaljtifloolszxlu.supabase.co`.
- Reproduced on both Wi-Fi and mobile hotspot.
- Supabase dashboard shows an **active technical issue** banner.

Impact:

- Login, signup, OAuth, magic-link, session refresh, and authenticated dashboard routes cannot be exercised locally until Supabase DNS/API resolution is restored.
- Remaining auth-dependent checklist steps below are marked **BLOCKED**, not **Fail**.

### Code changes during this QA pass

- No runtime code changes were made.
- C7 was not started.

### Overall QA call (current)

- [ ] Ready for Mohamed with no blockers
- [x] Ready for Mohamed with notes
- [ ] Not ready; blockers listed below

Notes for Mohamed:

- Demo surface is locally reachable and healthy.
- Full C1-C6B browser QA is blocked by external Supabase DNS/API resolution, not by a verified defect in the C1-C6B diff.

---

## Prep

1. Start the local app (`pnpm dev` or your usual local start command).
2. Use one commercial demo path and preferably one residential demo path.
3. Have two auth states ready:
   - Logged-in trial/test account with remaining proposal capacity
   - Logged-out browser session (private window is fine)
4. Keep Network tab open in DevTools for generate/save checks when useful.

Quick reference URLs:

- Demo page: `/demo-proposal`
- Quick route: `/dashboard/proposals/quick`
- Advanced builder: `/dashboard/proposals/new`
- Proposals list: `/dashboard/proposals`
- Billing/usage surface: `/dashboard/billing`

Expected demo mappings:

- Commercial -> `scopeTemplateId=commercial_office`
- Residential -> `scopeTemplateId=move_out_turnover`

---

## 1. Logged-in demo → quick proposal route

Goal: Confirm demo CTA lands on the quick route with context.

Steps:

1. Log in with your test account.
2. Open `/demo-proposal`.
3. Select **Commercial**.
4. Generate/load the demo preview if needed.
5. Scroll to the CTA and click **Create My Real Proposal**.
6. Confirm URL matches this pattern:

```text
/dashboard/proposals/quick?source=demo&demoType=commercial&scopeTemplateId=commercial_office
```

7. Confirm the page shows Quick Proposal Flow UI (not blank dashboard, not advanced builder).
8. Confirm Demo Context panel shows:
   - Source: `demo`
   - Demo type: `commercial`
   - Scope template ID: `commercial_office`
9. Repeat once with **Residential**.
10. Confirm residential lands on:

```text
/dashboard/proposals/quick?source=demo&demoType=residential&scopeTemplateId=move_out_turnover
```

Pass criteria:

- [ ] Commercial CTA lands on quick route with correct query params — **BLOCKED** (requires auth + Supabase)
- [ ] Residential CTA lands on quick route with correct query params — **BLOCKED** (requires auth + Supabase)
- [ ] Quick flow renders successfully — **BLOCKED** (requires auth + Supabase)

**Current status:** **BLOCKED** — `/demo-proposal` verified; logged-in quick-route path not runnable while Supabase hostname fails DNS resolution.

---

## 2. Logged-out demo → signup/login → return to quick route

Goal: Confirm redirect preservation across auth.

Steps:

1. Log out (or open a private window).
2. Open `/demo-proposal`.
3. Select commercial and open the demo preview.
4. Click **Create My Real Proposal**.
5. Confirm redirect goes to signup with a preserved `redirect` query value.
6. Confirm the `redirect` value points back to:

```text
/dashboard/proposals/quick?source=demo&demoType=commercial&scopeTemplateId=commercial_office
```

7. Complete signup **or** switch to login and complete auth using any supported method:
   - email/password
   - Google
   - magic link
8. After auth callback succeeds, confirm you land back on the quick route with demo params intact.
9. Confirm no loss of `source`, `demoType`, or `scopeTemplateId`.

Pass criteria:

- [ ] Logged-out click does not dump to blank dashboard — **BLOCKED**
- [ ] Auth URL preserves redirect — **BLOCKED**
- [ ] Successful auth returns to quick route with demo context — **BLOCKED**

**Current status:** **BLOCKED** — external Supabase DNS/API resolution failure.

---

## 3. Quick form defaults from demo context

Goal: Confirm demo defaults are prefilled.

Steps:

1. From commercial demo quick route, stay on Step 1: Property basics.
2. Confirm these defaults are present:
   - Client name: `Evergreen Professional Offices`
   - Company name: `Evergreen Professional Offices`
   - Service location: `Seattle, WA`
   - City: `Seattle`
   - State: `WA`
   - Property type: `Commercial Office`
   - Square footage: `12000`
   - Service frequency: `5x per week` / `5x-week`
3. Confirm email and phone are blank or empty placeholders.
4. Open residential demo quick route and confirm:
   - Client name: `Maple Ridge Residence`
   - Location: `Tacoma, WA`
   - Square footage: `2800`
   - Frequency: `One-time`
   - Scope template: move-out/turnover

Pass criteria:

- [ ] Commercial defaults look correct — **BLOCKED**
- [ ] Residential defaults look correct — **BLOCKED**
- [ ] No fake placeholder email/phone is used — **BLOCKED**

**Current status:** **BLOCKED** — requires authenticated access to `/dashboard/proposals/quick`.

---

## 4. Property Assumptions Lite display

Goal: Confirm assumptions panel is visible and useful.

Steps:

1. Stay on quick route with commercial defaults.
2. Confirm right-side **Property Assumptions Lite** card is visible.
3. Confirm it shows:
   - Recommended Scope
   - Recommended Frequency
   - Restroom estimate
   - Breakroom estimate
   - Traffic Guidance
   - Common Add-Ons
   - Assumptions list
4. Change property type to something medical-like, for example `Medical Office`.
5. Confirm recommended scope updates toward medical office guidance.
6. Change traffic/frequency into a stretched combo if available (e.g. heavy traffic + monthly) and confirm warning language appears.
7. Confirm Step 2 lets you adjust:
   - scope template
   - traffic level
   - restroom count
   - breakroom count
   - add-ons

Pass criteria:

- [ ] Assumptions Lite is visible by default — **BLOCKED**
- [ ] Recommendations update when inputs change — **BLOCKED**
- [ ] Warnings appear for risky combinations when expected — **BLOCKED**

**Current status:** **BLOCKED** — requires authenticated quick route.

---

## 5. Generate proposal

Goal: Confirm generate-only behavior.

Steps:

1. Return to Step 1 and enter a real client email, for example `qa-client@example.com`.
2. Leave phone blank.
3. Move through to Step 3.
4. Click **Continue to Generate Proposal**.
5. In DevTools Network, confirm a request to `/api/proposals/generate`.
6. Confirm generated proposal content appears in the page.
7. Confirm you remain on `/dashboard/proposals/quick`.
8. Confirm no auto-redirect to proposal detail happens.
9. Confirm no save request to `/api/proposals` is fired automatically.

Pass criteria:

- [ ] Generation succeeds with email and no phone — **BLOCKED**
- [ ] Preview content appears in-flow — **BLOCKED**
- [ ] Generation does not save automatically — **BLOCKED**

**Current status:** **BLOCKED** — requires authenticated quick route and backend session.

---

## 6. Edit generated content

Goal: Confirm preview edits stick before save.

Steps:

1. With generated content visible, edit the preview textarea.
2. Add a unique marker, for example:

```text
QA_EDIT_MARKER_ANTHONY_001
```

3. Confirm the marker remains visible after typing.
4. Confirm the Save button is still available.
5. Confirm edit does not clear the generated preview.

Pass criteria:

- [ ] Preview is editable — **BLOCKED**
- [ ] Custom edit text remains on screen — **BLOCKED**
- [ ] Save CTA remains available after edit — **BLOCKED**

**Current status:** **BLOCKED** — depends on successful generate step.

---

## 7. Save proposal

Goal: Confirm phone required before save, then successful save.

Steps:

1. With generated content present and phone still blank, click **Save Proposal**.
2. Confirm a clear validation/error about phone appears.
3. Confirm generated content is still present after the failed save attempt.
4. Enter a real phone number, for example `(555) 123-4567`.
5. Click **Save Proposal** again.
6. Confirm button shows a saving/loading state.
7. In Network tab, confirm a POST to `/api/proposals` (not generate).
8. Confirm request body includes generated/edited content.

Pass criteria:

- [ ] Save without phone fails clearly — **BLOCKED**
- [ ] Generated content survives failed save — **BLOCKED**
- [ ] Save with phone posts to existing `/api/proposals` — **BLOCKED**

**Current status:** **BLOCKED** — requires authenticated generate/save path.

---

## 8. Redirect to `/dashboard/proposals/[id]`

Goal: Confirm post-save destination.

Steps:

1. After successful save, wait for redirect.
2. Confirm URL matches:

```text
/dashboard/proposals/[id]
```

3. Confirm proposal detail page loads.
4. Confirm the proposal title/client context looks consistent with the quick form.
5. Confirm your edited marker (`QA_EDIT_MARKER_ANTHONY_001`) is present in saved content if the detail view exposes it.

Pass criteria:

- [ ] Redirect uses the returned proposal ID — **BLOCKED**
- [ ] Detail page opens successfully — **BLOCKED**
- [ ] Edited content appears to have been saved — **BLOCKED**

**Current status:** **BLOCKED** — depends on successful save.

---

## 9. Confirm proposal appears in `/dashboard/proposals`

Goal: Confirm the saved quick proposal is listed.

Steps:

1. Navigate to `/dashboard/proposals`.
2. Find the proposal you just saved.
3. Confirm it appears in the list with expected title/client context.
4. Open it again and confirm detail still loads.

Pass criteria:

- [ ] Saved quick proposal appears in list — **BLOCKED**
- [ ] List item opens the correct proposal detail — **BLOCKED**

**Current status:** **BLOCKED** — requires authenticated save flow.

---

## 10. Confirm usage count increments exactly once

Goal: Confirm save counts once; generate alone does not.

How to check:

1. Before generating a second proposal, open `/dashboard/billing` and record current usage/remaining proposals if visible.
2. Optionally note dashboard/trial indicators if they display usage.
3. Run generate only on a new quick flow, then stop before save.
4. Refresh billing/usage view and confirm usage did **not** change after generate-only.
5. Save one proposal successfully.
6. Refresh billing/usage view and confirm usage increased by exactly `1`.
7. Confirm remaining proposals decreased by exactly `1` if shown.

If billing UI is unavailable for your account:

- Note that usage visibility could not be confirmed in UI.
- Do **not** modify trial usage code to force visibility.
- Mark as blocked for UI confirmation and ask Mohamed/admin to verify via existing usage RPC/admin view.

Pass criteria:

- [ ] Generate-only does not increment usage — **BLOCKED**
- [ ] One successful save increments usage exactly once — **BLOCKED**
- [x] Or usage check is marked blocked with reason — **BLOCKED** (Supabase DNS/API)

**Current status:** **BLOCKED** — cannot reach billing/usage surfaces without auth.

---

## 11. Confirm no C7 tracking exists

Goal: Confirm activation tracking was not shipped in this scope.

Steps:

1. On quick proposal UI, confirm there is no C7/activation analytics panel or tracking status UI.
2. During generate and save, inspect Network requests for any calls that look like activation event posting.
3. Confirm no user-facing copy says activation tracking is enabled.
4. Confirm no new `activation_events` create/insert network flow appears during the quick path.

Pass criteria:

- [ ] No C7 UI is present — **BLOCKED** (full quick-path check not run)
- [ ] No activation tracking network create flow is observed — **BLOCKED**
- [ ] Quick path remains generate -> save only — **BLOCKED**

**Current status:** **BLOCKED** — static/code review supports no C7 runtime, but in-browser quick-path verification was not completed due to Supabase outage.

---

## 12. Confirm `/dashboard/proposals/new` still works

Goal: Confirm advanced builder regression safety.

Steps:

1. Open `/dashboard/proposals/new`.
2. Confirm the advanced proposal builder still loads.
3. Confirm you can enter basic fields and navigate the existing form without crash.
4. Confirm the page is still the advanced builder, not redirected to quick.
5. If safe for your usage budget, save or draft only enough to confirm the page remains functional; otherwise stop after load/basic navigation.

Pass criteria:

- [ ] Advanced builder still opens — **BLOCKED**
- [ ] No forced redirect into quick route — **BLOCKED**
- [ ] Existing new-proposal path remains usable — **BLOCKED**

**Current status:** **BLOCKED** — `/dashboard/proposals/new` requires authenticated session.

---

## Recommended end-to-end happy path once

Run this full sequence one clean time:

1. Logged-in commercial demo -> quick route
2. Confirm defaults + Assumptions Lite
3. Generate with email, phone blank
4. Edit preview with unique marker
5. Fail save without phone
6. Save with phone
7. Land on proposal detail
8. Confirm list + one usage increment
9. Spot-check advanced builder still opens

---

## Result log

Date: 2026-07-08
Tester: Anthony
Environment: local (`pnpm dev`)

| # | Scenario | Result | Notes |
|---|---|---|---|
| Prep | Local app + env | Pass | `pnpm dev` started; `.env.local` loading |
| Demo | `/demo-proposal` | Pass | Page compiles and returns HTTP 200 |
| 1 | Logged-in demo -> quick | Blocked | Supabase hostname NXDOMAIN |
| 2 | Logged-out auth return | Blocked | Auth cannot complete |
| 3 | Demo defaults | Blocked | Requires authenticated quick route |
| 4 | Assumptions Lite | Blocked | Requires authenticated quick route |
| 5 | Generate | Blocked | Requires authenticated session |
| 6 | Edit preview | Blocked | Depends on generate |
| 7 | Save | Blocked | Depends on generate |
| 8 | Redirect to detail | Blocked | Depends on save |
| 9 | Appears in list | Blocked | Depends on save |
| 10 | Usage increments once | Blocked | Requires auth + billing/usage UI |
| 11 | No C7 tracking | Blocked | Full in-browser quick-path check not run |
| 12 | Advanced builder still works | Blocked | Requires authenticated session |

Final QA call:

- [ ] Ready for Mohamed with no blockers
- [x] Ready for Mohamed with notes
- [ ] Not ready; blockers listed below

Blockers:

1. External Supabase DNS/API resolution failure for `iwoaaljtifloolszxlu.supabase.co` (NXDOMAIN / could not resolve host).
2. Confirmed on Wi-Fi and mobile hotspot via `nslookup`, `curl`, and Chrome.
3. Supabase dashboard shows an active technical issue banner; auth-dependent manual QA must resume after service recovery.
