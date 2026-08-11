import { QUALIFICATION_VERSION, type CandidateQualifier, type CompanyType, type NormalizedCandidate, type PlacesCandidate, type Qualification } from "./types";

const positive: Array<[CompanyType, RegExp]> = [
  ["commercial_janitorial", /\bjanitorial\b/i],
  ["office_cleaning", /\boffice clean(?:ing|ers?)\b/i],
  ["building_cleaning", /\bbuilding clean(?:ing|ers?)\b/i],
  ["commercial_cleaning", /\bcommercial clean(?:ing|ers?)\b/i],
  ["maid_service", /\bmaid(?:s| service)?\b/i],
  ["residential_cleaning", /\b(?:residential|house|home) clean(?:ing|ers?)\b/i],
];

const cleaningPlaceTypes = new Set(["cleaning_service", "house_cleaning_service"]);
const excluded = /\b(car wash|pressure wash|window tint|laundr(?:y|omat)|dry clean|carpet store|supply|equipment|restoration|pest control)\b/i;

export class RulesCleaningQualifier implements CandidateQualifier {
  async qualify(candidate: NormalizedCandidate, raw: PlacesCandidate): Promise<Qualification> {
    const haystack = `${candidate.companyName} ${raw.primaryType ?? ""} ${(raw.types ?? []).join(" ")}`;
    if (excluded.test(haystack)) {
      return { accepted: false, companyType: null, score: 0.05, reason: "deterministic exclusion: non-cleaning-service category", method: "rules", version: QUALIFICATION_VERSION };
    }
    const match = positive.find(([, pattern]) => pattern.test(haystack));
    if (match) {
      return { accepted: true, companyType: match[0], score: 0.95, reason: `matched ${match[0]}`, method: "rules", version: QUALIFICATION_VERSION };
    }
    const placeTypes = [raw.primaryType, ...(raw.types ?? [])].filter(Boolean) as string[];
    if (placeTypes.some((type) => cleaningPlaceTypes.has(type))) {
      return { accepted: true, companyType: "commercial_cleaning", score: 0.75, reason: "Google cleaning-service type", method: "rules", version: QUALIFICATION_VERSION };
    }
    return { accepted: false, companyType: null, score: 0.2, reason: "primary cleaning purpose not established", method: "rules", version: QUALIFICATION_VERSION };
  }
}

// Future AI implementations must return this narrow decision and must not write data.
export type AIQualificationAdapter = CandidateQualifier;
