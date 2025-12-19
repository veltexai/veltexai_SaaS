/**
 * Unit Tests for Add-Ons Validation Schemas
 */
import {
  addonFormSchema,
  addonFormSchemaWithRefinements,
  addonFiltersSchema,
} from '../utils/validation';

describe('Add-Ons Validation', () => {
  describe('addonFormSchema', () => {
    it('should validate a valid add-on form data', () => {
      const validData = {
        sku: 'test_addon',
        label: 'Test Add-On Service',
        category: 'cleaning' as const,
        unit_type: 'sqft' as const,
        rate: 10.5,
        min_qty: 100,
        default_frequency: 'monthly' as const,
        frequency_options: ['monthly' as const, 'quarterly' as const],
        amortize_to_monthly: true,
        default_qty_source: 'manual',
        active: true,
        show_in_proposals: true,
        description: 'Test description',
        notes: 'Internal notes',
      };

      const result = addonFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid SKU format', () => {
      const invalidData = {
        sku: 'Invalid SKU!', // Contains spaces and special chars
        label: 'Test Add-On',
        unit_type: 'sqft',
        rate: 10,
        min_qty: 0,
        default_frequency: 'monthly',
        frequency_options: ['monthly'],
        amortize_to_monthly: false,
        default_qty_source: 'manual',
        active: true,
      };

      const result = addonFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('sku');
      }
    });

    it('should reject negative rate', () => {
      const invalidData = {
        sku: 'test_addon',
        label: 'Test Add-On',
        unit_type: 'sqft',
        rate: -5, // Negative rate
        min_qty: 0,
        default_frequency: 'monthly',
        frequency_options: ['monthly'],
        amortize_to_monthly: false,
        default_qty_source: 'manual',
        active: true,
      };

      const result = addonFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('rate');
      }
    });

    it('should reject empty frequency_options array', () => {
      const invalidData = {
        sku: 'test_addon',
        label: 'Test Add-On',
        unit_type: 'sqft',
        rate: 10,
        min_qty: 0,
        default_frequency: 'monthly',
        frequency_options: [], // Empty array
        amortize_to_monthly: false,
        default_qty_source: 'manual',
        active: true,
      };

      const result = addonFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields as undefined', () => {
      const minimalData = {
        sku: 'test_addon',
        label: 'Test Add-On',
        unit_type: 'sqft' as const,
        rate: 10,
        min_qty: 0,
        default_frequency: 'monthly' as const,
        frequency_options: ['monthly' as const],
        amortize_to_monthly: false,
        default_qty_source: 'manual',
        active: true,
        // category, description, notes, show_in_proposals are optional
      };

      const result = addonFormSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe('addonFormSchemaWithRefinements', () => {
    it('should enforce default_frequency is in frequency_options', () => {
      const invalidData = {
        sku: 'test_addon',
        label: 'Test Add-On',
        unit_type: 'sqft' as const,
        rate: 10,
        min_qty: 0,
        default_frequency: 'annual' as const,
        frequency_options: ['monthly' as const, 'quarterly' as const], // Missing 'annual'
        amortize_to_monthly: false,
        default_qty_source: 'manual',
        active: true,
      };

      const result = addonFormSchemaWithRefinements.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('default_frequency');
      }
    });

    it('should pass when default_frequency is in frequency_options', () => {
      const validData = {
        sku: 'test_addon',
        label: 'Test Add-On',
        unit_type: 'sqft' as const,
        rate: 10,
        min_qty: 0,
        default_frequency: 'monthly' as const,
        frequency_options: ['monthly' as const, 'quarterly' as const],
        amortize_to_monthly: false,
        default_qty_source: 'manual',
        active: true,
      };

      const result = addonFormSchemaWithRefinements.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('addonFiltersSchema', () => {
    it('should validate valid filter data', () => {
      const validFilters = {
        search: 'carpet',
        category: 'cleaning' as const,
        active: true,
        show_in_proposals: true,
      };

      const result = addonFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('should allow all fields to be optional', () => {
      const emptyFilters = {};
      const result = addonFiltersSchema.safeParse(emptyFilters);
      expect(result.success).toBe(true);
    });
  });
});







