# Developer guide

`run100A` coordinates narrow Places, qualifier, repository, clock, and diagnostics ports. The repository atomically persists a canonical prospect and provider observation; it never exposes a generic external-write client. Keep composition outside routes and `app/api/cron`.

Append geographies rather than reordering an active cursor list. Configure the Google client request cap equal to the runner cap. Pagination is contract-ready but one page by default.

`RulesCleaningQualifier` emits `method=rules`, a version, score, and reason. A future model implements the same read-only interface but must run after deterministic exclusions unless an explicit reviewed policy changes that gate.

Production adapters must preserve provider idempotency, signal-only domain/phone matching, atomic persistence, run-owned lock renewal/release/cursor updates, nonfatal diagnostics, and race handling. See the identity and database security documents.

## Operator preflight

`preflightOperator` is pure and runs before `OperatorFactories`. Preserve this order: parse arguments; approve environment; approve geography; validate references; validate all limits; validate credential presence; match the nonsecret Supabase hostname; validate mode confirmations; reject production. Tests inject factories and assert they remain untouched on every failure path.

Plans and summaries contain only approved IDs, labels, references, search terms, limits, effects, disabled-integration status, and credential-presence booleans. Never add environment values, headers, keys, JWTs, payloads, signing secrets, or database credentials to output or errors.

`ProviderSourceRecord.sourceGeography` and `sourceQuery` are nullable for provider neutrality. The Google `NormalizedCandidate` keeps both fields non-null; do not weaken that adapter boundary.
