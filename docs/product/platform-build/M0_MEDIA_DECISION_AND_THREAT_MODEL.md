# M0 media decision record and threat model

Status: **PREPARED / FOUNDER DECISIONS PENDING / NO IMPLEMENTATION AUTHORIZED**

This record turns the approved multimodal direction into explicit first-build
choices. M1 cannot create buckets, credentials, uploads or migrations until the
photo, retention/deletion, notice, initial-service-pack and private-storage/
scanner decisions are accepted. Model-provider, AI-region/subprocessor and cost
ceilings are later M2 gates and do not block provider-neutral M1 photo storage.

## Required decisions and recommended defaults

| Decision | Recommended first-build default | Status |
|---|---|---|
| Photo types and limits | JPEG/PNG/WebP; 20 photos; 15 MiB each; 150 MiB per walkthrough; HEIC/video disabled | PENDING FOUNDER ACCEPTANCE |
| Retention | Organization chooses 30/90/180/365 days; default/cap 365; abandoned walkthroughs expire from last activity under the same policy | PENDING FOUNDER ACCEPTANCE |
| Deletion | Remove normal access immediately; delete originals, derivatives and provider copies within 30 days; retry/escalate failures and retain a content-free deletion receipt | PENDING FOUNDER ACCEPTANCE |
| Notice/prohibited content | Versioned operator authorization-and-notice attestation; prohibit intentional people, IDs, cards, screens, medical data, access codes and secrets | PENDING FOUNDER ACCEPTANCE |
| Initial service packs | `commercial_janitorial.v1` and `residential_turnover.v1`; controlled-risk services excluded | PENDING FOUNDER ACCEPTANCE |
| M1 storage/scanner boundary | Private regional storage and malware scanning selected after region, subprocessor, deletion API and DPA review | PENDING FOUNDER ACCEPTANCE |
| M2 model boundary | Model provider selected after region, subprocessors, retention/training, deletion API and DPA review | PENDING BEFORE M2 |
| M2 cost boundary | Explicit per-analysis and monthly organization ceilings before any paid AI call | PENDING BEFORE M2 |

Policy changes apply prospectively to new captures unless an authorized
operator explicitly shortens existing retention. A deletion request overrides
ordinary retention. Recommended deletion policy: delete every standalone media
object and derivative, while already-published immutable proposal bytes remain
as the accepted business record; do not retain a separately downloadable media
object unless that exception is explicitly accepted and disclosed. This policy
choice remains pending. Legal hold is excluded from the first build.

## Threat model

| Threat | Required control and proof |
|---|---|
| Tenant crossover / IDOR | Caller-bound organization, opportunity, property and walkthrough validation; uniform denial; cross-tenant negative matrix |
| Signed-grant replay or leakage | One object, short expiry, server-generated opaque key, content constraints, no listing/public URL; expiry/replay tests |
| Estimator reassignment | Re-check exact active assignment at grant/read/review time; revocation blocks future access without rewriting history |
| Malicious/polyglot/decompression files | Quarantine, magic-byte and decoded-dimension validation, size/decompression caps, scanner pass before promotion |
| Metadata/privacy leakage | Strip metadata from derivatives; no customer data in keys, logs, analytics, audit or outbox payloads |
| Prompt injection in visible text | Treat pixels/text as untrusted evidence, not instructions; strict schema and service-pack allowlist; adversarial fixtures |
| Provider leakage/retention | Server-only credentials, approved region/subprocessors, no training where contractually available, bounded retention and deletion verification |
| Cross-record evidence substitution | Immutable media-version IDs and server validation of every referenced version before suggestion/decision/estimate linkage |
| AI overclaim or unsafe inference | Reject price, exact dimension, diagnosis, chemical, compliance and hazard-clearance output; mandatory human accept/edit/reject |
| Provider outage or cost exhaustion | Idempotent bounded jobs, per-organization caps, operator-visible retry; manual photo/text workflow remains usable |
| Deletion failure | Durable lifecycle states, retry/dead-letter/escalation, provider-copy cleanup and content-free deletion receipt |
| Customer-visible leakage | Separate explicit selection of safe derivative; prohibit internal confidence, cost, margin, access and private evidence |

## Schema and evaluation limits to freeze before M2

The observation schema must specify maximum observations, evidence references,
questions, and per-field string lengths as well as a total response size. It
must reject unknown fields/enums, missing or foreign evidence IDs, duplicate
client IDs and output outside the chosen service pack. Synthetic evaluation
must cover MIME mismatch, malicious files, URL expiry, tenant denial, visible
prompt injection, provider outage, manual fallback, false positive/negative
review and deletion retry. No real customer media is required for these gates.
