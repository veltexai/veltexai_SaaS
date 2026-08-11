# Future workflow integration notes

- Future sources add provider adapters and `prospect_source_records`; they do not add provider ids to canonical prospects.
- 100B may append intelligence/provenance without silently replacing canonical facts.
- Minimal verified contact/email enrichment is a prerequisite to 100C. Use a human-approved verified CSV for the first pilot; consider limited 100D/Apollo only after pilot review.
- 100C owns the additive tables and eligibility contract in `100C_READINESS.md` and remains separately disabled/dry-run-first.
- 100D owns enrichment attempts and field provenance. 100E owns reply events/classification.

Define ownership, status semantics, idempotency, suppression, retries, retention, permissions, diagnostics, and external-write approval before implementing any phase.
