# 100E architecture

```text
Instantly reply webhook
  -> 100D authentication + allowlist + event receipt
  -> transient plain-text normalization (memory only)
  -> deterministic reply classification
  -> atomic migration-005 RPC
       -> classification result (no body)
       -> action queue
       -> optional durable do-not-contact suppression
```

100D remains the security and event-ingestion boundary. 100E runs only after 100D accepts an approved
workspace/campaign event. If 100D succeeds but 100E fails, the endpoint returns a retryable failure;
Instantly retries and both workflows safely deduplicate on the same provider event ID.

The initial classifier is deterministic and versioned. This makes decisions reproducible and prevents an
external model from receiving reply content. A future model-assisted classifier can be added behind a
separate consent, retention, redaction, evaluation, and confidence policy without changing the database
contract or enabling automatic replies.
