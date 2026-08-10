# 100D architecture

100D is the ingestion + suppression half of the acquisition loop. 100C writes a lead; 100D returns
delivery/engagement/suppression events and internal customer state, so the next 100C recheck fails closed
against anyone who must not be contacted again.

```text
provider event / internal status
      │  auth (shared secret, timing-safe)
      ▼
  allowlist (workspace + campaign == approved 100C pilot)
      │
      ▼
  validate + normalize (PII-free) ──▶ deterministic fingerprint (provider_event_id)
      │
      ▼
  atomic apply (one SECURITY DEFINER function):
     resolve contact ─▶ idempotent receipt ─▶ suppression (if bounce/unsub/complaint/DNC)
                     ─▶ processing outcome ─▶ hold unmatched
      │
      ▼
  outbound_suppression_registry  ◀── 100C recheck reads this before every send
```

## Layers
- **Pure core (`src/`)** — provider-neutral, fully unit-tested, no framework/DB coupling: `auth`,
  `allowlist`, `event-classification`, `fingerprint`, `normalize` + `normalize-event`,
  `contact-resolution`, `customer-status`, `ingest` (the pipeline), `reconciliation`, `config`, `types`.
- **Repository boundary (`IngestRepository`)** — the only seam to persistence. `InMemoryIngestRepository`
  backs every test and the offline operator; `SupabaseIngestRepository` delegates to migration-004
  functions via RPC.
- **Routes (`app/api/internal/100x/…`)** — thin Next.js handlers (Node runtime for `node:crypto`);
  disabled by default, they validate + delegate to the core. Never deployed in this phase.
- **Operator (`operator/`)** — terminal-only, four offline modes; reads the authoritative allowlist from
  100C's `operator/campaigns.json`.

## Data model (migration 004, additive)
Reuses 003's `outbound_event_receipts` (idempotent event log, `unique (provider, provider_event_id)`) and
`outbound_suppression_registry` (durable, append-only, `unique` dedupe). Adds:
- `outbound_event_processing` — one outcome row per event (`processed | held_unmatched | reconciled`),
  `unique (provider_event_id)`.
- `outbound_unmatched_events` — held events for reconciliation (append-only; completed in place via
  `resolved_at`/`resolved_contact_id`), `unique (provider_event_id)`.
- `outbound_ingestion_diagnostics` — PII-free structured diagnostics.
- `outbound_ingestion_workflow_state` — minimal cursor for future scheduled reconciliation.

## Atomicity
The failure mode to avoid is "receipt stored but suppression missing." `apply_100d_instantly_event` runs
the whole write — resolution, receipt, suppression, processing, and unmatched hold — inside a single
SECURITY DEFINER function body (one transaction). Either all effects land or none do. Idempotency keys on
every table make a full replay a no-op.

## Deterministic identity
Instantly V2 provides no per-event id, so `provider_event_id` is a versioned SHA-256 over a canonical,
ordered subset: provider, workspace, campaign_id, event_type, **hash of** normalized email, normalized
timestamp, and (when present) email_id, step, variant. No raw email enters the fingerprint. Identical
replays collapse; distinct legitimate events diverge. See `docs/INSTANTLY_EVENT_MAPPING.md`.

## Contact resolution (fail closed)
Resolve by lead mapping, then campaign assignment, then normalized email within the approved campaign.
Zero matches → held unmatched; more than one → ambiguous (held); a different campaign → wrong_campaign.
Never partial-name match. A suppressing event (bounce/unsub/complaint/DNC) still applies its **email-keyed**
suppression even when the contact is unmatched — the event is additionally held so its contact link can be
completed later by reconciliation.

## Least privilege
The route/worker authenticates as `veltex_100d_ingest` (`NOLOGIN NOINHERIT NOBYPASSRLS`) holding EXECUTE
on the 004 functions only — no table grants, no service-role key. All 004 tables have RLS with no direct
policies; only the SECURITY DEFINER functions (owned by the migration owner) touch them.
