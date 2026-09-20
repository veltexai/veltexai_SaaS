export type ServiceRiskTier = "standard" | "specialized" | "regulated";

export interface CleaningServiceModule {
  id: string;
  label: string;
  riskTier: ServiceRiskTier;
  unitTypes: readonly string[];
  requiredInputs: readonly string[];
}

export interface CleaningBusinessSegment {
  id: string;
  label: string;
  rolloutWave: 1 | 2 | 3 | 4 | 5;
  modules: readonly CleaningServiceModule[];
}

/**
 * Product taxonomy for expanding Veltex without creating one-off proposal
 * builders. A segment describes the operator; modules describe work that can
 * be combined inside a proposal. Regulated modules require a separate review
 * before they can be enabled in the UI or pricing engine.
 */
export const cleaningBusinessSegments = [
  {
    id: "commercial-janitorial",
    label: "Commercial Janitorial",
    rolloutWave: 1,
    modules: [
      {
        id: "recurring-janitorial",
        label: "Recurring Janitorial",
        riskTier: "standard",
        unitTypes: ["cleanable_square_feet", "visits_per_week"],
        requiredInputs: ["service_areas", "frequency", "access_window"],
      },
      {
        id: "day-porter",
        label: "Day Porter",
        riskTier: "standard",
        unitTypes: ["labor_hours", "days_per_week"],
        requiredInputs: ["shift_length", "coverage_schedule", "task_list"],
      },
    ],
  },
  {
    id: "residential-turnover",
    label: "Residential, Maid, and Vacation Rental",
    rolloutWave: 2,
    modules: [
      {
        id: "residential-maintenance",
        label: "Recurring Residential Cleaning",
        riskTier: "standard",
        unitTypes: ["bedrooms", "bathrooms", "cleanable_square_feet"],
        requiredInputs: ["home_type", "occupancy", "frequency"],
      },
      {
        id: "vacation-rental-turnover",
        label: "Vacation Rental Turnover",
        riskTier: "standard",
        unitTypes: ["bedrooms", "bathrooms", "turnovers"],
        requiredInputs: ["checkout_window", "laundry", "restocking"],
      },
    ],
  },
  {
    id: "interior-specialty",
    label: "Floor, Carpet, Upholstery, and Window Care",
    rolloutWave: 3,
    modules: [
      {
        id: "hard-floor-care",
        label: "Hard Floor Care and Refinishing",
        riskTier: "specialized",
        unitTypes: ["surface_square_feet"],
        requiredInputs: ["floor_material", "condition", "treatment"],
      },
      {
        id: "carpet-upholstery",
        label: "Carpet and Upholstery Cleaning",
        riskTier: "specialized",
        unitTypes: ["surface_square_feet", "items"],
        requiredInputs: ["material", "condition", "stain_profile"],
      },
      {
        id: "window-cleaning",
        label: "Window Cleaning",
        riskTier: "specialized",
        unitTypes: ["panes", "stories"],
        requiredInputs: ["access_method", "interior_exterior", "screens"],
      },
    ],
  },
  {
    id: "exterior-cleaning",
    label: "Exterior, Pressure, Roof, and Gutter Cleaning",
    rolloutWave: 4,
    modules: [
      {
        id: "pressure-soft-washing",
        label: "Pressure and Soft Washing",
        riskTier: "specialized",
        unitTypes: ["surface_square_feet", "linear_feet"],
        requiredInputs: ["surface_material", "soil", "water_access"],
      },
      {
        id: "roof-gutter-cleaning",
        label: "Roof and Gutter Cleaning",
        riskTier: "specialized",
        unitTypes: ["roof_square_feet", "linear_feet", "stories"],
        requiredInputs: ["roof_material", "pitch", "access_method"],
      },
    ],
  },
  {
    id: "regulated-specialty",
    label: "Medical, Biohazard, and Regulated Specialty Cleaning",
    rolloutWave: 5,
    modules: [
      {
        id: "medical-facility",
        label: "Medical Facility Cleaning",
        riskTier: "regulated",
        unitTypes: ["rooms", "cleanable_square_feet", "visits_per_week"],
        requiredInputs: ["facility_procedures", "approved_products", "responsibility_matrix"],
      },
      {
        id: "biohazard-trauma",
        label: "Biohazard and Trauma Cleanup",
        riskTier: "regulated",
        unitTypes: ["affected_area", "labor_hours"],
        requiredInputs: ["certifications", "waste_plan", "site_risk_review"],
      },
    ],
  },
] as const satisfies readonly CleaningBusinessSegment[];

export const cleaningServiceModules = cleaningBusinessSegments.reduce<
  CleaningServiceModule[]
>((modules, segment) => {
  modules.push(...segment.modules);
  return modules;
}, []);
