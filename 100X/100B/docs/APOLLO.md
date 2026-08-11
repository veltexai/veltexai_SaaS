# Apollo provider — two-stage search & enrichment

Apollo is the first live 100B enrichment adapter. It is a **two-stage** boundary because Apollo's
People Search does **not** return contact emails — a separate, credit-consuming enrichment call is
required. The adapter internally coordinates both stages and returns the ordinary provider-neutral
candidate contract; the 100B runner stays Apollo-agnostic. **No live Apollo call is made anywhere in
100B until a real key + `fetch` are injected and an operator run is explicitly authorized.**

```
100A company (domain)
   → Apollo People Search          POST /api/v1/mixed_people/api_search   (ids only, no email/phone)
   → rank decision-maker candidates locally
   → select a small capped subset
   → Apollo People Enrichment       POST /api/v1/people/match             (work email only; ~1 credit)
   → provider-neutral candidate → runner normalizes + evaluates eligibility
```

## Stage 1 — People Search (`mixed_people/api_search`)
- **Method/URL:** `POST https://api.apollo.io/api/v1/mixed_people/api_search`.
- **Constrained by company domain.** Request body sends `q_organization_domains_list: [domain]`,
  `person_titles` (decision-maker titles), `person_seniorities`, `include_similar_titles: false`,
  `page: 1`, `per_page`. The adapter **fails closed** when the company has no usable domain — it never
  searches the whole Apollo database.
- **Returns no email or phone.** Only person identifiers + demographics. The adapter parses each
  person's `id` defensively and drops any entry without one. A `people[]`-less response is `malformed`.
- The search response is **never** treated as an email source, even if an `email` field appears.

## Decision-maker ranking (before any credit is spent)
Search results are ranked locally, strongest first, using the shared role classifier:
owner → founder/co-founder → president → chief executive → general manager → operations →
sales/BD → estimator → office manager (generic mailboxes and unknown titles rank last). Only the top
`maxCandidatesEnrichedPerCompany` (3) are enriched, so credits are spent on the best contacts.

## Stage 2 — People Enrichment (`people/match`)
- **Method/URL:** `POST https://api.apollo.io/api/v1/people/match`.
- **Feeds the search `id`.** Request body is `{ id, reveal_personal_emails: false,
  reveal_phone_number: false, run_waterfall_email: false, run_waterfall_phone: false }`.
- **Work email only.** Personal-email reveal is disabled; phone reveal is disabled (it would add ~8
  credits and **require a webhook**); waterfall enrichment is disabled. **No `webhook_url`** is sent.
- The returned work email + `email_status` become the candidate's `email` +
  `providerVerificationStatus`. Phone is always dropped. Only `email_status: "verified"` can later
  become outreach-ready (decided by the runner); everything else fails closed.

## Preview inputs: synthetic fixtures vs approved real targets
The two preview modes read **different, non-interchangeable** input files:

- `fixture-preview` → `operator/enrichment-fixtures.json` — synthetic contacts on reserved
  `example.com` domains, offline only. Never used for a live Apollo read.
- `provider-preview` → `operator/provider-preview-targets.json` — **approved real 100A pilot
  companies** (public name, website, normalized domain, type, eligibility). Nonsecret only: no
  contacts, emails, phones, Apollo ids/responses, API keys, JWTs, or Supabase keys. Not authorization
  for outreach.

`provider-preview` binds **only** to the approved target file, selects **only** requested prospect
IDs contained in it (**unknown IDs fail closed before any Apollo client is constructed**), processes
**at most two** companies, constructs **no Supabase client** and performs **no write**, and stays
in memory. The target loader rejects a file whose domains are reserved `example.com`, so the fixture
and target files cannot be swapped by mistake. Separate founder authorization (and an Apollo key) is
still required before any live provider-preview.

### Output privacy
A live provider-preview may retrieve real business-contact data, so operator output is **redacted**.
The console/summary reports only: prospect identifier, candidates found, role/title category, whether
a **work email was returned (boolean)**, verification status, eligibility disposition, request usage,
estimated credit-consuming matches, and structured failures. It never prints emails, phone numbers,
names, API keys, authorization headers, or raw Apollo responses. Any need for detailed contact data
for later review requires a separate, explicitly authorized secure mechanism (not built here).

## Request, retry, and credit accounting
Centralized in `src/apollo-config.ts` (`APOLLO_PILOT_LIMITS`) — not scattered:

| Limit | Value |
|---|---|
| Companies per provider preview | 2 |
| Search operations per company | 1 |
| Candidates enriched per company | ≤ 3 |
| Enrichment operations per company | ≤ 3 |
| Physical attempts per request (incl. retries) | 3 |
| No phone / no personal email / no waterfall / no bulk (first pilot) | enforced |

Every **physical** request — search, enrichment, and every retry — counts against the shared
run-level provider-request budget (`maxProviderRequestsPerRun`, the hard ceiling) and is recorded in
the provider-neutral `ProviderRequestAccounting`: `searchRequests`, `enrichmentRequests`,
`retryAttempts`, `successfulEnrichments`, `providerErrors`, and `estimatedCreditConsumingMatches`
(each returned work email is expected to consume ≈1 credit; phone/waterfall are off, so no 8-credit
phone charges). The run-level budget can curtail enrichment on a later company before the per-company
cap is reached — this is intended.

## Credit-consumption risk
People Search consumes no credits. People Enrichment consumes **1–9 credits per person** in general
(1 for a demographic/email match, +8 if a mobile phone is returned); with phone and waterfall
disabled this pilot expects **≈1 credit per returned work email and 0 when no email is found**. Bulk
enrichment is not used in the first pilot.

## Required Apollo API-key capabilities (least privilege)
The key must be authorized for exactly two endpoints (or be an appropriately authorized master key):
- People Search — `mixed_people_api_search`
- People Enrichment — `people_match`

`ApolloEnrichmentProvider.requiredCapabilities()` returns these names. A future **read-only capability
preflight / health check** (e.g. a minimal authorized probe) should verify both scopes and the key's
credit balance before a live preview — it is intentionally **not** implemented here and uses no real
key. Never request broader permissions than these two.

## Secret & PII redaction
The API key travels only in the `X-Api-Key` request header. It is never written to a log, an error
message, or a plan. Errors carry only an HTTP status and a generic reason — never a response body,
contact record, or personal email. The adapter itself performs no logging.

## Error handling (no failure yields an outreach-ready contact)
Classified `ApolloError.kind`: `auth` (401), `credit` (402), `permission` (403), `rate_limit` (429,
retried), `transient` (5xx, retried), `timeout`, `malformed`, `request_cap`, `permanent`. `auth`,
`credit`, `permission`, `malformed`, and `permanent` are never retried; during enrichment `auth`,
`credit`, and `permission` are systemic and stop the company immediately. Search with no matches, a
result missing an id, an enrichment no-match, or an enrichment with no email all fail closed (no
contact, or a `needs_enrichment` contact) rather than fabricating anything. If search succeeds but
every enrichment attempt fails, the company yields zero candidates with the errors counted.

## References (verified 2026-08)
- People Search — https://docs.apollo.io/reference/people-api-search
- People Enrichment — https://docs.apollo.io/reference/people-enrichment
- Bulk People Enrichment — https://docs.apollo.io/reference/bulk-people-enrichment
- API pricing / credits — https://docs.apollo.io/docs/api-pricing
