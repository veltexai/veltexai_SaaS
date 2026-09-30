# Claude assignment: R2 fresh-preview guard review

Status: **READ-ONLY INDEPENDENT REVIEW — STOP AFTER PASS/FAIL**

Review exact Git range `d06f47a..a913e33` on branch `codex/r2-fresh-preview-guard`.

## Context

The isolated preview `ynzkwctwlssjcsjmahey` completed the independently reviewed prerequisite reconciliation and now has exactly 52 pre-R2 migration-history rows, zero profiles, zero proposals, the empty aggregate proposal digest, repaired migration-029 template objects and the hardened post-040 template-access function. The existing atomic R2 harness still targeted the older historical preview `wcnfhriosemgchmtwgof` with one profile and two proposals, so its guard would correctly refuse the fresh preview.

## Review questions

1. Confirm the historical `preview-baseline-20260926.json` remains unchanged and the new active baseline accurately represents the verified fresh-preview state.
2. Confirm the five R2 migration bodies `20260925002000` through `20260925006000` are byte-identical to commit `d06f47a`.
3. Confirm the active atomic and SQL-Editor guards require the exact 52-version prerequisite set, no pre-existing R2 schema/history, repaired migration-029 objects, hardened post-040 function semantics, and the 0-profile/0-proposal/e3b0 digest.
4. Confirm post-R2 guards require exactly those 52 prerequisite versions plus exactly five R2 versions, while rollback-only synthetic fixtures remain excluded from the legacy fingerprint.
5. Confirm the bundle builders, validators, generated SQL, documentation and operator instructions agree and do not claim project-ref text alone proves database identity.
6. Independently run the applicable static, generator-parity, migration-chain and disposable PostgreSQL equivalence gates.
7. Look specifically for a way an unrelated empty database, an extra/missing history row, a partially repaired 029/040 state or an already-applied R2 state could pass the guard.

## Required verdict

Return `PASS` only if the exact candidate is safe to execute on isolated preview `ynzkwctwlssjcsjmahey`. Otherwise return `FAIL` with findings ranked Blocker/High/Medium/Low and exact file/line evidence.

Do not access or mutate Supabase, production, credentials, deployments, campaigns or paid services. Do not edit files. Stop after the verdict.
