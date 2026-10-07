# R3-4.1 Cardinality Preview Artifact Review

Review the exact guarded SQL bytes in this packet. Return `PASS` or `FAIL`
with severity-ranked findings. Do not access any hosted environment and do not
modify the packet.

## Bound scope

- isolated Supabase Preview project: `ynzkwctwlssjcsjmahey`;
- production excluded;
- exact predecessor history: all 70 migrations through R3-4.1 package sets;
- exact migration 71 source SHA-256:
  `f69b9bf189b44d955b39610c82d4762e73b854825bc93a4c42c400701433076f`;
- independently reviewed migration packet tip:
  `99c76359610d152c60047ebd5fdecb2399e65d99`.

## Required checks

1. Recompute the SQL and source hashes.
2. Confirm one outer transaction, one advisory lock and one history write.
3. Confirm preflight refuses missing/extra history, non-70 history, missing R3-4.1
   predecessor, a changed old routine definition or changed routine grants.
4. Confirm only the exact migration-71 body can execute.
5. Confirm postflight requires history 71, the per-package deterministic query
   and the accepted `authenticated`-only execute boundary.
6. Confirm the terminal PASS row occurs before the only commit and any error
   rolls the transaction back.
7. Confirm no production identifier, deploy, feature enablement or unrelated
   mutation is present.

The review does not authorize execution, branch movement, credential changes
or deployment.
