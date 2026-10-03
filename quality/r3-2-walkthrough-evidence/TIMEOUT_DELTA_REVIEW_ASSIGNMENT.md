# Independent delta review — R3-2 stalled evidence save

Review exact commit `f8728c3983775914dbc685acca94201a1cf9e7b0` against
its parent `7ec8655366b42df02cd53ec24acb2583c75b108c`. This is a bounded
client-resilience review only. The accepted R3-2 database/security base and
migration are unchanged. Perform read-only inspection and local/disposable
tests only; do not access or mutate Supabase, Vercel, production, credentials,
billing, email or any other hosted system.

## Defect reproduced on isolated Preview

Two authenticated synthetic sessions loaded one walkthrough evidence token.
After the second session saved a newer draft, the first session submitted its
stale token. When that HTTP request did not settle, the UI remained indefinitely
at `Saving walkthrough evidence…`, kept Save disabled and provided no recovery.
The note remained visible and no success was claimed, but the operator could
not safely retry without closing/reloading.

## Exact correction to review

- `features/crm/components/crm-board.tsx` creates an `AbortController` for the
  evidence command only, aborts after 15 seconds, clears the timer in `finally`,
  retains the existing generic retry announcement and reenables Save.
- `features/crm/__tests__/crm-board.test.tsx` advances the exact timer against a
  deliberately stalled fetch and proves the retry message, retained dialog and
  restored Save action.
- `docs/OPERATING_STATE_AND_DECISION_LEDGER.md` records genuine desktop/390px
  evidence, the defect and the still-pending corrected Preview retest.

## Required verdict

Return `PASS` or `FAIL` with exact file/line evidence. Confirm:

1. the timeout is scoped only to the evidence save and cannot abort unrelated
   board loads or commands;
2. success, safe API errors, network rejection and timeout all clear the timer
   and restore the control without a state update after unmount;
3. timeout does not claim success, discard the typed note, close the dialog or
   weaken the existing concurrency/idempotency contract;
4. the regression does not leak fake timers into later tests and genuinely
   exercises `AbortSignal` rather than merely throwing directly;
5. focused/full Jest, TypeScript, migration-chain validation and diff hygiene
   remain green; and
6. no schema, migration, authorization, privacy, pricing, proposal or broader
   roadmap behavior changed.

Treat a concrete correctness, data-loss, essential-workflow, security or serious
accessibility regression as blocking. Keep nonessential resilience suggestions
as follow-up so this first-build delta is not expanded into a redesign.

Local evidence at packet preparation:

- focused CRM board: 25/25;
- full Jest: 107 suites / 890 tests / 5 snapshots;
- `npx tsc --noEmit --incremental false`: pass;
- migration chain: 67 unique executable versions; and
- `git diff --check`: pass.

Independent delta PASS does not authorize a hosted deployment. After PASS, the
exact corrected commit must still be deployed only to the isolated Preview and
the stalled-request recovery must be retested before founder acceptance.
