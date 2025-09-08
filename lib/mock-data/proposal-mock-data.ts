// Mock data for proposal form - covers all service types and steps

export const mockProposalData = {
  // Residential Service Mock Data
  residential: {
    title: "Residential Cleaning - Johnson Family Home",
    service_type: "residential" as const,
    global_inputs: {
      client_name: "Sarah Johnson",
      client_email: "sarah.johnson@email.com",
      client_company: "Johnson Family",
      contact_phone: "(555) 123-4567",
      service_location: "1234 Maple Street, Springfield, IL 62701",
      facility_size: 2500,
      service_frequency: "bi-weekly" as const,
    },
    service_specific_data: {
      home_type: "house" as const,
      bedrooms: 4,
      bathrooms: 3,
      pets: true,
      pet_details: "Two cats (indoor only) and one golden retriever",
      cleaning_supplies_provided: false,
      special_instructions: "Please use eco-friendly products. Master bedroom has hardwood floors that need special care.",
    },
    pricing_enabled: true,
    pricing_data: {
      price_range: { low: 180, high: 220 },
      hours_estimate: { min: 3, max: 4 },
      assumptions: {
        labor_rate: 45,
        overhead_percentage: 25,
        margin_percentage: 20,
        production_rate: { min: 625, max: 833 },
      },
    },
    status: "draft" as const,
  },

  // Commercial Service Mock Data
  commercial: {
    title: "Commercial Office Cleaning - TechCorp Solutions",
    service_type: "commercial" as const,
    global_inputs: {
      client_name: "Michael Chen",
      client_email: "m.chen@techcorp.com",
      client_company: "TechCorp Solutions Inc.",
      contact_phone: "(555) 987-6543",
      service_location: "5678 Business Plaza, Suite 200, Chicago, IL 60601",
      facility_size: 8500,
      service_frequency: "3x-week" as const,
    },
    service_specific_data: {
      business_type: "Technology/Software Company",
      operating_hours: "Monday-Friday 8:00 AM - 6:00 PM",
      employee_count: 45,
      high_traffic_areas: ["Main lobby", "Conference rooms", "Kitchen/break room", "Restrooms"],
      security_requirements: "Badge access required after 6 PM. Security code: #2847",
      cleaning_schedule_preference: "after_hours" as const,
      special_equipment_needed: true,
      equipment_details: "HEPA vacuum for server room, anti-static cleaning supplies for electronics",
    },
    pricing_enabled: true,
    pricing_data: {
      price_range: { low: 850, high: 1200 },
      hours_estimate: { min: 6, max: 8 },
      assumptions: {
        labor_rate: 50,
        overhead_percentage: 30,
        margin_percentage: 25,
        production_rate: { min: 1062, max: 1416 },
      },
    },
    status: "draft" as const,
  },

  // Carpet Cleaning Mock Data
  carpet: {
    title: "Carpet Deep Cleaning - Wilson Residence",
    service_type: "carpet" as const,
    global_inputs: {
      client_name: "Jennifer Wilson",
      client_email: "jen.wilson@gmail.com",
      client_company: "",
      contact_phone: "(555) 456-7890",
      service_location: "9876 Oak Avenue, Riverside, CA 92501",
      facility_size: 1800,
      service_frequency: "one-time" as const,
    },
    service_specific_data: {
      carpet_type: "nylon" as const,
      carpet_age: "3-5_years" as const,
      stain_types: ["Pet stains", "Food spills", "High traffic wear"],
      high_traffic_areas: ["Living room", "Hallway", "Stairs"],
      pet_odors: true,
      previous_cleaning_date: "2023-08-15",
      protection_treatment: true,
    },
    pricing_enabled: true,
    pricing_data: {
      price_range: { low: 320, high: 450 },
      hours_estimate: { min: 4, max: 6 },
      assumptions: {
        labor_rate: 55,
        overhead_percentage: 20,
        margin_percentage: 30,
        production_rate: { min: 300, max: 450 },
      },
    },
    status: "draft" as const,
  },

  // Window Cleaning Mock Data
  window: {
    title: "Window Cleaning Service - Downtown Office Building",
    service_type: "window" as const,
    global_inputs: {
      client_name: "Robert Martinez",
      client_email: "r.martinez@propertymanagement.com",
      client_company: "Downtown Property Management",
      contact_phone: "(555) 321-0987",
      service_location: "1500 Main Street, Portland, OR 97205",
      facility_size: 12000,
      service_frequency: "1x-month" as const,
    },
    service_specific_data: {
      window_count: 48,
      story_height: "three_plus" as const,
      window_types: ["standard", "bay", "french"],
      screen_cleaning: true,
      sill_cleaning: true,
      exterior_access: "lift_required" as const,
      safety_concerns: "High winds common in afternoon. Coordinate with building security for lift access.",
    },
    pricing_enabled: true,
    pricing_data: {
      price_range: { low: 680, high: 920 },
      hours_estimate: { min: 8, max: 12 },
      assumptions: {
        labor_rate: 60,
        overhead_percentage: 35,
        margin_percentage: 25,
        production_rate: { min: 4, max: 6 },
      },
    },
    status: "draft" as const,
  },

  // Floor Care Mock Data
  floor: {
    title: "Commercial Floor Restoration - Medical Center",
    service_type: "floor" as const,
    global_inputs: {
      client_name: "Dr. Amanda Foster",
      client_email: "a.foster@medicalcenter.org",
      client_company: "Riverside Medical Center",
      contact_phone: "(555) 654-3210",
      service_location: "2200 Hospital Drive, Austin, TX 78701",
      facility_size: 15000,
      service_frequency: "one-time" as const,
    },
    service_specific_data: {
      floor_types: ["vinyl", "tile", "concrete"],
      floor_condition: "fair" as const,
      treatment_needed: ["deep_clean", "strip_wax", "seal"],
      high_traffic_areas: ["Main corridors", "Waiting areas", "Emergency entrance"],
      furniture_moving: true,
      drying_time_preference: "overnight" as const,
    },
    pricing_enabled: true,
    pricing_data: {
      price_range: { low: 2200, high: 3100 },
      hours_estimate: { min: 16, max: 24 },
      assumptions: {
        labor_rate: 65,
        overhead_percentage: 40,
        margin_percentage: 30,
        production_rate: { min: 625, max: 937 },
      },
    },
    status: "draft" as const,
  },
};

// Helper function to get mock data by service type
export const getMockDataByServiceType = (serviceType: string) => {
  return mockProposalData[serviceType as keyof typeof mockProposalData] || mockProposalData.residential;
};

// Random mock data generator
export const getRandomMockData = () => {
  const serviceTypes = Object.keys(mockProposalData);
  const randomType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
  return mockProposalData[randomType as keyof typeof mockProposalData];
};