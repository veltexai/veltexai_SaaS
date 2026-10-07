# R3-5 C0.0 consent and cryptographic boundary

Status: **COMPLETE / VERIFIED / FOUNDER APPROVED**

This decision record implements the first bounded R3-5 entry increment without
creating a migration, public link, customer room, acceptance mutation or hosted
change. It inherits exact accepted R3-4.1 application base
`1888f11c14e55c4dc91fe459ab337a3bc4902c5c`.

## Frozen constants

| Control | Frozen value |
|---|---|
| Consent version | `veltex-c0-acceptance-v1` |
| Approved consent text | “I have reviewed this proposal version and the selected service packages. By selecting Accept proposal, I confirm my acceptance of those selected packages. I understand that Veltex records the name and email I enter, the proposal version, selected packages, and acceptance time. This is not an electronic-signature process.” |
| Raw token | 32 CSPRNG bytes, unpadded base64url (43 characters) |
| Key version | positive integer `1` |
| Server secret name | `VELTEX_C0_ACTION_TOKEN_HMAC_KEY_V1` |
| Database token input | lowercase SHA-256 HMAC digest plus key version only |
| Issuance expiry choices | 1, 3 or 7 days; never more than 7 days |
| Browser bootstrap | raw token in URL fragment, one-time bounded POST exchange |
| Session | opaque `__Host-veltex_c0_session`; HttpOnly, Secure, SameSite=Strict, path `/`, 15-minute maximum age |
| Response policy | `Cache-Control: no-store, max-age=0`; `Referrer-Policy: no-referrer`; `X-Content-Type-Options: nosniff` |
| Designated approver | disabled by default |
| Network rate-limit component | disabled until an explicit trusted-proxy boundary is configured and independently reviewed |

The HMAC secret must contain at least 32 bytes and remains server-only. Raw
tokens, cookie values, authorization headers, email addresses, IP addresses,
user agents and browser fingerprints are rejected from the structured C0 log
schema. Database-facing inputs reject unknown fields, including raw tokens.

## Truthfulness boundary

The approved wording uses **Accept proposal** and explicitly says that the
flow is not an electronic-signature process. The product must not claim a
signature, signed contract, identity verification, guaranteed enforceability,
payment, delivery, scheduling or handoff. Name and email are signer-entered
receipt fields, not verified identity.

On 2026-10-07 the founder explicitly approved retaining this non-signature
wording as `veltex-c0-acceptance-v1` pending counsel review. That closes the
C0.0 consent-disposition gate and permits bounded C0.1 implementation. Counsel
may later require a new allowlisted text/version, but that cannot weaken the
cryptographic, transport, privacy or truthfulness controls above. Public or
production enablement remains separately gated.

## Executable evidence

`lib/crm/customer-action-contract.ts` owns the constants, strict schemas,
32-byte generator and versioned HMAC helper. Its focused test proves:

- token length, base64url alphabet and non-reuse;
- minimum HMAC secret length and digest shape;
- raw-token refusal at the database boundary;
- strict log refusal for secrets, identity and browser telemetry;
- no-store/no-referrer and secure cookie attributes; and
- bounded expiry choices.

This increment contains no token persistence, public route, logging sink,
database migration or production/Preview action.
