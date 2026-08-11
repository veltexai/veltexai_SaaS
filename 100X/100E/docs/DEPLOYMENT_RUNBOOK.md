# 100E isolated-pilot deployment runbook

1. Review and apply `database/005_reply_intelligence.sql` to project
   `wzpgbbwdqtpyfiojowdj` only. Never apply it to production during pilot validation.
2. Mint a time-bounded JWT with role `veltex_100e_reply`; store it in Keychain, never plaintext files.
3. Add the five `VELTEX_100E_*` variables to the isolated Vercel project. Keep
   `VELTEX_100E_ENABLED=false` for the first deployment.
4. Deploy and confirm existing 100D non-reply webhook behavior is unchanged.
5. Run local/unit classification tests and a hosted synthetic reply test using fabricated addresses and
   content. Verify one result, one action row, optional suppression, and duplicate replay behavior.
6. After separate founder approval, set `VELTEX_100E_ENABLED=true` in the isolated pilot and redeploy.
7. Confirm Instantly Activity reports HTTP 200 and verify no raw content exists in any 100E table.

Rollback: set `VELTEX_100E_ENABLED=false` and redeploy. Migration 005 is additive; do not drop its tables
during an incident because they preserve audit and idempotency records.
