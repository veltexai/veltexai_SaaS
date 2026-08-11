import type { ContactSourceRow } from "./types";

// Deterministic authoritative-source selection for provider attribution. 100C must NOT fabricate a
// provider (e.g. hardcode 'apollo'): it reads the real `prospect_contact_sources` rows and picks the
// current/authoritative one. Fail closed (null) when there is no source — the runner then holds the
// contact rather than inventing attribution.
const PROVIDER_PRIORITY = ["apollo", "data_axle", "referral", "csv_import", "fixture"];

export function selectAuthoritativeSource(sources: ContactSourceRow[]): ContactSourceRow | null {
  const valid = (sources ?? []).filter((s) => s && typeof s.provider === "string" && s.provider.trim() && typeof s.providerRecordId === "string" && s.providerRecordId.trim());
  if (valid.length === 0) return null;
  // Most recently observed wins; deterministic tie-breaks by provider priority then record id.
  return [...valid].sort((a, b) => {
    const ta = Date.parse(a.lastObservedAt), tb = Date.parse(b.lastObservedAt);
    const at = Number.isFinite(ta) ? ta : -Infinity, bt = Number.isFinite(tb) ? tb : -Infinity;
    if (bt !== at) return bt - at;
    const pa = PROVIDER_PRIORITY.indexOf(a.provider), pb = PROVIDER_PRIORITY.indexOf(b.provider);
    const ap = pa === -1 ? PROVIDER_PRIORITY.length : pa, bp = pb === -1 ? PROVIDER_PRIORITY.length : pb;
    if (ap !== bp) return ap - bp;
    return a.providerRecordId.localeCompare(b.providerRecordId);
  })[0];
}
