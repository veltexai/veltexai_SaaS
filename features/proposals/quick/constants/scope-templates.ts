import type { ServiceFrequency } from "@/features/proposals/schemas/proposal";

export const SCOPE_TEMPLATE_IDS = [
  "commercial_office",
  "medical_office",
  "retail",
  "bank",
  "gym_fitness",
  "school_daycare",
  "apartment_common_areas",
  "move_out_turnover",
  "post_construction",
  "floor_care_add_on",
  "window_cleaning_add_on",
  "restroom_breakroom_detail",
] as const;

export type ScopeTemplateId = (typeof SCOPE_TEMPLATE_IDS)[number];

export interface ScopeSection {
  title: string;
  tasks: string[];
}

export interface ScopeTemplate {
  id: ScopeTemplateId;
  label: string;
  propertyType: string;
  recommendedFrequency: ServiceFrequency;
  scopeSections: ScopeSection[];
  commonAddOns: string[];
  assumptions: string[];
  redFlagsOrWarnings: string[];
}

export const SCOPE_TEMPLATES: Record<ScopeTemplateId, ScopeTemplate> = {
  commercial_office: {
    id: "commercial_office",
    label: "Commercial Office Janitorial",
    propertyType: "Commercial Office",
    recommendedFrequency: "5x-week",
    scopeSections: [
      {
        title: "Office and Work Areas",
        tasks: [
          "Empty trash and recycling from desks and shared collection points.",
          "Dust reachable desks, ledges, tables, and office furniture without disturbing papers or personal items.",
          "Vacuum carpeted traffic lanes and spot sweep hard flooring.",
        ],
      },
      {
        title: "Common Areas",
        tasks: [
          "Clean lobby, reception, corridors, conference rooms, and waiting areas.",
          "Disinfect high-touch points including handles, switches, push plates, and shared surfaces.",
          "Spot clean entry glass, partition glass, and visible smudges.",
        ],
      },
      {
        title: "Restrooms and Breakrooms",
        tasks: [
          "Clean and disinfect toilets, sinks, counters, fixtures, mirrors, and floors.",
          "Restock consumables when customer supplies are available onsite.",
          "Sanitize tables, counters, appliance exteriors, and food-contact touchpoints.",
        ],
      },
    ],
    commonAddOns: [
      "Carpet extraction",
      "Interior window cleaning",
      "Floor scrub and recoat",
      "Day porter service",
    ],
    assumptions: [
      "After-hours access is available or can be arranged.",
      "Customer supplies paper products, hand soap, and trash liners unless quoted separately.",
      "Normal office soil load with no regulated materials.",
    ],
    redFlagsOrWarnings: [
      "Heavy tenant turnover, construction dust, or event cleanup should be scoped separately.",
      "Secure suites, server rooms, and confidential work areas may need access rules before service starts.",
    ],
  },
  medical_office: {
    id: "medical_office",
    label: "Medical Office Cleaning",
    propertyType: "Medical Office",
    recommendedFrequency: "5x-week",
    scopeSections: [
      {
        title: "Clinical and Exam Areas",
        tasks: [
          "Disinfect exam-room touchpoints, counters, chairs, door handles, and light switches.",
          "Clean sinks and non-critical surfaces using appropriate disinfectant dwell times.",
          "Remove regular trash from non-regulated receptacles.",
        ],
      },
      {
        title: "Waiting and Admin Areas",
        tasks: [
          "Clean reception counters, waiting room furniture, and check-in areas.",
          "Vacuum or mop patient-facing traffic lanes.",
          "Disinfect shared touchpoints throughout public-facing spaces.",
        ],
      },
      {
        title: "Restrooms",
        tasks: [
          "Clean and disinfect fixtures, partitions, dispensers, mirrors, and floors.",
          "Restock consumables when supplied by the customer.",
          "Report leaks, odors, or visible contamination concerns to the site contact.",
        ],
      },
    ],
    commonAddOns: [
      "Touchpoint disinfection rotation",
      "Interior glass cleaning",
      "Floor care program",
      "Biohazard vendor coordination",
    ],
    assumptions: [
      "Scope excludes regulated medical waste, sharps, bloodborne pathogen cleanup, and sterile processing.",
      "Customer provides site-specific infection-control requirements before start.",
      "Cleaning occurs after patient hours unless day porter coverage is selected.",
    ],
    redFlagsOrWarnings: [
      "Any biohazard, sharps, or bodily fluid cleanup requires approved procedures and may be excluded.",
      "HIPAA-sensitive areas may require staff clearance or escorted access.",
    ],
  },
  retail: {
    id: "retail",
    label: "Retail Store Cleaning",
    propertyType: "Retail",
    recommendedFrequency: "3x-week",
    scopeSections: [
      {
        title: "Sales Floor",
        tasks: [
          "Dust reachable displays, counters, shelving edges, and customer touchpoints.",
          "Sweep, vacuum, or mop sales-floor traffic paths.",
          "Spot clean entry glass, mirrors, and smudged fixtures.",
        ],
      },
      {
        title: "Fitting Rooms and Checkout",
        tasks: [
          "Clean fitting room mirrors, benches, doors, hooks, and floors.",
          "Disinfect checkout counters, card terminals, handles, and high-touch surfaces.",
          "Remove trash and reset visible customer-facing areas.",
        ],
      },
      {
        title: "Back-of-House",
        tasks: [
          "Clean employee break area surfaces and appliance exteriors.",
          "Remove trash from stockroom and staff areas.",
          "Sweep accessible stockroom walkways.",
        ],
      },
    ],
    commonAddOns: [
      "Entry glass detail",
      "Floor machine scrubbing",
      "Seasonal deep cleaning",
      "Restroom detail service",
    ],
    assumptions: [
      "Merchandise remains in place and cleaning is limited to reachable, accessible areas.",
      "Service is scheduled before opening or after closing.",
      "High-value displays or locked cases are cleaned only by agreed procedure.",
    ],
    redFlagsOrWarnings: [
      "Heavy seasonal traffic may require additional visits.",
      "Floor finish damage from salt, spills, or rolling racks may require separate floor care.",
    ],
  },
  bank: {
    id: "bank",
    label: "Bank Branch Cleaning",
    propertyType: "Bank",
    recommendedFrequency: "5x-week",
    scopeSections: [
      {
        title: "Lobby and Teller Areas",
        tasks: [
          "Clean customer counters, teller line surfaces, and lobby furniture.",
          "Vacuum or mop traffic lanes and entry areas.",
          "Spot clean glass doors, partitions, and ATM-adjacent surfaces.",
        ],
      },
      {
        title: "Offices and Conference Rooms",
        tasks: [
          "Empty trash and recycling without disturbing documents or desk contents.",
          "Dust reachable furniture and sanitize high-touch points.",
          "Reset conference tables and chairs after cleaning.",
        ],
      },
      {
        title: "Restrooms and Break Area",
        tasks: [
          "Disinfect restrooms, fixtures, mirrors, partitions, and floors.",
          "Clean breakroom counters, tables, sinks, and appliance exteriors.",
          "Restock consumables when customer supplies are available.",
        ],
      },
    ],
    commonAddOns: [
      "ATM vestibule detail",
      "Interior glass cleaning",
      "Floor buffing",
      "Day porter service",
    ],
    assumptions: [
      "Secure areas, vaults, cash rooms, and records rooms are excluded unless specifically approved.",
      "After-hours access and alarm procedures are provided before start.",
      "Cleaning staff follow branch access and confidentiality requirements.",
    ],
    redFlagsOrWarnings: [
      "Security-controlled areas require written access instructions.",
      "Loose documents, checks, and customer records should be secured before service.",
    ],
  },
  gym_fitness: {
    id: "gym_fitness",
    label: "Gym and Fitness Cleaning",
    propertyType: "Gym/Fitness",
    recommendedFrequency: "daily",
    scopeSections: [
      {
        title: "Workout Areas",
        tasks: [
          "Disinfect equipment touchpoints, benches, handles, mats, and selector pins.",
          "Vacuum rubber flooring or mop hard flooring with suitable cleaner.",
          "Empty trash and wipe bottle-fill stations and shared surfaces.",
        ],
      },
      {
        title: "Locker Rooms and Restrooms",
        tasks: [
          "Disinfect showers, toilets, sinks, counters, benches, partitions, and floors.",
          "Clean mirrors, fixtures, dispensers, and drains where accessible.",
          "Restock consumables when supplied onsite.",
        ],
      },
      {
        title: "Reception and Studios",
        tasks: [
          "Clean front desk, waiting area, studio floors, and high-touch points.",
          "Dust reachable ledges and sanitize shared room controls.",
          "Spot clean entry glass and mirrors.",
        ],
      },
    ],
    commonAddOns: [
      "Midday touchpoint refresh",
      "Shower deep cleaning",
      "Mat washing rotation",
      "Odor control treatment",
    ],
    assumptions: [
      "High-touch disinfection is required due to shared equipment.",
      "Locker rooms and showers may need daily or multiple daily attention.",
      "Customer provides any brand-specific product restrictions.",
    ],
    redFlagsOrWarnings: [
      "Persistent odor, body fluid incidents, or shower buildup may require special treatment.",
      "Wet areas increase slip risk and need clear access timing.",
    ],
  },
  school_daycare: {
    id: "school_daycare",
    label: "School and Daycare Cleaning",
    propertyType: "School/Daycare",
    recommendedFrequency: "5x-week",
    scopeSections: [
      {
        title: "Classrooms and Activity Rooms",
        tasks: [
          "Clean tables, desks, chairs, counters, cubbies, and high-touch classroom surfaces.",
          "Vacuum or mop floors and remove trash from classrooms.",
          "Spot clean doors, handles, switches, and visible wall marks.",
        ],
      },
      {
        title: "Restrooms and Diapering Areas",
        tasks: [
          "Disinfect toilets, sinks, counters, partitions, fixtures, and floors.",
          "Clean diapering surfaces where applicable using approved procedures.",
          "Restock supplies when customer-provided products are available.",
        ],
      },
      {
        title: "Common Areas",
        tasks: [
          "Clean hallways, offices, entry areas, staff rooms, and multipurpose spaces.",
          "Disinfect drinking fountains, railings, push plates, and shared touchpoints.",
          "Remove trash and recycling from designated areas.",
        ],
      },
    ],
    commonAddOns: [
      "Toy sanitation rotation",
      "Floor scrub and finish",
      "Break closure deep clean",
      "Kitchen/cafeteria detail",
    ],
    assumptions: [
      "Service is performed after students leave unless day porter support is selected.",
      "Customer provides child-safe product restrictions and room access schedule.",
      "Food-service areas may need separate requirements.",
    ],
    redFlagsOrWarnings: [
      "Licensing, background check, or product restrictions should be confirmed before start.",
      "Illness outbreaks may require temporary enhanced disinfection scope.",
    ],
  },
  apartment_common_areas: {
    id: "apartment_common_areas",
    label: "Apartment Common Area Cleaning",
    propertyType: "Apartment/Common Areas",
    recommendedFrequency: "3x-week",
    scopeSections: [
      {
        title: "Lobbies and Corridors",
        tasks: [
          "Clean lobby furniture, entry glass, mail areas, and high-touch surfaces.",
          "Vacuum carpets or mop hard-surface corridors and entries.",
          "Remove litter and report maintenance concerns.",
        ],
      },
      {
        title: "Elevators and Stairwells",
        tasks: [
          "Clean elevator doors, buttons, tracks, walls, and flooring.",
          "Sweep stairwells, landings, and accessible corners.",
          "Disinfect railings, handles, and push plates.",
        ],
      },
      {
        title: "Amenity and Trash Areas",
        tasks: [
          "Clean amenity rooms, shared restrooms, and leasing-office common areas as assigned.",
          "Wipe exterior surfaces near trash rooms or collection points.",
          "Spot mop spills and deodorize as needed within standard service limits.",
        ],
      },
    ],
    commonAddOns: [
      "Trash room deep cleaning",
      "Pet station service",
      "Clubhouse detail",
      "Garage elevator lobby cleaning",
    ],
    assumptions: [
      "Tenant units are excluded.",
      "Service includes common areas listed in the final scope only.",
      "Property management provides access to amenity rooms and utility areas.",
    ],
    redFlagsOrWarnings: [
      "Pet waste, bulk trash, pest issues, or biohazards may require separate handling.",
      "High-rise or multi-building properties may need building-by-building pricing.",
    ],
  },
  move_out_turnover: {
    id: "move_out_turnover",
    label: "Move-Out and Turnover Cleaning",
    propertyType: "Move-Out/Turnover",
    recommendedFrequency: "one-time",
    scopeSections: [
      {
        title: "Kitchen",
        tasks: [
          "Clean counters, sinks, cabinet exteriors, appliance exteriors, and accessible backsplash.",
          "Wipe inside empty cabinets and drawers when cleared.",
          "Clean oven, refrigerator, or appliance interiors only when included in final scope.",
        ],
      },
      {
        title: "Bathrooms",
        tasks: [
          "Scrub and disinfect toilets, tubs, showers, sinks, counters, mirrors, fixtures, and floors.",
          "Remove ordinary soap scum and buildup within standard cleaning limits.",
          "Wipe vanities, cabinet exteriors, and reachable shelving.",
        ],
      },
      {
        title: "Living Areas and Bedrooms",
        tasks: [
          "Dust reachable surfaces, baseboards, ledges, doors, and closet shelves.",
          "Vacuum carpets and mop hard-surface floors.",
          "Spot clean switch plates, handles, and visible marks where practical.",
        ],
      },
    ],
    commonAddOns: [
      "Inside oven cleaning",
      "Inside refrigerator cleaning",
      "Carpet extraction",
      "Interior window cleaning",
    ],
    assumptions: [
      "Unit is vacant and personal belongings are removed.",
      "Utilities and running water are available.",
      "Excessive trash removal, pest issues, or damage cleanup are excluded unless quoted.",
    ],
    redFlagsOrWarnings: [
      "Heavy grease, nicotine, pet urine, mold, or hoarding conditions require separate review.",
      "Construction dust after repairs may shift the scope to post-construction cleaning.",
    ],
  },
  post_construction: {
    id: "post_construction",
    label: "Post-Construction Cleaning",
    propertyType: "Post-Construction",
    recommendedFrequency: "one-time",
    scopeSections: [
      {
        title: "Rough and Final Dust Removal",
        tasks: [
          "Remove construction dust from reachable horizontal and vertical surfaces.",
          "Vacuum tracks, ledges, vents, trim, and accessible corners using appropriate equipment.",
          "Damp wipe surfaces after dry dust removal to reduce residue.",
        ],
      },
      {
        title: "Fixtures, Glass, and Detail Work",
        tasks: [
          "Clean fixtures, counters, cabinets, doors, frames, and hardware.",
          "Remove labels, light adhesive, and ordinary construction smudges where safe.",
          "Clean interior glass and mirrors included in the agreed area.",
        ],
      },
      {
        title: "Floors and Final Presentation",
        tasks: [
          "Vacuum, sweep, and mop floors based on surface type.",
          "Detail edges, thresholds, and visible corners.",
          "Prepare areas for walkthrough or occupancy.",
        ],
      },
    ],
    commonAddOns: [
      "Exterior window cleaning",
      "Machine floor scrub",
      "High dusting",
      "Debris haul-off coordination",
    ],
    assumptions: [
      "Construction is substantially complete before cleaning begins.",
      "Large debris, paint removal, and trade waste are excluded unless quoted.",
      "Adequate lighting, water, power, and safe access are available.",
    ],
    redFlagsOrWarnings: [
      "Active trades, punch-list work, or heavy drywall dust can require repeat visits.",
      "Hazardous materials, paint overspray, and adhesive removal may require specialty pricing.",
    ],
  },
  floor_care_add_on: {
    id: "floor_care_add_on",
    label: "Floor Care Add-On",
    propertyType: "Floor Care Add-On",
    recommendedFrequency: "1x-month",
    scopeSections: [
      {
        title: "Hard Floor Maintenance",
        tasks: [
          "Dust mop and machine scrub approved hard-floor areas.",
          "Treat visible spots, scuffs, and buildup within maintenance limits.",
          "Damp mop edges and corners after machine work where accessible.",
        ],
      },
      {
        title: "Finish Care",
        tasks: [
          "Buff, burnish, scrub and recoat, or strip and wax based on selected service.",
          "Protect adjacent surfaces and post wet-floor signage during service.",
          "Inspect finish appearance after completion.",
        ],
      },
    ],
    commonAddOns: [
      "Strip and wax",
      "Scrub and recoat",
      "Carpet extraction",
      "Tile and grout cleaning",
    ],
    assumptions: [
      "Floor type and finish condition are confirmed before final pricing.",
      "Furniture moving is limited to light movable items unless quoted.",
      "Customer provides after-hours access for drying time when required.",
    ],
    redFlagsOrWarnings: [
      "Damaged flooring, failing finish, or unknown coatings may need a test area.",
      "Heavy furniture, 24/7 occupancy, or moisture issues can affect schedule and price.",
    ],
  },
  window_cleaning_add_on: {
    id: "window_cleaning_add_on",
    label: "Window Cleaning Add-On",
    propertyType: "Window Cleaning Add-On",
    recommendedFrequency: "1x-month",
    scopeSections: [
      {
        title: "Interior Glass",
        tasks: [
          "Clean interior window panes, entry glass, sidelights, and reachable partitions.",
          "Wipe frames, sills, and ledges included in the scope.",
          "Remove fingerprints, smudges, and ordinary soil.",
        ],
      },
      {
        title: "Exterior Glass",
        tasks: [
          "Clean ground-level exterior panes where safely accessible.",
          "Detail entry doors, storefront glass, and lower-level customer-facing glass.",
          "Report hard-water staining, seal failure, or access constraints.",
        ],
      },
    ],
    commonAddOns: [
      "Screen cleaning",
      "Track detailing",
      "High glass access",
      "Hard-water stain treatment",
    ],
    assumptions: [
      "Pricing depends on pane count, access, height, soil level, and screen condition.",
      "High glass, lift work, or ladder work requires separate safety review.",
      "Weather may affect exterior scheduling.",
    ],
    redFlagsOrWarnings: [
      "Hard-water stains, paint, silicone, or construction debris are not standard window cleaning.",
      "Damaged seals, tint, or specialty glass may restrict cleaning methods.",
    ],
  },
  restroom_breakroom_detail: {
    id: "restroom_breakroom_detail",
    label: "Restroom and Breakroom Detail",
    propertyType: "Restroom/Breakroom Detail",
    recommendedFrequency: "weekly",
    scopeSections: [
      {
        title: "Restroom Detail",
        tasks: [
          "Detail clean fixtures, partitions, dispensers, mirrors, doors, and tile edges.",
          "Scrub buildup around toilets, urinals, sinks, grout lines, and floor edges.",
          "Disinfect high-touch points and odor-prone surfaces.",
        ],
      },
      {
        title: "Breakroom Detail",
        tasks: [
          "Clean and sanitize counters, tables, chairs, sinks, cabinet exteriors, and appliance exteriors.",
          "Detail microwave exterior/interior when included and accessible.",
          "Spot clean walls, handles, switches, and trash-area surfaces.",
        ],
      },
    ],
    commonAddOns: [
      "Consumable restocking",
      "Deep grout cleaning",
      "Appliance interior cleaning",
      "Odor control",
    ],
    assumptions: [
      "Consumables are customer-supplied unless quoted separately.",
      "Appliance interiors must be empty before cleaning.",
      "Detail service supplements, not replaces, routine janitorial service.",
    ],
    redFlagsOrWarnings: [
      "Persistent odors, drain issues, mold, or pest activity should be addressed before routine service.",
      "Heavy scale, rust, or damaged grout may require specialty treatment.",
    ],
  },
};

export function isScopeTemplateId(value: string): value is ScopeTemplateId {
  return SCOPE_TEMPLATE_IDS.includes(value as ScopeTemplateId);
}

export function getScopeTemplate(
  templateId: string | null | undefined,
): ScopeTemplate | null {
  if (!templateId || !isScopeTemplateId(templateId)) return null;
  return SCOPE_TEMPLATES[templateId];
}

export const DEFAULT_SCOPE_TEMPLATE_ID: ScopeTemplateId = "commercial_office";
