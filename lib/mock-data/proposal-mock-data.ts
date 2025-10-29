import type {
  ServiceType,
  ServiceFrequency,
  GlobalInputs,
  ResidentialService,
  CommercialService,
  CarpetService,
  WindowService,
  FloorService,
  PricingData,
} from '../validations/proposal';

interface MockProposalData {
  service_type: ServiceType;
  global_inputs: GlobalInputs;
  service_specific_data: any;
  facility_details: {
    building_age?: number;
    building_type?: string;
    accessibility_requirements: string[];
    special_areas: string[];
    equipment_present: string[];
    environmental_concerns: string[];
  };
  traffic_analysis: {
    staff_count?: number;
    visitor_frequency?: string;
    peak_hours: string[];
    special_events: boolean;
    traffic_level?: string;
  };
  service_scope: {
    areas_included: string[];
    areas_excluded: string[];
    special_services: string[];
    frequency_details: Record<string, any>;
  };
  special_requirements: {
    security_clearance: boolean;
    after_hours_access: boolean;
    special_equipment: string[];
    certifications_required: string[];
    insurance_requirements: string[];
  };
  pricing_data?: PricingData;
}

const mockProposalData: Record<ServiceType, MockProposalData> = {
  residential: {
    service_type: 'residential',
    global_inputs: {
      client_name: 'Sarah Johnson',
      client_email: 'sarah.johnson@email.com',
      client_company: 'Johnson Family LLC',
      contact_phone: '(555) 123-4567',
      service_location: '123 Maple Street, Springfield, IL 62701',
      facility_size: 2500,
      service_frequency: '2x-week',
      regional_location: 'Springfield, IL',
    },
    service_specific_data: {
      home_type: 'house',
      bedrooms: 4,
      bathrooms: 3,
      pets: true,
      pet_details: '2 cats, 1 small dog',
      cleaning_supplies_provided: false,
      special_instructions:
        'Please use eco-friendly products. Cats are shy, may hide under beds.',
    },
    facility_details: {
      building_age: 15,
      building_type: 'office',
      accessibility_requirements: ['wheelchair_accessible'],
      special_areas: ['home_office', 'playroom', 'basement'],
      equipment_present: [
        'hardwood_floors',
        'granite_counters',
        'stainless_appliances',
      ],
      environmental_concerns: ['pet_allergies', 'chemical_sensitivity'],
    },
    traffic_analysis: {
      staff_count: 4,
      visitor_frequency: 'medium',
      peak_hours: ['7:00-9:00', '17:00-19:00'],
      special_events: false,
      traffic_level: 'medium',
    },
    service_scope: {
      areas_included: [
        'living_room',
        'kitchen',
        'bedrooms',
        'bathrooms',
        'hallways',
      ],
      areas_excluded: ['garage', 'attic'],
      special_services: ['deep_clean', 'pet_hair_removal'],
      frequency_details: {
        deep_clean: 'monthly',
        regular_maintenance: 'bi-weekly',
      },
    },
    special_requirements: {
      security_clearance: false,
      after_hours_access: false,
      special_equipment: ['pet_safe_vacuum', 'microfiber_cloths'],
      certifications_required: [],
      insurance_requirements: ['general_liability'],
    },
    pricing_data: {
      price_range: { low: 150, high: 250 },
      hours_estimate: { min: 3, max: 5 },
      assumptions: {
        labor_rate: 35,
        overhead_percentage: 25,
        margin_percentage: 20,
        production_rate: { min: 500, max: 800 },
      },
    },
  },

  commercial: {
    service_type: 'commercial',
    global_inputs: {
      client_name: 'Michael Chen',
      client_email: 'mchen@techcorp.com',
      client_company: 'TechCorp Solutions',
      contact_phone: '(555) 987-6543',
      service_location: '456 Business Plaza, Suite 200, Chicago, IL 60601',
      facility_size: 15000,
      service_frequency: '3x-week',
      regional_location: 'Chicago, IL',
    },
    service_specific_data: {
      business_type: 'technology',
      operating_hours: '8:00 AM - 6:00 PM',
      employee_count: 75,
      public_access: true,
      security_requirements: 'background_check',
      special_areas: ['server_room', 'conference_rooms', 'break_room'],
      cleaning_schedule: 'after_hours',
    },
    facility_details: {
      building_age: 8,
      building_type: 'office',
      accessibility_requirements: ['ada_compliant', 'elevator_access'],
      special_areas: [
        'server_room',
        'conference_rooms',
        'executive_offices',
        'break_room',
        'reception',
      ],
      equipment_present: [
        'carpet_tiles',
        'glass_partitions',
        'modern_furniture',
      ],
      environmental_concerns: [
        'dust_sensitive_equipment',
        'noise_restrictions',
      ],
    },
    traffic_analysis: {
      staff_count: 75,
      visitor_frequency: 'high',
      peak_hours: ['8:00-10:00', '12:00-13:00', '17:00-18:00'],
      special_events: true,
      traffic_level: 'heavy',
    },
    service_scope: {
      areas_included: [
        'offices',
        'conference_rooms',
        'break_room',
        'reception',
        'hallways',
        'restrooms',
      ],
      areas_excluded: ['server_room', 'storage_closets'],
      special_services: ['carpet_cleaning', 'window_cleaning', 'sanitization'],
      frequency_details: {
        daily_maintenance: 'restrooms, break_room, reception',
        weekly_deep_clean: 'offices, conference_rooms',
        monthly_services: 'carpet_cleaning, window_cleaning',
      },
    },
    special_requirements: {
      security_clearance: true,
      after_hours_access: true,
      special_equipment: [
        'HEPA_vacuums',
        'anti_static_cloths',
        'quiet_equipment',
      ],
      certifications_required: ['background_check', 'bonded_insured'],
      insurance_requirements: [
        'general_liability',
        'workers_comp',
        'cyber_liability',
      ],
    },
    pricing_data: {
      price_range: { low: 2500, high: 4000 },
      hours_estimate: { min: 15, max: 25 },
      assumptions: {
        labor_rate: 28,
        overhead_percentage: 30,
        margin_percentage: 25,
        production_rate: { min: 600, max: 1000 },
      },
    },
  },

  carpet: {
    service_type: 'carpet',
    global_inputs: {
      client_name: 'Jennifer Martinez',
      client_email: 'j.martinez@retailstore.com',
      client_company: 'Martinez Retail Store',
      contact_phone: '(555) 456-7890',
      service_location: '789 Shopping Center, Store 15, Phoenix, AZ 85001',
      facility_size: 8000,
      service_frequency: '1x-month',
      regional_location: 'Phoenix, AZ',
    },
    service_specific_data: {
      carpet_type: 'commercial_grade',
      carpet_age: '3_years',
      stain_level: 'moderate',
      traffic_level: 'high',
      last_cleaning: '6_months',
      problem_areas: ['entrance', 'checkout_area', 'fitting_rooms'],
      special_treatments: ['stain_protection', 'deodorizing'],
    },
    facility_details: {
      building_age: 12,
      building_type: 'retail',
      accessibility_requirements: ['ada_compliant', 'wide_aisles'],
      special_areas: [
        'sales_floor',
        'fitting_rooms',
        'storage_area',
        'employee_break_room',
      ],
      equipment_present: [
        'retail_fixtures',
        'checkout_counters',
        'security_systems',
      ],
      environmental_concerns: ['customer_safety', 'quick_drying_required'],
    },
    traffic_analysis: {
      staff_count: 12,
      visitor_frequency: 'high',
      peak_hours: ['10:00-12:00', '14:00-16:00', '18:00-20:00'],
      special_events: true,
      traffic_level: 'heavy',
    },
    service_scope: {
      areas_included: ['sales_floor', 'fitting_rooms', 'employee_areas'],
      areas_excluded: ['storage_room', 'utility_areas'],
      special_services: [
        'deep_extraction',
        'stain_removal',
        'deodorizing',
        'protection_treatment',
      ],
      frequency_details: {
        deep_cleaning: 'monthly',
        spot_treatment: 'as_needed',
        protection_application: 'quarterly',
      },
    },
    special_requirements: {
      security_clearance: false,
      after_hours_access: true,
      special_equipment: [
        'truck_mounted_system',
        'quick_dry_fans',
        'stain_removal_kit',
      ],
      certifications_required: ['IICRC_certified'],
      insurance_requirements: ['general_liability', 'equipment_coverage'],
    },
    pricing_data: {
      price_range: { low: 800, high: 1200 },
      hours_estimate: { min: 6, max: 10 },
      assumptions: {
        labor_rate: 32,
        overhead_percentage: 28,
        margin_percentage: 22,
        production_rate: { min: 800, max: 1200 },
      },
    },
  },

  window: {
    service_type: 'window',
    global_inputs: {
      client_name: 'David Thompson',
      client_email: 'dthompson@medicenter.com',
      client_company: 'Thompson Medical Center',
      contact_phone: '(555) 321-0987',
      service_location: '321 Healthcare Drive, Denver, CO 80202',
      facility_size: 25000,
      service_frequency: 'bi-weekly',
      regional_location: 'Denver, CO',
    },
    service_specific_data: {
      window_count: 150,
      window_types: ['standard', 'floor_to_ceiling', 'skylights'],
      building_height: '4_stories',
      accessibility: 'lift_required',
      glass_type: 'tempered',
      special_coatings: ['uv_protection', 'anti_glare'],
      cleaning_frequency: 'bi_weekly',
    },
    facility_details: {
      building_age: 5,
      building_type: 'medical',
      accessibility_requirements: [
        'ada_compliant',
        'patient_access',
        'emergency_exits',
      ],
      special_areas: [
        'patient_rooms',
        'operating_rooms',
        'waiting_areas',
        'administrative_offices',
      ],
      equipment_present: [
        'medical_equipment',
        'specialized_lighting',
        'hvac_systems',
      ],
      environmental_concerns: [
        'infection_control',
        'patient_privacy',
        'sterile_environment',
      ],
    },
    traffic_analysis: {
      staff_count: 120,
      visitor_frequency: 'high',
      peak_hours: ['7:00-9:00', '11:00-13:00', '15:00-17:00'],
      special_events: false,
      traffic_level: 'heavy',
    },
    service_scope: {
      areas_included: [
        'exterior_windows',
        'interior_windows',
        'glass_doors',
        'skylights',
      ],
      areas_excluded: ['operating_room_windows', 'sterile_areas'],
      special_services: [
        'streak_free_cleaning',
        'frame_cleaning',
        'sill_cleaning',
      ],
      frequency_details: {
        exterior_cleaning: 'bi-weekly',
        interior_cleaning: 'weekly',
        deep_clean: 'monthly',
      },
    },
    special_requirements: {
      security_clearance: true,
      after_hours_access: false,
      special_equipment: [
        'lift_equipment',
        'medical_grade_cleaners',
        'lint_free_cloths',
      ],
      certifications_required: [
        'background_check',
        'health_screening',
        'HIPAA_training',
      ],
      insurance_requirements: [
        'general_liability',
        'medical_malpractice',
        'equipment_coverage',
      ],
    },
    pricing_data: {
      price_range: { low: 1500, high: 2500 },
      hours_estimate: { min: 12, max: 20 },
      assumptions: {
        labor_rate: 30,
        overhead_percentage: 35,
        margin_percentage: 25,
        production_rate: { min: 15, max: 25 },
      },
    },
  },

  floor: {
    service_type: 'floor',
    global_inputs: {
      client_name: 'Lisa Rodriguez',
      client_email: 'lrodriguez@grandhotel.com',
      client_company: 'Grand Plaza Hotel',
      contact_phone: '(555) 654-3210',
      service_location: '555 Luxury Boulevard, Miami, FL 33101',
      facility_size: 50000,
      service_frequency: 'daily',
      regional_location: 'Miami, FL',
    },
    service_specific_data: {
      floor_types: ['marble', 'hardwood', 'tile', 'carpet'],
      floor_condition: 'good',
      treatment_needed: ['deep_clean', 'polish', 'seal'],
      high_traffic_areas: [
        'lobby',
        'elevators',
        'restaurant',
        'conference_rooms',
      ],
      furniture_moving: true,
      drying_time_preference: 'quick_dry',
    },
    facility_details: {
      building_age: 20,
      building_type: 'hospitality',
      accessibility_requirements: [
        'ada_compliant',
        'guest_access',
        'service_elevators',
      ],
      special_areas: [
        'lobby',
        'guest_rooms',
        'restaurant',
        'conference_rooms',
        'spa',
        'fitness_center',
      ],
      equipment_present: [
        'luxury_furnishings',
        'marble_surfaces',
        'hardwood_floors',
        'area_rugs',
      ],
      environmental_concerns: [
        'guest_comfort',
        'noise_restrictions',
        'chemical_sensitivity',
      ],
    },
    traffic_analysis: {
      staff_count: 200,
      visitor_frequency: 'high',
      peak_hours: ['7:00-10:00', '12:00-14:00', '18:00-22:00'],
      special_events: true,
      traffic_level: 'heavy',
    },
    service_scope: {
      areas_included: [
        'lobby',
        'corridors',
        'public_areas',
        'restaurant',
        'conference_rooms',
      ],
      areas_excluded: ['guest_rooms', 'private_offices'],
      special_services: [
        'marble_polishing',
        'hardwood_refinishing',
        'grout_cleaning',
        'protective_coating',
      ],
      frequency_details: {
        daily_maintenance: 'lobby, elevators, restaurant',
        weekly_deep_clean: 'conference_rooms, public_areas',
        monthly_services: 'marble_polishing, hardwood_treatment',
      },
    },
    special_requirements: {
      security_clearance: true,
      after_hours_access: true,
      special_equipment: [
        'floor_buffers',
        'marble_polishers',
        'quick_dry_systems',
        'noise_reduction_equipment',
      ],
      certifications_required: ['background_check', 'hospitality_training'],
      insurance_requirements: [
        'general_liability',
        'hospitality_coverage',
        'equipment_insurance',
      ],
    },
    pricing_data: {
      price_range: { low: 5000, high: 8000 },
      hours_estimate: { min: 25, max: 40 },
      assumptions: {
        labor_rate: 35,
        overhead_percentage: 30,
        margin_percentage: 28,
        production_rate: { min: 1200, max: 2000 },
      },
    },
  },
};

export function getMockDataByServiceType(
  serviceType: ServiceType
): MockProposalData {
  return mockProposalData[serviceType];
}

export function getRandomMockData(): MockProposalData {
  const serviceTypes: ServiceType[] = [
    'residential',
    'commercial',
    'carpet',
    'window',
    'floor',
  ];
  const randomType =
    serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
  return getMockDataByServiceType(randomType);
}

export function getAllMockData(): Record<ServiceType, MockProposalData> {
  return mockProposalData;
}

export { mockProposalData };
