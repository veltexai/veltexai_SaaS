import type { ServiceCategory } from "./payment-terms";

export interface ProposalServiceSource {
  service_type?: string | null;
  service_frequency?: string | null;
  facility_details?: unknown;
  service_specific_data?: unknown;
  property_type?: string | null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const RESIDENTIAL_BUILDINGS = new Set(["house", "residential"]);

export function resolveServiceCategory(
  source: ProposalServiceSource,
): ServiceCategory {
  const serviceType = source.service_type?.trim().toLowerCase();
  if (serviceType === "residential") return "residential";
  if (serviceType === "commercial") return "commercial";

  const serviceSpecific = readRecord(source.service_specific_data);
  const candidates = [
    readRecord(source.facility_details).building_type,
    serviceSpecific.property_type,
    source.property_type,
  ];

  return candidates.some(
    (value) =>
      typeof value === "string" &&
      RESIDENTIAL_BUILDINGS.has(value.trim().toLowerCase()),
  )
    ? "residential"
    : "commercial";
}

export function isOneTimeResidential(source: ProposalServiceSource): boolean {
  return (
    resolveServiceCategory(source) === "residential" &&
    source.service_frequency === "one-time"
  );
}

export function getProposalWording(source: ProposalServiceSource) {
  const category = resolveServiceCategory(source);
  return category === "residential"
    ? {
        category,
        site: "home",
        sites: "homes",
        servicePlan: "residential cleaning service",
        client: "homeowner or resident",
      }
    : {
        category,
        site: "facility",
        sites: "facilities",
        servicePlan: "commercial cleaning program",
        client: "client contact",
      };
}
