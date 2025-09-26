import {
  type ServiceType,
  type ServiceFrequency,
} from '@/lib/validations/proposal';
import { type Database } from '@/types/database';

type PricingSettings = Database['public']['Tables']['pricing_settings']['Row'];

type FrequencyMultipliers = {
  'one-time': number;
  '1x-month': number;
  'bi-weekly': number;
  weekly: number;
  '2x-week': number;
  '3x-week': number;
  '5x-week': number;
  daily: number;
};

type ProductionRates = {
  [key: string]: number;
};

type ServiceTypeRates = {
  [key in ServiceType]: number;
};

export interface PricingCalculationInput {
  serviceType: ServiceType;
  facilitySize: number;
  serviceFrequency: ServiceFrequency;
  serviceSpecificData: Record<string, any>;
  globalInputs: Record<string, any>;
  pricingSettings?: PricingSettings;
}

export interface PricingBreakdown {
  base_price: number;
  adjustments: number;
  subtotal: number;
  labor_hours: number;
  labor_rate: number;
  labor_cost: number;
  overhead_percentage: number;
  overhead_amount: number;
  margin_percentage: number;
  margin_amount: number;
  total: number;
  frequency_multiplier: number;
  service_adjustments: Record<string, number>;
  calculation_details: {
    base_rate: number;
    unit_type: string;
    units: number;
    complexity_factor: number;
  };
}

export interface PricingAdjustment {
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
  description: string;
}

export class PricingEngine {
  private settings: PricingSettings;
  private defaultSettings: PricingSettings = {
    id: 'default',
    user_id: '',
    labor_rate: 35.0,
    overhead_percentage: 15.0,
    margin_percentage: 25.0,
    production_rates: {
      residential: 1000,
      commercial: 800,
      carpet: 1200,
      window: 500,
      floor: 900,
    },
    frequency_multipliers: {
      'one-time': 1.0,
      weekly: 0.9,
      'bi-weekly': 0.95,
      monthly: 1.0,
      quarterly: 1.1,
    },
    service_type_rates: {
      residential: 0.15,
      commercial: 0.2,
      carpet: 0.12,
      window: 0.25,
      floor: 0.18,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  constructor(settings: PricingSettings | null | undefined) {
    if (!settings) {
      throw new Error('PricingSettings is required');
    }
    this.settings = settings;
  }

  private getFrequencyMultipliers(): FrequencyMultipliers {
    const multipliers = this.settings.frequency_multipliers as any;
    return {
      'one-time': multipliers?.['one-time'] || 1.0,
      '1x-month': multipliers?.['1x-month'] || 1.0,
      'bi-weekly': multipliers?.['bi-weekly'] || 1.1,
      weekly: multipliers?.['weekly'] || 1.2,
      '2x-week': multipliers?.['2x-week'] || 1.3,
      '3x-week': multipliers?.['3x-week'] || 1.4,
      '5x-week': multipliers?.['5x-week'] || 1.5,
      daily: multipliers?.['daily'] || 1.6,
    };
  }

  private getProductionRates(): ProductionRates {
    return (this.settings.production_rates as any) || {};
  }

  private getServiceTypeRates(): ServiceTypeRates {
    const rates = this.settings.service_type_rates as any;
    return {
      residential: rates?.residential || 1.0,
      commercial: rates?.commercial || 1.2,
      carpet: rates?.carpet || 1.1,
      window: rates?.window || 1.3,
      floor: rates?.floor || 1.15,
    };
  }

  /**
   * Calculate comprehensive pricing for a service proposal
   */
  calculatePricing(input: PricingCalculationInput): PricingBreakdown {
    const {
      serviceType,
      facilitySize,
      serviceFrequency,
      serviceSpecificData,
      globalInputs,
      pricingSettings,
    } = input;

    // Use provided settings or default
    const settings = pricingSettings || this.settings;

    // Get base rate and calculate base price
    const serviceTypeRates = settings.service_type_rates as any;
    const baseRate = serviceTypeRates?.[serviceType] || 0.15;
    const { basePrice, units, unitType } = this.calculateBasePrice(
      serviceType,
      facilitySize,
      serviceSpecificData,
      baseRate
    );

    // Calculate complexity factor
    const complexityFactor = this.calculateComplexityFactor(
      serviceType,
      serviceSpecificData,
      globalInputs
    );

    // Apply complexity adjustment
    const adjustedBasePrice = basePrice * complexityFactor;

    // Calculate frequency multiplier
    const multipliers = settings.frequency_multipliers as Record<
      string,
      number
    >;
    const frequencyMultiplier = multipliers?.[serviceFrequency] || 1.0;
    const frequencyAdjustedPrice = adjustedBasePrice * frequencyMultiplier;

    // Calculate service-specific adjustments
    const adjustments = this.calculateServiceAdjustments(
      serviceType,
      serviceSpecificData,
      settings,
      basePrice
    );

    // Calculate subtotal
    const subtotal = frequencyAdjustedPrice + adjustments.total;

    // Calculate labor
    const laborHours = this.calculateLaborHours(
      serviceType,
      facilitySize,
      serviceSpecificData
    );
    const laborCost = laborHours * settings.labor_rate;

    // Calculate overhead and margin
    const overheadAmount = subtotal * (settings.overhead_percentage / 100);
    const marginAmount = subtotal * (settings.margin_percentage / 100);

    // Calculate final total
    const total = subtotal + overheadAmount + marginAmount;

    return {
      base_price: this.roundCurrency(basePrice),
      adjustments: this.roundCurrency(adjustments.total),
      subtotal: this.roundCurrency(subtotal),
      labor_hours: laborHours,
      labor_rate: settings.labor_rate,
      labor_cost: this.roundCurrency(laborCost),
      overhead_percentage: settings.overhead_percentage,
      overhead_amount: this.roundCurrency(overheadAmount),
      margin_percentage: settings.margin_percentage,
      margin_amount: this.roundCurrency(marginAmount),
      total: this.roundCurrency(total),
      frequency_multiplier: frequencyMultiplier,
      service_adjustments: adjustments.breakdown,
      calculation_details: {
        base_rate: baseRate,
        unit_type: unitType,
        units: units,
        complexity_factor: complexityFactor,
      },
    };
  }

  /**
   * Calculate base price based on service type and size
   */
  private calculateBasePrice(
    serviceType: ServiceType,
    facilitySize: number,
    serviceData: Record<string, any>,
    baseRate: number
  ): { basePrice: number; units: number; unitType: string } {
    switch (serviceType) {
      case 'window':
        const windowCount = serviceData.window_count || 1;
        return {
          basePrice: windowCount * baseRate,
          units: windowCount,
          unitType: 'windows',
        };

      case 'carpet':
      case 'floor':
        // For carpet and floor, use square footage
        return {
          basePrice: facilitySize * baseRate,
          units: facilitySize,
          unitType: 'square feet',
        };

      default:
        // For residential and commercial, use square footage
        return {
          basePrice: facilitySize * baseRate,
          units: facilitySize,
          unitType: 'square feet',
        };
    }
  }

  /**
   * Calculate complexity factor based on service requirements
   */
  private calculateComplexityFactor(
    serviceType: ServiceType,
    serviceData: Record<string, any>,
    globalInputs: Record<string, any>
  ): number {
    let factor = 1.0;

    switch (serviceType) {
      case 'residential':
        if (serviceData.bedrooms > 4) factor += 0.1;
        if (serviceData.bathrooms > 3) factor += 0.1;
        if (serviceData.pets) factor += 0.05;
        break;

      case 'commercial':
        if (serviceData.employee_count > 100) factor += 0.2;
        if (serviceData.employee_count > 50) factor += 0.1;
        if (serviceData.cleaning_schedule_preference === 'during_hours')
          factor += 0.15;
        break;

      case 'carpet':
        if (serviceData.carpet_age === '5+_years') factor += 0.15;
        if (serviceData.carpet_age === '3-5_years') factor += 0.1;
        if (serviceData.floor_condition === 'poor') factor += 0.2;
        break;

      case 'window':
        if (serviceData.story_height === 'three_plus') factor += 0.3;
        if (serviceData.story_height === 'two') factor += 0.15;
        if (serviceData.exterior_access === 'lift_required') factor += 0.4;
        if (serviceData.exterior_access === 'ladder_required') factor += 0.2;
        break;

      case 'floor':
        if (serviceData.floor_condition === 'poor') factor += 0.25;
        if (serviceData.floor_condition === 'fair') factor += 0.15;
        if (serviceData.furniture_moving) factor += 0.2;
        break;
    }

    return Math.max(1.0, factor);
  }

  /**
   * Calculate service-specific adjustments
   */
  private calculateServiceAdjustments(
    serviceType: ServiceType,
    serviceData: Record<string, any>,
    settings: PricingSettings,
    basePrice: number
  ): { total: number; breakdown: Record<string, number> } {
    const adjustments: Record<string, number> = {};
    // Service adjustments are handled through service type rates
    const serviceAdjustments = {};

    switch (serviceType) {
      case 'residential':
        if (serviceData.pets) {
          adjustments.pets = 25; // Fixed pet cleaning fee
        }
        if (!serviceData.cleaning_supplies_provided) {
          adjustments.supplies_not_provided = 15; // Fixed supplies fee
        }
        break;

      case 'commercial':
        if (serviceData.cleaning_schedule_preference === 'after_hours') {
          adjustments.after_hours = 50; // Fixed after hours premium
        }
        if (serviceData.employee_count > 50) {
          adjustments.large_facility = 75; // Fixed large facility fee
        }
        break;

      case 'carpet':
        if (serviceData.pet_odors) {
          adjustments.pet_odors = 50; // Fixed pet odor treatment fee
        }
        if (serviceData.protection_treatment) {
          adjustments.protection_treatment = 35; // Fixed protection treatment fee
        }
        break;

      case 'window':
        const windowCount = serviceData.window_count || 1;
        if (serviceData.screen_cleaning) {
          adjustments.screen_cleaning = windowCount * 2; // Fixed screen cleaning fee per window
        }
        if (serviceData.sill_cleaning) {
          adjustments.sill_cleaning = windowCount * 1.5; // Fixed sill cleaning fee per window
        }
        if (serviceData.story_height === 'two') {
          adjustments.height_premium = basePrice * 0.25; // Two story premium
        }
        if (serviceData.story_height === 'three_plus') {
          adjustments.height_premium = basePrice * 0.5; // Three+ story premium
        }
        break;

      case 'floor':
        if (serviceData.furniture_moving) {
          adjustments.furniture_moving = 75; // Fixed furniture moving fee
        }
        if (serviceData.drying_time_preference === 'quick_dry') {
          adjustments.quick_dry = 25; // Fixed quick dry fee
        }
        break;
    }

    const total = Object.values(adjustments).reduce(
      (sum, value) => sum + value,
      0
    );
    return { total, breakdown: adjustments };
  }

  /**
   * Calculate estimated labor hours
   */
  private calculateLaborHours(
    serviceType: ServiceType,
    facilitySize: number,
    serviceData: Record<string, any>
  ): number {
    let baseHours = 0;

    switch (serviceType) {
      case 'residential':
        baseHours = Math.ceil(facilitySize / 400); // 400 sq ft per hour
        if (serviceData.bedrooms > 3) baseHours += 1;
        if (serviceData.bathrooms > 2) baseHours += 0.5;
        break;

      case 'commercial':
        baseHours = Math.ceil(facilitySize / 600); // 600 sq ft per hour for commercial
        if (serviceData.employee_count > 50) baseHours += 2;
        break;

      case 'carpet':
        baseHours = Math.ceil(facilitySize / 300); // 300 sq ft per hour for carpet
        if (serviceData.pet_odors) baseHours += 1;
        if (serviceData.protection_treatment) baseHours += 0.5;
        break;

      case 'window':
        const windowCount = serviceData.window_count || 1;
        baseHours = Math.ceil(windowCount / 12); // 12 windows per hour
        if (serviceData.story_height === 'two')
          baseHours += Math.ceil(windowCount / 20);
        if (serviceData.story_height === 'three_plus')
          baseHours += Math.ceil(windowCount / 15);
        break;

      case 'floor':
        baseHours = Math.ceil(facilitySize / 250); // 250 sq ft per hour for floor care
        if (serviceData.furniture_moving) baseHours += 2;
        break;
    }

    return Math.max(1, baseHours);
  }

  /**
   * Round currency to 2 decimal places
   */
  private roundCurrency(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Get pricing adjustments for a specific service type
   */
  private getServiceAdjustments(
    serviceType: ServiceType
  ): Record<string, number> {
    // Service adjustments can be derived from service-specific data
    // For now, return empty object as adjustments are handled elsewhere
    return {};
  }

  /**
   * Update pricing settings
   */
  updateSettings(newSettings: Partial<PricingSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current pricing settings
   */
  getSettings(): PricingSettings {
    return this.settings;
  }

  /**
   * Calculate price estimate for quick quotes
   */
  getQuickEstimate(
    serviceType: ServiceType,
    facilitySize: number,
    frequency: ServiceFrequency = 'one-time'
  ): number {
    const serviceTypeRates = this.getServiceTypeRates();
    const baseRate = serviceTypeRates[serviceType] || 0.15;
    const frequencyMultipliers = this.getFrequencyMultipliers();
    const frequencyMultiplier = frequencyMultipliers[frequency] || 1.0;
    const basePrice = facilitySize * baseRate * frequencyMultiplier;
    const overheadPercentage = this.settings?.overhead_percentage ?? 0;
    const marginPercentage = this.settings?.margin_percentage ?? 0;
    const overhead = basePrice * (overheadPercentage / 100);
    const margin = basePrice * (marginPercentage / 100);

    return this.roundCurrency(basePrice + overhead + margin);
  }
}

// Export factory function instead of singleton
export const createPricingEngine = (settings: PricingSettings) =>
  new PricingEngine(settings);

// Export utility functions
/**
 * Calculate quick estimate for service pricing
 */
export function calculateQuickEstimate(
  serviceType: ServiceType,
  facilitySize: number,
  serviceFrequency: ServiceFrequency,
  settings: PricingSettings
): number {
  const baseRate = 0.15; // Default rate per sq ft
  const multipliers = settings.frequency_multipliers as any;
  const frequencyMultiplier = multipliers?.[serviceFrequency] || 1.0;
  const serviceMultiplier = getServiceTypeMultiplier(serviceType);

  return (
    Math.round(
      facilitySize * baseRate * frequencyMultiplier * serviceMultiplier * 100
    ) / 100
  );
}

/**
 * Get service type multiplier
 */
function getServiceTypeMultiplier(serviceType: ServiceType): number {
  const multipliers = {
    residential: 1.0,
    commercial: 1.2,
    carpet: 1.1,
    window: 1.3,
    floor: 1.15,
  };
  return multipliers[serviceType] || 1.0;
}

type DetailedPricingResult = {
  basePrice: number;
  laborCost: number;
  overhead: number;
  margin: number;
  total: number;
  breakdown: Record<string, number>;
};

/**
 * Calculate detailed pricing breakdown
 */
export function calculateDetailedPricing(
  serviceType: ServiceType,
  facilitySize: number,
  serviceFrequency: ServiceFrequency,
  serviceSpecificData: Record<string, any>,
  settings: PricingSettings
): DetailedPricingResult {
  const laborRate = settings.labor_rate || 50;
  const overheadPercentage = settings.overhead_percentage || 20;
  const marginPercentage = settings.margin_percentage || 15;

  // Calculate base time estimate
  const baseHours = facilitySize / 1000; // Base: 1 hour per 1000 sq ft
  const serviceAdjustments = {}; // Service adjustments handled elsewhere
  const multipliers = settings.frequency_multipliers as any;
  const frequencyMultiplier = multipliers?.[serviceFrequency] || 1.0;

  const basePrice = facilitySize * 0.15 * frequencyMultiplier;
  const laborCost = baseHours * laborRate;
  const overhead = basePrice * (overheadPercentage / 100);
  const margin = basePrice * (marginPercentage / 100);
  const total = basePrice + laborCost + overhead + margin;

  return {
    basePrice,
    laborCost,
    overhead,
    margin,
    total,
    breakdown: {
      base: basePrice,
      labor: laborCost,
      overhead,
      margin,
    },
  };
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
