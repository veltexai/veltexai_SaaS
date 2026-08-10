# Instantly V2 event mapping (100D)

Instantly **API V2 only**. Verified 2026-08 against developer.instantly.ai/guides/webhook-events and the
Webhook schema. The payload has **no per-event id** and no signing secret; lead identity is `lead_email`,
workspace is `workspace` (UUID), campaign is `campaign_id`.

## Supported event → category / suppression
| Instantly `event_type` | engagement category | suppresses? | durable kind |
| --- | --- | --- | --- |
| `email_sent`, `email_opened`, `email_link_clicked`, `campaign_completed` | delivery | no | — |
| `reply_received`, `auto_reply_received`, `lead_neutral`, `lead_interested`, `lead_not_interested`, `lead_out_of_office`, `lead_wrong_person` | reply | no | — |
| `lead_meeting_booked`, `lead_meeting_completed`, `lead_closed`, `lead_no_show` | meeting | no | — |
| `email_bounced` | suppression | **yes** | `hard_bounce` |
| `lead_unsubscribed` | suppression | **yes** | `unsubscribed` |
| `spam_complaint` *(if supported)* | suppression | **yes** | `spam_complaint` |
| `do_not_contact` *(if supported)* | suppression | **yes** | `do_not_contact` |
| `account_error` | operational | no | — |
| any other / custom label | unknown | no | — (held for review) |

Only the four suppression rows create a durable registry entry. Opens, clicks, and replies **never**
suppress, and no event ever removes an existing suppression. Unknown/custom events are recorded safely as
`unknown` and never trigger suppression or downstream automation.

## Fields consumed (PII-safe)
`event_type`, `workspace`, `campaign_id`, `campaign_name`, `lead_email` (normalized for matching only),
`timestamp` (→ occurred-at), `email_id`, `step`, `variant`, `is_first`, `email_account` (presence only).
**Never consumed/persisted:** `reply_text_snippet`, `reply_subject`, `reply_text`, `reply_html`,
`email_text`, `email_html`, `unibox_url`.

## Deterministic fingerprint (`provider_event_id`)
Because there is no stable event id, 100D derives one: `100D-fpv1:` + SHA-256 of a canonical, fixed-order
array of `[version, provider, workspace, campaign_id, event_type, sha256(normalized email), normalized
timestamp (UTC ms ISO), email_id, step, variant]`. Absent optional fields are encoded as literal `null`
(presence is itself deterministic). No raw email enters the fingerprint (only its hash). Identical replays
produce the same id (idempotent no-op); any legitimately different event differs in at least one field and
gets a distinct id. Bump `100D-fpv1` / `100D-normalize-v1` if the algorithm or mapping ever changes.

## Suppression matching
Suppression is **email-keyed** (`match_type = 'email'`, normalized lowercase), never domain-keyed for an
individual event — one person unsubscribing never blocks the whole company domain. Domain suppression
exists in the registry but is reserved for explicit, appropriate cases (e.g. a legal/compliance block),
not derived from a single lead event.
