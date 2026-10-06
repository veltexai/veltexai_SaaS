# R3-6 provider-neutral handoff contract

Status: **ENTRY CONTRACT PREPARED / IMPLEMENTATION DEPENDENCY-BLOCKED**

R3-6 starts only after R3-5 customer acceptance is independently accepted.
Its first build creates a deterministic, downloadable handoff package; it does
not require an external provider, webhook, email or scheduling system.

## 1. Outcome

An authorized owner/admin can generate one immutable operations handoff package
from an accepted proposal version and C0 receipt. The package contains a
canonical JSON manifest, a practical CSV summary and the exact customer-visible
proposal PDF. Downloading the verified package records a delivery receipt and
atomically moves the accepted site packages and parent opportunity to
`handed_off` through the existing guarded lifecycle.

Generation alone is not delivery and cannot move lifecycle state.

## 2. Source-of-truth chain

Every handoff binds, by organization-scoped identifiers and hashes:

`organization -> opportunity -> property -> accepted site packages ->
proposal version -> acceptance receipt -> handoff package/version`.

It copies only the operational fields needed to begin service:

- customer and service-location display identity;
- accepted package IDs, service type/frequency and customer-visible scope;
- exclusions, assumptions and effective commercial terms;
- accepted per-package amounts, deterministic selected subtotal, currency and
  pricing basis (never the full offered total when the receipt accepted only a
  proper subset);
- proposal-version and acceptance-receipt identifiers/hashes; and
- operator-entered internal kickoff notes that pass a dedicated privacy
  allowlist.

It excludes raw bearer tokens, access codes, internal estimate economics,
payroll/wage/margin data, private walkthrough notes, provider credentials,
unaccepted packages and unrelated customer records.

## 3. Additive records

### `crm_handoff_packages`

- organization, opportunity and property IDs;
- proposal-version and acceptance-receipt IDs;
- package version and idempotency request key;
- strict schema version, initially `veltex.handoff.v1`;
- canonical manifest JSON and SHA-256;
- CSV bytes hash and proposal PDF bytes hash;
- complete bundle SHA-256 and byte length;
- generation status (`building`, `ready`, `failed`), bounded failure code;
- created actor/timestamp and ready timestamp; and
- unique organization/request and opportunity/version keys.

Ready package rows and artifact hashes are immutable. A corrected source chain
creates the next package version.

### `crm_handoff_package_sites`

Append-only organization-bound links from a handoff package to every accepted
site package included in the manifest. The exact set must match the selected
packages in the C0 receipt.

### `crm_handoff_delivery_receipts`

- handoff package ID and immutable bundle hash;
- delivery method (`operator_download` initially; future `webhook` or
  `operator_email` requires a separately reviewed adapter);
- delivered actor/timestamp, request key and canonical receipt hash; and
- optional external acknowledgement identifier for later adapters.

One exact retry returns the original receipt. Receipts are append-only.

Artifacts use private organization-scoped storage with short-lived signed
download URLs. Database rows store object keys and hashes, never public URLs.

## 4. Deterministic artifact contract

The canonical JSON manifest defines field order, UTF-8 encoding, timestamp
format, integer minor units and stable null/empty handling. CSV uses UTF-8,
RFC 4180 quoting and a versioned header. Formula-leading cells are escaped to
prevent spreadsheet injection. PDF bytes must be generated from the exact R3-4
proposal version, not the mutable proposal working copy.

The bundle includes:

- `manifest.json` — machine-readable canonical source;
- `sites.csv` — one accepted package/site per row;
- `accepted-proposal.pdf` — exact customer-visible accepted version; and
- `checksums.json` — schema version, filenames, sizes and SHA-256 values.

File order, compression settings and timestamps are normalized so identical
inputs produce identical bundle bytes and hash.

## 5. Commands

### Build

`command_crm_create_handoff_package_internal(actor, organization,
opportunity, acceptance_receipt, request_key, source_hashes)`:

1. authorizes owner/admin before receipt lookup;
2. binds the accepted receipt, immutable proposal version and package-set hash,
   opportunity, property, ordered selected associations, copied per-package
   amounts and selected subtotal;
3. rejects manual-win opportunities without C0 evidence, declined/unaccepted
   packages, stale source hashes and already-handed-off conflicting sources;
4. reserves one package/version idempotently; and
5. records identifier-only audit/outbox evidence.

The server builds and hashes artifacts, then finalizes the reserved package
through a private exact-hash command. Failed generation remains recorded with a
bounded code and may be safely retried; partial artifacts never become ready.

### Deliver/download

`command_crm_record_handoff_delivery_internal(actor, organization,
handoff_package, request_key, expected_bundle_hash)`:

1. requires owner/admin and a ready package;
2. verifies the exact bundle hash and complete accepted-package set;
3. creates the immutable delivery receipt;
4. moves included packages and the parent opportunity to `handed_off` in the
   same transaction through the existing lifecycle guard; and
5. emits identifier-only `handoff.delivered` audit/outbox evidence.

A signed URL is returned only after authorization, immediately before the
download response. If byte streaming fails, lifecycle state must not claim
delivery; the first build records delivery only after the application confirms
the private object and hash are readable and begins the authorized response.
Preview acceptance must explicitly exercise interrupted-download recovery.

## 6. Operator experience

- CRM shows prerequisites and accepted source identifiers before generation.
- The operator reviews included sites and privacy warnings, then generates.
- Ready state shows package version, files, byte sizes and checksum summary.
- Download uses a 44px control, visible progress and bounded retry; refresh
  preserves state.
- Board and List show identical handoff readiness and delivered status.
- Copy distinguishes `Package ready` from `Handed off`.
- Genuine 390px and keyboard/screen-reader acceptance is required.

## 7. Explicit exclusions

- customer email, SMS or external webhook delivery in the first slice;
- external-provider status mirroring, retry queues or dead-letter UI;
- agreement creation, invoicing, payments, scheduling or worker assignment;
- automatic access-note export;
- arbitrary attachments, photos or videos; and
- manual-win conversion into fabricated customer acceptance.

Provider adapters may be added only after the local package/download contract
is accepted and must reuse the R2 ordered outbox, signed requests, retry ceiling
and dead-letter design rather than creating a second delivery system.

## 8. Required proof

- fresh migration replay, grants/definer allowlist and direct-DML denial;
- tenant/role/source-chain/package-set negatives;
- deterministic JSON/CSV/PDF/ZIP golden bytes and hash mutation tests;
- CSV formula-injection, UTF-8, quoting, large-scope and filename tests;
- private object-key isolation, signed-URL expiry and cross-tenant IDOR tests;
- exact retry, changed retry, concurrent build/delivery and partial-failure
  atomicity proof;
- package creation cannot move lifecycle; verified delivery moves every exact
  included package and parent once;
- no private/internal fields in any artifact, log, event or error;
- desktop/genuine-390px interrupted-download and refresh recovery;
- real-format download opened in spreadsheet, PDF and JSON tooling;
- full tests, TypeScript, build, migration and disposable database harness;
- exact independent Claude `PASS`, operator/accessibility review, guarded
  Preview proof and founder acceptance.

## 9. Next action

Do not implement R3-6 until R3-5 is accepted. The first implementation remains
provider-neutral and download-only; external delivery is a later adapter, not a
shortcut around the evidence chain.
