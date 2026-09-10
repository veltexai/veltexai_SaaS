# 100S security and compliance boundary

- Official APIs or native schedulers only. Browser extensions and engagement bots are prohibited.
- Tokens live outside the repository, are least-privilege, platform-specific, and are never logged.
- Publishing is not implemented in 100S. The first pilot is manual.
- Compliance verdicts are bound to the complete placement content hash; edits invalidate approval.
- Approval events are append-only. Provider/account/idempotency tuples prevent duplicate publishing in future adapters.
- Complaints and legal-risk items receive no AI draft. Every other reply still requires a human.
- The campaign-level `active` and `publishing_enabled` fields form the database kill switch.
- Research claims carry source, verification identity/date, and optional expiry. Self-authored marketing pages are product references, not independent evidence.
- Do not put customer names, facility details, pricing records, credentials, or unpublished business data into AI prompts or video footage.
