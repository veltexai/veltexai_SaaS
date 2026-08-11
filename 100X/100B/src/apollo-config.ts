// Centralized Apollo pilot configuration — the single source of truth for the two-stage
// People Search -> People Enrichment boundary. NOTHING here makes a live call; these are
// endpoints, caps, and disabled-feature flags consumed by the adapter and its tests.
//
// Apollo's People Search (mixed_people/api_search) returns NO email or phone. It only yields
// person identifiers + demographics. A separate, credit-consuming People Enrichment
// (people/match) call resolves a work email for a small, ranked subset. See docs/APOLLO.md.

export const APOLLO_ENDPOINTS = Object.freeze({
  // Stage 1: People API Search. Domain-constrained; returns person ids, never emails/phones.
  peopleSearch: "https://api.apollo.io/api/v1/mixed_people/api_search",
  // Stage 2: People Enrichment (People Match). May consume 1 credit when a work email is returned.
  peopleEnrichment: "https://api.apollo.io/api/v1/people/match",
} as const);

// Controlled-pilot maximums. The global run-level provider-request budget
// (EnrichmentLimits.maxProviderRequestsPerRun) is still the hard ceiling; these are the
// additional per-company bounds enforced inside the Apollo adapter.
export const APOLLO_PILOT_LIMITS = Object.freeze({
  maxCompaniesPerProviderPreview: 2,   // provider-preview processes at most two companies
  maxSearchOperationsPerCompany: 1,    // one logical search per company
  maxCandidatesEnrichedPerCompany: 3,  // rank, then enrich at most three people
  maxEnrichmentOperationsPerCompany: 3,// at most three enrichment operations per company
  maxAttemptsPerRequest: 3,            // physical attempts (incl. retries) per logical request
  searchPerPage: 10,                   // small search page; ranking happens locally
  timeoutMs: 8_000,
  maxBackoffMs: 1_000,
} as const);

// Feature flags that MUST stay disabled for the pilot. They are passed EXPLICITLY on every
// enrichment request so cost/PII behaviour can never be silently enabled by an Apollo default.
export const APOLLO_PILOT_ENRICHMENT_FLAGS = Object.freeze({
  reveal_personal_emails: false, // work email only; never reveal personal emails
  reveal_phone_number: false,    // no phone enrichment (would add ~8 credits + a webhook)
  run_waterfall_email: false,    // no waterfall email enrichment
  run_waterfall_phone: false,    // no waterfall phone enrichment
} as const);

// Decision-maker title filters (strongest first), sent to People Search and used to rank
// candidates locally BEFORE any credit-consuming enrichment call.
export const APOLLO_DECISION_MAKER_TITLES: readonly string[] = [
  "Owner", "Founder", "Co-Founder", "President", "CEO", "Chief Executive Officer",
  "General Manager", "Director of Operations", "Head of Operations", "Operations Manager",
  "VP of Sales", "Business Development", "Estimator", "Office Manager",
];

// Apollo seniority buckets that map onto the decision-maker priority.
export const APOLLO_DECISION_MAKER_SENIORITIES: readonly string[] = [
  "owner", "founder", "c_suite", "partner", "vp", "head", "director", "manager",
];

// Least-privilege Apollo API-key capabilities the two-stage pilot requires. Documented for a
// future read-only capability preflight; no real key is used in this subsystem.
export const REQUIRED_APOLLO_CAPABILITIES = Object.freeze({
  peopleSearch: "mixed_people_api_search", // or an appropriately authorized master key
  peopleEnrichment: "people_match",         // or an appropriately authorized master key
} as const);
