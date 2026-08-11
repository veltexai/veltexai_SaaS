# 100A → national scale roadmap

Intended progression (each step gated by its own approval and controls):
```
5-record Seattle pilot
 -> Controlled Seattle-area expansion
 -> Minimal verified contact/email enrichment
 -> Disabled and dry-run-only 100C
 -> Small Instantly campaign
 -> Additional metropolitan areas
 -> Apollo enrichment
 -> Data Axle and other sources
 -> National discovery
```

## Separation of concerns (three independent volume limits)
- **100A discovers companies** (business identity + provider observation). Discovery volume is one limit.
- **Contact enrichment** finds decision-makers and verified emails. Enriched-contact volume is a separate limit.
- **Instantly sends outreach.** Email/send volume is a third, distinct limit.

Discovery volume, enriched-contact volume, and email volume must be governed independently — a large
discovery run does not authorize a large send.

## Scaling guidance
- The architecture may eventually support thousands of company discoveries and enriched contacts per day.
- **The current pilot must remain capped at five writes.** Do not raise caps to scale.
- **Email sending must scale more conservatively than discovery** (deliverability, reputation, suppression,
  and consent constraints are stricter than read-only discovery).
- Discovery being cheap and safe does not make outreach cheap or safe; each downstream phase re-earns its
  own approval, dry-run, and limits before any volume increase.

No future phase is built by this task.
