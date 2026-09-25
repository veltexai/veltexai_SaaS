# Cursor R2 team UI shell — accessibility & responsive hardening audit

Branch: `cursor/r2-team-ui-shell`
Scope: `features/organizations/**`, `app/dashboard/settings/team/**`
Status: audit complete for this shell's current scope (member list, invite
dialog, organization switcher). Deferred items are called out explicitly
below, not silently accepted.

## Method

- Static analysis of every component in `features/organizations/components/`.
- Focused Jest/RTL component tests exercising keyboard-only paths, focus
  behavior, live-region announcements, and long-content truncation
  (`features/organizations/__tests__/*.test.tsx`).
- Visual verification at four required widths — **320px, 390px, 768px,
  1280px** — using a jsdom-rendered, fully-hydrated component tree served as
  static HTML with the app's real compiled Tailwind CSS, loaded inside a
  same-origin `<iframe width=... height=...>` for an independently sized
  layout viewport (the available browser tool's CDP `Emulation.setDeviceMetricsOverride`
  did not change the embedded tab's actual `window.innerWidth` in this
  environment — confirmed via `Runtime.evaluate`, so the iframe technique
  was used instead; this is noted as a tooling limitation, not a product
  finding).

## Findings and fixes (this pass)

### 1. Fixed — Invitation UI could imply a live capability that doesn't exist
There was no way for the UI to represent "invitations aren't available yet"
distinct from "click here to invite someone." Added a fail-closed
`TeamCapabilities`/`getCapabilities()` contract (default
`invitationsEnabled: false`) and a dedicated dialog state that explains the
real status instead of showing a form. See
`CURSOR_R2_CONTRACT_REQUEST.md` for the full contract and
`invite-member-dialog.tsx` for the implementation. Covered by
`invite-member-dialog.test.tsx` ("when invitations are not enabled") and
`team-settings-shell.test.tsx` ("fails closed by default").

### 2. Fixed — Focus was not returning to the invite trigger after the dialog closed
The invite dialog is opened from two different triggers (the header button
and the member list's empty-state CTA). Relying on Radix's default
"return focus to whatever was focused before open" was unreliable once
verified with a real test: focus landed on `<body>` instead of the trigger.
Root cause: the assumption that `document.activeElement` at click time is
always the trigger doesn't hold in every environment/timing scenario.

Fix: `TeamSettingsShell` now captures the exact trigger element from the
click event's `currentTarget` (not `document.activeElement`) and restores
focus to it via `InviteMemberDialog`'s new `onAfterClose` prop, wired to
Radix's `onCloseAutoFocus` (`event.preventDefault()` + manual `.focus()`).
This is deterministic regardless of which trigger opened the dialog.
Verified by two new tests in `team-settings-shell.test.tsx` (disabled-state
close and enabled-state cancel), both asserting `toHaveFocus()` on the
original trigger.

### 3. Fixed — Truncated names/emails/org names had no accessible/visible full-text fallback
Long organization names, member names, and emails are truncated with
CSS (`truncate`) for layout reasons but had no way to read the full value.
Added `title` attributes wherever text is truncated (member table rows,
mobile cards, the switcher trigger label, and switcher menu items).
Verified by new long-name tests in `member-list.test.tsx` and
`organization-switcher.test.tsx`, and visually at 320px in
`r2-hardening-long-names.html` (see screenshot below) — no horizontal
overflow, truncation renders cleanly.

### 4. Fixed — No `prefers-reduced-motion` handling on feature-owned motion
Skeleton loading placeholders used a plain `animate-pulse` (infinite CSS
animation) with no reduced-motion override. Added `motion-reduce:animate-none`
to every `Skeleton` usage in `member-list.tsx` and `organization-switcher.tsx`
(these are call-site classes on a shared primitive, not edits to the shared
`components/ui/skeleton.tsx` file itself).

Also added `motion-reduce:animate-none motion-reduce:duration-0` at the
`DialogContent`/`DropdownMenuContent` call sites in this feature's own
components, to reduce the open/close transition for users who prefer
reduced motion.

**Deferred, not fixed — shared file boundary:** the open/close
fade/zoom/slide keyframe animations themselves are defined inside the
shared `components/ui/dialog.tsx` and `components/ui/dropdown-menu.tsx`
primitives (used app-wide, outside this feature's ownership and outside
this task's bounded scope). A fully robust fix (e.g. a `motion-reduce:animate-none`
baked into those shared primitives, or reading `prefers-reduced-motion` to
skip Radix's animation props entirely) would require editing a shared,
cross-lane file. Per the coordination plan's "no shared file edited by two
lanes without reassignment" rule and this task's bounded scope, this is
recorded as a **known, deferred gap** rather than silently worked around.
Recommend a follow-up assignment scoped to `components/ui/*` if stricter
reduced-motion compliance is required app-wide.

### 5. Verified, no change needed — keyboard operation
- Organization switcher: Radix `DropdownMenu` already supports Enter/Space
  to open, arrow keys to navigate, Enter to select, Escape to close with
  focus returned to the trigger. Verified directly (not assumed) with a new
  test: `"returns keyboard focus to the trigger after the menu closes"`.
- Invite dialog: Radix `Select` opens on Enter/Space when the trigger is
  focused (verified against the installed `@radix-ui/react-select` source,
  `OPEN_KEYS = [" ", "Enter", "ArrowUp", "ArrowDown"]`). Added a full
  keyboard-only test exercising tab-to-email → type → keyboard-open role
  select → choose → submit with Enter.
- Tab order in `TeamSettingsShell` follows DOM order in both the mobile and
  desktop layouts (no `flex-row-reverse`/`order-*` utilities used), so
  visual reading order and tab order stay consistent across breakpoints.

### 6. Verified, no change needed — screen-reader names/status announcements
- Loading states use `role="status"` (implicit `aria-live="polite"`) with
  descriptive `aria-label`s ("Loading organizations", "Loading team
  members").
- Error states use `Alert variant="destructive"` (`role="alert"`, implicit
  `aria-live="assertive"`).
- The organization switcher trigger's accessible name always states the
  current organization (`aria-label="Switch organization, current
  organization: {name}"`).
- **Added:** a dedicated `aria-live="polite"` status region in
  `TeamSettingsShell`, independent of the `sonner` toast library's own
  implementation, announcing invite success. This makes the announcement
  testable and doesn't depend on a third-party library's internal markup.
- **Added:** an `aria-describedby` explanation on the "Invite teammate"
  button when it's structurally disabled (no organization selected/loaded
  yet), so screen-reader users get a reason instead of just "disabled."

### 7. Verified, no change needed — contrast-safe state indicators
Every status/role indicator (`RoleBadge`, `StatusPill`) pairs color with a
text label ("Owner", "Active", "Invited", etc.) — none rely on color alone
(WCAG 1.4.1). The active-organization indicator in the switcher menu uses
both `aria-checked` and a visible check icon, not color alone.

### 8. Verified — mobile/desktop layout at the four required widths
Screenshots (compiled Tailwind CSS + real component render, see Method):

| Width | State | Result |
|---|---|---|
| 320px | Default roster | Mobile card list only; desktop table correctly hidden; header stacks to full-width button + org switcher |
| 390px | Default roster | Same mobile layout, more breathing room |
| 768px | Default roster | Switches to desktop table + inline header row (at the `sm:` / 640px breakpoint) |
| 1280px | Default roster | Desktop table, full-width layout |
| 390px | Invite dialog — disabled (fail-closed) | Explanation dialog, no form, "Got it" only |
| 1280px | Invite dialog — enabled (mock demonstration) | Full form renders correctly |
| 320px | Long org/member names | Truncates cleanly, no horizontal overflow, `title` attributes present |
| 390px | Organization switcher open | Radio menu renders, current org checked |
| 390px | Empty roster | "No teammates yet" + CTA |
| 390px | Invite validation error | Red label + explicit error text below the email field (not color-only) |

This directly exercises `member-list.test.tsx`'s existing
`hidden`/`sm:block`/`sm:hidden` class assertions against real rendered
output, not just class-string assertions.

## Test additions in this pass

- `invite-member-dialog.test.tsx`: fail-closed disabled state (3 tests),
  cancellation, keyboard-only operation, role-description-on-change,
  additional malformed-email cases, jsdom `scrollIntoView` polyfill (a
  documented Radix/jsdom test-environment gap, not app behavior).
- `mock-team-adapter.test.ts`: capability defaults/opt-in, defense-in-depth
  refusal when disabled, case-insensitive duplicate email, network-latency
  simulation via `jest.useFakeTimers()`.
- `organization-switcher.test.tsx`: long-name truncation/title, keyboard
  focus-return-to-trigger after Escape.
- `member-list.test.tsx`: long name/email truncation/title on both the
  desktop table and mobile list.
- `team-settings-shell.test.tsx`: fixed the pre-existing end-to-end test to
  explicitly opt into the mock invitation demonstration
  (`capabilities: { invitationsEnabled: true }`) since the production
  default is now disabled; added fail-closed-by-default test, focus
  restoration test, and a network-latency state-transition test
  (idle → loading → success).

## Summary

No new dependencies, no environment variables, no Supabase access, no
migrations, and no shared UI primitive files were modified. One shared-file
gap (Radix animation `prefers-reduced-motion` support) is explicitly
deferred rather than fixed, per lane boundaries. All other findings in this
audit were fixed and are covered by a passing, expanded test suite.
