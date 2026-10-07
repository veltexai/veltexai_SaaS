# R3-4.1 isolated Preview operator runbook

Status: **ARTIFACT VERIFIED / HOSTED EXECUTION PENDING**.

This runbook is limited to isolated Supabase Preview `ynzkwctwlssjcsjmahey`
and Vercel branch `codex/r2-fresh-preview-guard`. Production, customer data,
aliases, credentials and deployments are excluded.

## Exact identities

- Predecessor: `aa48b5eabd03e3dd4babf313c7b473a9920467b1`
- Reviewed application candidate:
  `a98ca78f1d5527534a82f653edcd62e238951cac`
- SQL: `/private/tmp/veltex-r3-4-1-preview-apply.sql`
- SQL SHA-256: `0b78d9589c851d61eb77c37654fdec1d570a2ee418f01320cc250026eebcce9a`
- Migration SHA-256:
  `1f7f2943813111590e6de914f4de8f455113522079e0258015d56b90587a4eb1`
- Required terminal result: `R3_4_1_PREVIEW_APPLY_PASS|70|0|0`

## Hosted execution

1. Visibly confirm the Supabase project reference is exactly
   `ynzkwctwlssjcsjmahey` and recompute the SQL hash.
2. Execute the complete SQL once. Stop unless its terminal row is exactly the
   required result above.
3. Confirm branch `codex/r2-fresh-preview-guard` is still exactly at the
   predecessor, then fast-forward only that branch to the reviewed candidate.
4. Require a Vercel deployment visibly marked `Preview`, `Ready`, and bound to
   the reviewed commit. Confirm no Production alias changed.
5. Verify signed-out `/dashboard/crm` redirects to `/auth/login` before any
   temporary synthetic credential window.

## Authenticated synthetic acceptance

Use no real customer or address data. With one open synthetic opportunity,
proposal and two eligible estimated packages, complete every item in
`FOUNDER_ACCEPTANCE.md`: Board/List parity, two-package v2 preview and publish,
single-package v1 fallback, deterministic ordering and total, exact replay,
changed replay refusal, immutable history, prepared/not-sent language, stale
request recovery, viewer/unassigned denial, and no delivery or public link.

At exactly `390x844`, record `window.innerWidth` and
`document.documentElement.scrollWidth`; both must be `390`. Record keyboard,
Escape focus return, live status and essential 44px target evidence.

If the existing synthetic user's password is temporarily rotated, immediately
replace it with a fresh unknown random value, sign out, clear the SQL editor to
a benign query and verify the login boundary. Never record either secret.

Any project, hash, history, commit, authorization, preservation, overflow or
Production mismatch is an immediate stop condition.
