import { z } from "zod"

// Service type enum
export const serviceTypeSchema = z.enum(["residential", "commercial", "carpet", "window", "floor"])

// Service frequency enum
export const serviceFrequencySchema = z.enum([
  "one-time",
  "1x-month", 
  "bi-weekly",
  "weekly",
  "2x-week",
  "3x-week", 
  "5x-week",
  "daily"
])

// Base global inputs schema (always required)
export const globalInputsSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().email("Invalid email address"),
  client_company: z.string().optional(),
  contact_phone: z.string().min(1, "Contact phone is required"),
  service_location: z.string().min(1, "Service location is required"),
  facility_size: z.number().min(1, "Facility size must be greater than 0"),
  service_frequency: serviceFrequencySchema,
})

// Service-specific schemas
export const residentialServiceSchema = z.object({
  home_type: z.enum(["apartment", "house", "condo", "townhouse"]),
  bedrooms: z.number().min(1).max(10),
  bathrooms: z.number().min(1).max(10),
  pets: z.boolean().default(false),
  pet_details: z.string().optional(),
  cleaning_supplies_provided: z.boolean().default(false),
  special_instructions: z.string().optional(),
})

export const commercialServiceSchema = z.object({
  business_type: z.string().min(1, "Business type is required"),
  operating_hours: z.string().min(1, "Operating hours are required"),
  employee_count: z.number().min(1),
  high_traffic_areas: z.array(z.string()).default([]),
  security_requirements: z.string().optional(),
  cleaning_schedule_preference: z.enum(["before_hours", "after_hours", "during_hours"]),
  special_equipment_needed: z.boolean().default(false),
  equipment_details: z.string().optional(),
})

export const carpetServiceSchema = z.object({
  carpet_type: z.enum(["wool", "nylon", "polyester", "olefin", "unknown"]),
  carpet_age: z.enum(["new", "1-3_years", "3-5_years", "5+_years"]),
  stain_types: z.array(z.string()).default([]),
  high_traffic_areas: z.array(z.string()).default([]),
  pet_odors: z.boolean().default(false),
  previous_cleaning_date: z.string().optional(),
  protection_treatment: z.boolean().default(false),
})

export const windowServiceSchema = z.object({
  window_count: z.number().min(1),
  story_height: z.enum(["single", "two", "three_plus"]),
  window_types: z.array(z.enum(["standard", "french", "bay", "skylight", "storm"])).default([]),
  screen_cleaning: z.boolean().default(false),
  sill_cleaning: z.boolean().default(false),
  exterior_access: z.enum(["ground_level", "ladder_required", "lift_required"]),
  safety_concerns: z.string().optional(),
})

export const floorServiceSchema = z.object({
  floor_types: z.array(z.enum(["hardwood", "tile", "laminate", "vinyl", "concrete", "marble"])).min(1),
  floor_condition: z.enum(["excellent", "good", "fair", "poor"]),
  treatment_needed: z.array(z.enum(["deep_clean", "strip_wax", "refinish", "seal", "polish"])).default([]),
  high_traffic_areas: z.array(z.string()).default([]),
  furniture_moving: z.boolean().default(false),
  drying_time_preference: z.enum(["standard", "quick_dry", "overnight"]),
})

// Pricing data schema
export const pricingDataSchema = z.object({
  price_range: z.object({
    low: z.number(),
    high: z.number(),
  }),
  hours_estimate: z.object({
    min: z.number(),
    max: z.number(),
  }),
  assumptions: z.object({
    labor_rate: z.number(),
    overhead_percentage: z.number(),
    margin_percentage: z.number(),
    production_rate: z.object({
      min: z.number(),
      max: z.number(),
    }),
  }),
})

// Main proposal form schema
export const proposalFormSchema = z.object({
  title: z.string().min(1, "Proposal title is required"),
  service_type: serviceTypeSchema,
  global_inputs: globalInputsSchema,
  service_specific_data: z.record(z.any()).default({}),
  pricing_enabled: z.boolean().default(false),
  pricing_data: pricingDataSchema.optional(),
  generated_content: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).default("draft"),
})

// Dynamic validation based on service type
export const getServiceSpecificSchema = (serviceType: string) => {
  switch (serviceType) {
    case "residential":
      return residentialServiceSchema
    case "commercial":
      return commercialServiceSchema
    case "carpet":
      return carpetServiceSchema
    case "window":
      return windowServiceSchema
    case "floor":
      return floorServiceSchema
    default:
      return z.object({})
  }
}

// Complete proposal validation with service-specific data
export const validateProposalWithServiceData = (data: any) => {
  const baseValidation = proposalFormSchema.parse(data)
  const serviceSpecificSchema = getServiceSpecificSchema(data.service_type)
  const serviceSpecificValidation = serviceSpecificSchema.parse(data.service_specific_data)
  
  return {
    ...baseValidation,
    service_specific_data: serviceSpecificValidation,
  }
}

// Pricing settings schema
export const pricingSettingsSchema = z.object({
  labor_rate: z.number().min(0, "Labor rate must be positive"),
  overhead_percentage: z.number().min(0).max(100, "Overhead percentage must be between 0-100"),
  margin_percentage: z.number().min(0).max(100, "Margin percentage must be between 0-100"),
  production_rates: z.object({
    residential: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }),
    commercial: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }),
    carpet: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }),
    window: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }),
    floor: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }),
  }),
})

// Schema exports
export const proposalSchema = proposalFormSchema

// Type exports
export type ServiceType = z.infer<typeof serviceTypeSchema>
export type ServiceFrequency = z.infer<typeof serviceFrequencySchema>
export type GlobalInputs = z.infer<typeof globalInputsSchema>
export type ResidentialService = z.infer<typeof residentialServiceSchema>
export type CommercialService = z.infer<typeof commercialServiceSchema>
export type CarpetService = z.infer<typeof carpetServiceSchema>
export type WindowService = z.infer<typeof windowServiceSchema>
export type FloorService = z.infer<typeof floorServiceSchema>
export type PricingData = z.infer<typeof pricingDataSchema>
export type ProposalFormData = z.infer<typeof proposalFormSchema>
export type PricingSettings = z.infer<typeof pricingSettingsSchema>
