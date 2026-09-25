# Paid-entitlement acceptance evidence — 2026-09-24

Candidate branch: `codex/r0-privilege-hardening`

Preview: `wcnfhriosemgchmtwgof` (`m1-r0-verification-20260924`)

Proposal: `1f17c34a-f0ad-4616-abe0-fc52ac00ec86`

Tracking token: `release1-qa-20260924`

## Verified

- Paid owner PDF export completed and the final two-page A4 render was visually inspected.
- Public tracked proposal rendered at 390×844 and 1440×1000 with no horizontal overflow.
- Public PDF download completed from the tracked proposal.
- Preview tracking state after the run: both view flags true, view count 4, both download flags true, download count 1, one click event and one download event.
- Full local suite: 58 suites, 521 tests and 5 snapshots passed.
- Production build passed.
- TypeScript passed when run after the build completed.

## Files

- `mobile-tracked-link.png` — full-page 390-pixel viewport capture.
- `desktop-tracked-link.png` — full-page 1440-pixel viewport capture.
- `tracked-link-download-final.pdf` — PDF downloaded through the public tracked-link flow.

## Remaining gates

- A real test email with both PDF and tracked link.
- Independent review of the final delta.
- Cleaning-operator pricing validation.
- Founder acceptance.
- Production deployment.

Preview deletion remains deferred until all evidence that still depends on the preview is complete.
