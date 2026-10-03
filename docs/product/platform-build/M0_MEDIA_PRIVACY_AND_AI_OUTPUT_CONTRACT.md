# M0 media privacy and AI-output contract

Status: **DRAFTED FROM APPROVED DIRECTION / FOUNDER ACCEPTANCE PENDING**  
Scope: contract only; no storage, upload, AI call or hosted mutation is authorized

## 1. First-build boundary

M1 supports private walkthrough photos only. JPEG, PNG and WebP are the initial
accepted formats; HEIC and video remain disabled until their conversion paths
are executable and reviewed. An organization may attach at most 20 photos to a
walkthrough, 15 MiB per original and 150 MiB total per walkthrough. Limits are
server-enforced and may be lowered by plan/cost policy.

M3 may later enable MP4/MOV short video only after key-frame extraction and
deletion are proven. The proposed first limit is 90 seconds and 200 MiB; this
is not an active upload allowance before M3 acceptance.

## 2. Tenant and authorization boundary

- Every media record binds organization, opportunity, property, walkthrough,
  uploader and immutable media version.
- Owner/admin and the exact assigned estimator may upload and review. Viewer,
  unrelated estimator, anonymous user and another tenant receive the same
  non-enumerating denial.
- The browser receives only short-lived, one-object upload/read grants after a
  caller-bound server check. Bucket listing and public URLs are forbidden.
- Object keys are server-generated and contain no customer name, address,
  email, access note or predictable record identifier.
- Direct client writes to metadata, derivative, analysis, decision and receipt
  tables are denied; commands are authenticated before receipt lookup.

## 3. Notice, consent and prohibited content

Before first capture, the operator must attest that they are authorized to
record the site and have given any required notice. Veltex records the notice
version and timestamp; it does not determine whether local consent law is
satisfied.

The UI prohibits intentional capture of people, government IDs, payment cards,
computer screens, medical information, alarm/access codes and private keys.
It reminds operators to avoid faces and personal documents. Detection may warn
or quarantine, but does not replace operator responsibility or legal review.

## 4. Validation and processing

1. Upload to a quarantine prefix using a one-object signed grant.
2. Validate magic bytes, MIME allowlist, decoded dimensions, file size and
   decompression limits; reject polyglots and executable content.
3. Scan before promotion. A failed, timed-out or unavailable scan stays
   quarantined and unreadable to the application.
4. Create a metadata-stripped display derivative and thumbnail. The original
   remains private evidence and is never used as a public application URL.
5. Record every lifecycle transition and deletion without media bytes or
   customer content in audit/outbox payloads.

## 5. Retention and deletion

- Default retention is the shorter of the organization's selected policy or
  365 days after walkthrough completion. Organizations may choose 30, 90, 180
  or 365 days for new captures.
- A deletion request immediately removes normal application access and queues
  originals, derivatives, frames, transcripts, analyses and model-file copies
  for permanent deletion within 30 days.
- A legal hold is not included in the first build. If future customers require
  one, it needs a separate role, notice and release contract.
- Proposal versions may retain only explicitly selected customer-visible
  derivatives and their provenance; internal originals do not become proposal
  attachments implicitly.

## 6. AI observation schema

AI output is a suggestion envelope, never an accepted fact:

```json
{
  "schema_version": "walkthrough-observation.v1",
  "service_pack": "commercial_janitorial.v1",
  "observations": [{
    "client_id": "opaque-string",
    "category": "surface|condition|soil|obstacle|access|occupancy|quantity|equipment|travel|uncertainty|safety_question",
    "area_label": "operator-safe label",
    "statement": "visible, non-diagnostic observation",
    "evidence_media_version_ids": ["uuid"],
    "confidence": "low|medium|high",
    "state": "suggested|uncertain|not_visible",
    "missing_questions": ["bounded question"]
  }]
}
```

Unknown fields, unknown enums, missing evidence references, oversized strings,
instructions found inside an image and content outside the selected service
pack are rejected. The model cannot output prices, chemical prescriptions,
exact dimensions, diagnoses, code/compliance conclusions or hazard clearance.

## 7. Human review and provenance

Each observation receives an append-only operator decision: accept, edit or
reject, with actor, timestamp, prior suggestion hash and accepted-value hash.
Only accepted values may become R3-3 estimating inputs. Provenance is preserved
from media version through provider/model/prompt/schema version, suggestion,
decision, estimate run and later proposal version.

AI failure, budget exhaustion or provider outage leaves the manual photo and
text walkthrough fully usable. Retrying is idempotent and cost-capped per
organization. API credentials remain server-side and raw media/output is never
logged.

## 8. Initial service packs

The first two review targets are:

1. `commercial_janitorial.v1` — visible room/surface/condition/obstacle and
   frequency questions; no regulated-hazard conclusion.
2. `residential_turnover.v1` — visible room/surface/condition, appliance/linen/
   restock questions and uncertainty; no damage, safety or habitability ruling.

Move-in/out and post-construction follow the same vocabulary after operator
fixtures pass. Healthcare, biohazard, trauma, sharps, mold/asbestos/lead and
other controlled-risk work remain blocked.

## 9. Required M0 acceptance decisions

- accept or revise the initial photo types and 20/15 MiB/150 MiB limits;
- accept or revise 30/90/180/365-day policy choices and 365-day default cap;
- accept the notice attestation and prohibited-content language;
- accept the two initial service packs and controlled-risk exclusions;
- approve the chosen private storage/provider regions and subprocessors before
  account configuration; and
- approve an explicit per-analysis and monthly organization cost ceiling before
  the first paid AI call.
