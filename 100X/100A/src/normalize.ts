import type { NormalizedCandidate, PlacesCandidate } from "./types";

function clean(value?: string): string | null {
  const result = value?.trim().replace(/\s+/g, " ");
  return result || null;
}

function addressPart(candidate: PlacesCandidate, type: string, short = false): string | null {
  const component = candidate.addressComponents?.find((item) => item.types?.includes(type));
  return clean(short ? component?.shortText : component?.longText);
}

export function normalizeDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.includes("://") ? website : `https://${website}`);
    return url.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length >= 7 ? digits : null;
}

export function normalizePlace(
  candidate: PlacesCandidate,
  sourceGeography: string,
  sourceQuery: string,
): NormalizedCandidate | null {
  const companyName = clean(candidate.displayName?.text);
  const placeId = clean(candidate.id);
  const geography = clean(sourceGeography);
  const query = clean(sourceQuery);
  if (!companyName || !placeId || !geography || !query) return null;
  const website = clean(candidate.websiteUri);
  const phone = clean(candidate.nationalPhoneNumber);

  return {
    companyName,
    website,
    websiteDomain: normalizeDomain(website),
    provider: "google_places",
    providerRecordId: placeId,
    providerUrl: clean(candidate.googleMapsUri),
    phone,
    normalizedPhone: normalizePhone(phone),
    address: clean(candidate.formattedAddress),
    city: addressPart(candidate, "locality") ?? addressPart(candidate, "postal_town"),
    state: addressPart(candidate, "administrative_area_level_1", true),
    sourceGeography: geography,
    sourceQuery: query,
  };
}
