# Canonical and source identity policy

1. `(provider, provider_record_id)` definitively identifies a provider observation. Rediscovery touches only `last_observed_at`; it does not overwrite canonical facts.
2. A domain, phone, or exact normalized company name plus city/state is a signal, not proof. Domain and phone are deliberately non-unique.
3. Two signals pointing to exactly one prospect constitute a confident canonical match and attach the new source to that prospect.
4. One signal, conflicting signals, shared corporate details, or a franchise/location ambiguity creates a separate canonical row with `identity_review`. This preserves the location while routing potential duplication for human resolution.
5. No signals create a new `discovered` canonical prospect.

Canonical facts are populated from the first accepted observation. Rediscovery and confident source attachment do not overwrite them. A later, audited resolution service may merge or update canonical facts only under a separately reviewed provenance policy.

Provider metadata is `null` for Google Places 100A. If a future adapter needs raw metadata, it must document allowed fields, redact sensitive data, and use a default retention of 30 days unless legal/security review approves otherwise.
