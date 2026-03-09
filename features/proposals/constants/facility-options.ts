import type { ServiceType } from "@/lib/validations/proposal";

export const DEFAULT_AREA_FREQUENCY = "1x_weekly";
// Building type options by service type
export const BUILDING_TYPE_OPTIONS: Record<
  ServiceType,
  { value: string; label: string }[]
> = {
  residential: [
    { value: "apartment", label: "Apartment" },
    { value: "house", label: "House" },
    { value: "condo", label: "Condo" },
    { value: "townhouse", label: "Townhouse" },
    { value: "other", label: "Other" },
  ],
  commercial: [
    { value: "office", label: "Office Building" },
    { value: "warehouse", label: "Warehouse" },
    { value: "retail", label: "Retail Store" },
    { value: "restaurant", label: "Restaurant" },
    { value: "medical", label: "Medical Facility" },
    { value: "educational", label: "Educational/School" },
    { value: "daycare", label: "Daycare Center" },
    { value: "church", label: "Church/Religious" },
    { value: "hospitality", label: "Hospitality" },
    { value: "industrial", label: "Industrial" },
    { value: "other", label: "Other" },
  ],
  carpet: [
    { value: "residential", label: "Residential Property" },
    { value: "office", label: "Office Building" },
    { value: "retail", label: "Retail Store" },
    { value: "hospitality", label: "Hotel/Hospitality" },
    { value: "other", label: "Other" },
  ],
  window: [
    { value: "residential", label: "Residential Property" },
    { value: "office", label: "Office Building" },
    { value: "retail", label: "Retail Storefront" },
    { value: "other", label: "Other" },
  ],
  floor: [
    { value: "residential", label: "Residential Property" },
    { value: "office", label: "Office Building" },
    { value: "retail", label: "Retail Store" },
    { value: "warehouse", label: "Warehouse" },
    { value: "industrial", label: "Industrial" },
    { value: "other", label: "Other" },
  ],
};

export const SPECIAL_AREAS_OPTIONS: Record<ServiceType, string[]> = {
  residential: [
    "Pet Areas",
    "Child Play Areas",
    "Allergy-Sensitive Areas",
    "Antique/Delicate Items",
    "Home Gym/Exercise Area",
    "Wine Cellar/Bar",
    "Mudroom/Entry",
    "Sunroom/Conservatory",
  ],
  commercial: [
    "Clean Room Standards",
    "Data Center/IT Equipment",
    "Food Safety Zones",
    "Medical/Sterile Areas",
    "Hazmat/Chemical Areas",
    "Restricted Access Zones",
    "Art/Antique Collections",
    "Sensitive Electronics",
  ],
  carpet: [
    "Heavy Stain Areas",
    "Pet Damage Areas",
    "High Traffic Zones",
    "Under Furniture",
    "Stair Risers",
    "Area Rug Edges",
  ],
  window: [
    "Hard-to-Reach Access",
    "High Elevation Areas",
    "Oversized Panes",
    "Leaded/Decorative Glass",
    "Multi-Pane Storm Windows",
    "Security/Tinted Film",
  ],
  floor: [
    "Heavy Wear Areas",
    "Wax Build-up Zones",
    "Grout Lines",
    "Transition Strips",
    "Under Equipment",
    "Drain Areas",
  ],
};
export const EQUIPMENT_OPTIONS: Record<ServiceType, string[]> = {
  residential: [
    "Home Electronics",
    "Kitchen Appliances",
    "HVAC Systems",
    "Security Systems",
    "Home Office Equipment",
    "Audio/Visual Equipment",
  ],
  commercial: [
    "Computers/Electronics",
    "Medical Equipment",
    "Kitchen Equipment",
    "Manufacturing Equipment",
    "Laboratory Equipment",
    "Audio/Visual Equipment",
    "Security Systems",
    "HVAC Systems",
    "Server Racks",
  ],
  carpet: [
    "Area Rugs",
    "Wall-to-Wall Carpeting",
    "Furniture to Move",
    "Delicate Textiles",
  ],
  window: [
    "Window Screens",
    "Storm Windows",
    "Window Films",
    "Blinds/Shutters",
  ],
  floor: [
    "Heavy Machinery",
    "Furniture to Move",
    "Floor Drains",
    "Sensitive Equipment",
  ],
};
export const ENVIRONMENTAL_CONCERNS: Record<ServiceType, string[]> = {
  residential: [
    "Pet Odors/Dander",
    "Allergies in Household",
    "Chemical Sensitivity",
    "Child-Safe Products Required",
    "Eco-Friendly Products Preferred",
    "Dust Control Required",
  ],
  commercial: [
    "Chemical Sensitivity",
    "Dust Control Required",
    "Noise Restrictions",
    "Temperature Sensitive",
    "Humidity Control",
    "Air Quality Standards",
    "Contamination Control",
    "Allergen Management",
  ],
  carpet: [
    "Pet Stains/Odors",
    "Allergies",
    "Chemical Sensitivity",
    "Eco-Friendly Products",
    "Fast Drying Required",
  ],
  window: ["Water Restrictions", "Eco-Friendly Products", "Noise Restrictions"],
  floor: [
    "Chemical Sensitivity",
    "Dust Control Required",
    "Fume Ventilation",
    "Eco-Friendly Products",
    "Fast Drying Required",
  ],
};
export const SPECIAL_EQUIPMENT_OPTIONS: Record<ServiceType, string[]> = {
  residential: [
    "HEPA Filtration",
    "Steam Cleaning",
    "Carpet Extraction",
    "Eco-Friendly Products",
  ],
  commercial: [
    "HEPA Filtration",
    "Electrostatic Sprayers",
    "UV Sanitization",
    "Steam Cleaning",
    "Pressure Washing",
    "Carpet Extraction",
    "Floor Buffing/Polishing",
    "Window Cleaning Equipment",
  ],
  carpet: [
    "Steam Cleaning",
    "Carpet Extraction",
    "Stain Treatment",
    "Deodorizing Treatment",
    "Scotchgard Protection",
  ],
  window: [
    "Water-Fed Pole System",
    "Ladder/Lift Access",
    "Pressure Washing",
    "Squeegee System",
  ],
  floor: [
    "Floor Buffing/Polishing",
    "Auto Scrubbers",
    "Strip & Wax Equipment",
    "Diamond Polishing",
    "Concrete Grinding",
  ],
};
export const CERTIFICATION_OPTIONS: Record<ServiceType, string[]> = {
  residential: [
    "Green Cleaning Certification",
    "Background Checked",
    "Bonded & Insured",
  ],
  commercial: [
    "OSHA Compliance",
    "HIPAA Training",
    "Food Safety Certification",
    "Hazmat Handling",
    "Security Clearance",
    "Green Cleaning Certification",
    "Infection Control Training",
    "Chemical Safety Training",
  ],
  carpet: [
    "IICRC Certification",
    "Green Cleaning Certification",
    "Bonded & Insured",
  ],
  window: ["Height Safety Certification", "Bonded & Insured"],
  floor: [
    "Floor Care Specialist",
    "Chemical Safety Training",
    "Bonded & Insured",
  ],
};
export const AREAS_INCLUDED_OPTIONS: Record<ServiceType, string[]> = {
  residential: [
    "Kitchen",
    "Living Room",
    "Dining Room",
    "Bedrooms",
    "Bathrooms",
    "Home Office",
    "Laundry Room",
    "Garage",
    "Basement",
    "Attic",
    "Hallways",
    "Stairs",
    "Outdoor Areas",
  ],
  commercial: [
    "Offices",
    "Common Areas",
    "Restrooms",
    "Break Rooms",
    "Storage Areas",
    "Printing Rooms",
    "Conference Rooms",
    "Reception Area",
    "Hallways",
    "Lobby",
    "Kitchen/Cafeteria",
    "Stairwells",
    "Elevators",
    "Server Room",
    "Executive Offices",
    "Training Rooms",
    "Supply Closets",
  ],
  carpet: [
    "Living Room",
    "Bedrooms",
    "Hallways",
    "Stairs",
    "Office Spaces",
    "Reception Area",
    "Conference Rooms",
  ],
  window: [
    "All Interior Windows",
    "All Exterior Windows",
    "Ground Floor Only",
    "Upper Floors",
    "Skylights",
    "Glass Doors",
  ],
  floor: [
    "Main Floor Area",
    "Hallways",
    "Stairs",
    "Kitchen",
    "Bathrooms",
    "Entryways",
    "Warehouse Floor",
    "Showroom",
  ],
};

export const SERVICE_TYPE_LABELS: Record<
  ServiceType,
  { title: string; description: string }
> = {
  residential: {
    title: "Home Details",
    description:
      "Provide details about the home for accurate service planning.",
  },
  commercial: {
    title: "Enhanced Facility Details",
    description:
      "Provide comprehensive facility information for accurate service planning and pricing.",
  },
  carpet: {
    title: "Carpet Cleaning Details",
    description:
      "Provide details about the carpet areas for accurate cleaning estimates.",
  },
  window: {
    title: "Window Cleaning Details",
    description:
      "Provide details about the windows for accurate service planning.",
  },
  floor: {
    title: "Floor Care Details",
    description:
      "Provide details about the floor areas for accurate service planning.",
  },
};

export const SERVICE_TYPE_FEATURES: Record<
  ServiceType,
  { showTrafficAnalysis: boolean; showFacilityDetails: boolean }
> = {
  commercial: { showTrafficAnalysis: true, showFacilityDetails: true },
  residential: { showTrafficAnalysis: false, showFacilityDetails: false },
  carpet: { showTrafficAnalysis: false, showFacilityDetails: false },
  window: { showTrafficAnalysis: false, showFacilityDetails: false },
  floor: { showTrafficAnalysis: false, showFacilityDetails: false },
};

// Static lists that aren't service-specific also live here
export const VISITOR_FREQUENCY_OPTIONS = [
  { value: "low", label: "Low (< 50 visitors/day)" },
  { value: "medium", label: "Medium (50-200 visitors/day)" },
  { value: "high", label: "High (> 200 visitors/day)" },
];
export const TRAFFIC_LEVEL_OPTIONS = [
  { value: "light", label: "Light Traffic" },
  { value: "medium", label: "Medium Traffic" },
  { value: "heavy", label: "Heavy Traffic" },
];
export const ACCESSIBILITY_OPTIONS = [
  "ADA Compliance Required",
  "Wheelchair Accessible",
  "Special Mobility Equipment",
  "Hearing Assistance Systems",
  "Visual Assistance Systems",
];
export const INSURANCE_OPTIONS = [
  "General Liability",
  "Professional Liability",
  "Workers Compensation",
  "Bonding/Fidelity",
  "Equipment Coverage",
];
