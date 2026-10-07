# R3-4.1 immutable package-set bridge — independent review assignment

Status: **LOCAL CANDIDATE / INDEPENDENT CLAUDE AND CURSOR REVIEW PENDING**

Review the exact accepted base, candidate commit, migration hash and packet
SHA-256 in `PACKET_MANIFEST.txt`. Do not edit repository files, deploy, access
Preview or Production, create credentials or send customer messages.

## Frozen scope

R3-4.1 is an additive bridge from accepted R3-4 v1 proposal versions to one
immutable v2 version containing an ordered set of one or more exact estimated
work packages. It must preserve every accepted v1 byte and behavior. It adds:

- a v2 parent discriminator and append-only ordered package associations;
- a service-role-only, caller-bound read-only package-set preview;
- a service-role-only, caller-bound atomic package-set publish command;
- strict v2 browser/API input containing only package IDs and concurrency
  tokens, never prices, scopes, hashes, estimate IDs or rendered bytes;
- Board/List package selection, exact server preview and immutable history; and
- adversarial, preview-parity and genuine two-session race evidence.

It must not send a proposal, create a public link, record acceptance/signature,
move an opportunity, create a contract/invoice, schedule work or perform any
R3-5 behavior.

## Claude lane — database/security/atomicity/privacy

Return `PASS` or `FAIL`, ordered findings with file/line evidence, commands
actually run and residual risks. Verify:

1. accepted R3-4 migration bytes are frozen and v1 rows/requests remain exact;
2. actor authorization precedes receipt lookup and owner/admin/exact assigned
   estimator rules are non-enumerating for viewer, unrelated and cross-context
   actors;
3. proposal/customer/property/opportunity/package/estimate bindings are exact;
4. preview and publish derive every customer-visible field from database state
   and preview rendered bytes equal committed rendered bytes;
5. ordered package IDs/tokens are unique, bounded and hashed deterministically;
6. stable lock order, version allocation, associations, all pointers, receipt,
   audit and outbox are one atomic transaction; exact replay succeeds while
   changed order/actor/payload, stale tokens and concurrent losers fail;
7. parent and associations are immutable; grants/RLS/definer allowlists do not
   expose direct association writes or private economics; and
8. the matrix and two-session race are non-vacuous and prove their claims.

Re-run at minimum:

```text
npm run r3-4-1:test-accepted-base
npm run r3-4-1:test-migration-foundation
npm run r3-4-1:test-postgres-foundation
npm run migrations:validate
```

## Cursor lane — operator workflow/accessibility/regression

Return `PASS` or `FAIL`, ordered findings with file/line evidence, commands
actually run and residual risks. Do not duplicate Claude's deep SQL audit.
Verify:

1. Board and List expose the same action only for eligible open residential or
   turnover opportunities with property and estimated packages;
2. operators can select at least one package and understand that multiple
   selections create one immutable package-set version;
3. exact server-visible titles, per-package prices/bases/scopes, offered total
   and rendered content are reviewed before preparation;
4. one selected package preserves the accepted v1 request and multiple
   packages use strict v2 identity/token-only input;
5. selection changes issue a fresh preview/idempotency key, stale 409 recovery
   is explicit, every returned package token is reconciled, history is not
   overwritten and copy remains prepared/not sent;
6. viewer and unsupported/closed paths remain unavailable, Board/List and
   Estimate flows do not regress, and browser payloads cannot contain price,
   scope, hashes, estimate identity or rendered bytes; and
7. dialog keyboard/focus/escape/return behavior, 44px controls, responsive
   containment and genuine 390px usability are sound. Do not claim visual or
   390px review without actually rendering it.

Re-run at minimum the focused route/Board tests, TypeScript, full Jest suite
and production build with documented loopback-only placeholders.

## Required output

- Exact packet SHA-256 and candidate commit verified.
- Verdict: `PASS` or `FAIL`.
- Findings ordered Critical / High / Medium / Low with precise evidence.
- Tests/checks actually executed and results.
- Explicit confirmation that no hosted or Production state changed.
- Remaining isolated Preview, responsive/operator and founder gates even if
  the local verdict is `PASS`.
