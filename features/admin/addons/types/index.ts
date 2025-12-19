/**
 * Add-ons Type Definitions
 * Domain types for the additional service catalog
 */

export type UnitType = 'sqft' | 'pane' | 'visit' | 'hour' | 'flat';
export type FrequencyType = 'one_time' | 'monthly' | 'quarterly' | 'annual';
export type CategoryType = 'cleaning' | 'maintenance' | 'specialty' | 'seasonal' | 'other';

/**
 * Add-on record from database
 */
export interface Addon {
  id: string;
  sku: string;
  label: string;
  category?: CategoryType;
  unit_type: UnitType;
  rate: number;
  min_qty: number;
  default_frequency: FrequencyType;
  frequency_options: FrequencyType[];
  amortize_to_monthly: boolean;
  default_qty_source: string;
  active: boolean;
  show_in_proposals?: boolean;
  description?: string;
  notes?: string;
  created_at: string;
}

/**
 * Form data for creating/editing add-ons
 */
export interface AddonFormData {
  sku: string;
  label: string;
  category?: CategoryType;
  unit_type: UnitType;
  rate: number;
  min_qty: number;
  default_frequency: FrequencyType;
  frequency_options: FrequencyType[];
  amortize_to_monthly: boolean;
  default_qty_source: string;
  active: boolean;
  show_in_proposals?: boolean;
  description?: string;
  notes?: string;
}

/**
 * Filters for addon list
 */
export interface AddonFilters {
  search?: string;
  category?: CategoryType;
  active?: boolean;
  show_in_proposals?: boolean;
}

/**
 * Response from API endpoints
 */
export interface AddonResponse {
  success: boolean;
  data?: Addon;
  error?: string;
}

export interface AddonsListResponse {
  success: boolean;
  data?: Addon[];
  error?: string;
}

/**
 * Display labels for enums
 */
export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  sqft: 'Square Foot',
  pane: 'Window Pane',
  visit: 'Visit',
  hour: 'Hour',
  flat: 'Flat Rate',
};

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  one_time: 'One Time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  specialty: 'Specialty',
  seasonal: 'Seasonal',
  other: 'Other',
};

export const DEFAULT_QTY_SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'facility_sqft', label: 'Facility Square Footage' },
  { value: 'windows_count', label: 'Window Count' },
  { value: 'auto', label: 'Auto Calculated' },
];
