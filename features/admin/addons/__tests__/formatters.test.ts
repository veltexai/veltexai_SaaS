/**
 * Unit Tests for Add-Ons Formatters
 */
import {
  formatCurrency,
  formatPricing,
  formatFrequency,
  formatFrequencyOptions,
  generateSkuFromLabel,
  calculateMonthlyAmount,
  formatBoolean,
  truncate,
} from '../utils/formatters';

describe('Add-Ons Formatters', () => {
  describe('formatCurrency', () => {
    it('should format currency with 2 decimal places', () => {
      expect(formatCurrency(10.5)).toBe('$10.50');
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-10.5)).toBe('-$10.50');
    });
  });

  describe('formatPricing', () => {
    it('should format pricing with unit type', () => {
      expect(formatPricing(10.5, 'sqft')).toBe('$10.50 / Square Foot');
      expect(formatPricing(8, 'pane')).toBe('$8.00 / Window Pane');
      expect(formatPricing(35, 'visit')).toBe('$35.00 / Visit');
      expect(formatPricing(50, 'hour')).toBe('$50.00 / Hour');
      expect(formatPricing(100, 'flat')).toBe('$100.00 / Flat Rate');
    });
  });

  describe('formatFrequency', () => {
    it('should format frequency labels', () => {
      expect(formatFrequency('one_time')).toBe('One Time');
      expect(formatFrequency('monthly')).toBe('Monthly');
      expect(formatFrequency('quarterly')).toBe('Quarterly');
      expect(formatFrequency('annual')).toBe('Annual');
    });
  });

  describe('formatFrequencyOptions', () => {
    it('should format array of frequencies as comma-separated list', () => {
      expect(formatFrequencyOptions(['monthly', 'quarterly'])).toBe('Monthly, Quarterly');
      expect(formatFrequencyOptions(['one_time', 'annual'])).toBe('One Time, Annual');
    });
  });

  describe('generateSkuFromLabel', () => {
    it('should convert label to lowercase and replace spaces with underscores', () => {
      expect(generateSkuFromLabel('Carpet Cleaning')).toBe('carpet_cleaning');
      expect(generateSkuFromLabel('Window Washing Service')).toBe('window_washing_service');
    });

    it('should remove special characters', () => {
      expect(generateSkuFromLabel('Test & Service!')).toBe('test_service');
      expect(generateSkuFromLabel('Service (Premium)')).toBe('service_premium');
    });

    it('should remove leading/trailing underscores', () => {
      expect(generateSkuFromLabel('  Test Service  ')).toBe('test_service');
      expect(generateSkuFromLabel('---Test---')).toBe('test');
    });

    it('should handle empty or special-char-only strings', () => {
      expect(generateSkuFromLabel('!!!')).toBe('');
      expect(generateSkuFromLabel('')).toBe('');
    });
  });

  describe('calculateMonthlyAmount', () => {
    it('should return null if amortize is false', () => {
      expect(calculateMonthlyAmount(100, 'monthly', false)).toBeNull();
      expect(calculateMonthlyAmount(100, 'annual', false)).toBeNull();
    });

    it('should return subtotal for monthly frequency', () => {
      expect(calculateMonthlyAmount(100, 'monthly', true)).toBe(100);
    });

    it('should divide by 3 for quarterly frequency', () => {
      expect(calculateMonthlyAmount(300, 'quarterly', true)).toBe(100);
      expect(calculateMonthlyAmount(100, 'quarterly', true)).toBe(33.33);
    });

    it('should divide by 12 for annual frequency', () => {
      expect(calculateMonthlyAmount(1200, 'annual', true)).toBe(100);
      expect(calculateMonthlyAmount(100, 'annual', true)).toBe(8.33);
    });

    it('should return null for one_time frequency', () => {
      expect(calculateMonthlyAmount(100, 'one_time', true)).toBeNull();
    });

    it('should round to 2 decimal places', () => {
      expect(calculateMonthlyAmount(100, 'quarterly', true)).toBe(33.33);
      expect(calculateMonthlyAmount(1000, 'annual', true)).toBe(83.33);
    });
  });

  describe('formatBoolean', () => {
    it('should format boolean as Yes/No', () => {
      expect(formatBoolean(true)).toBe('Yes');
      expect(formatBoolean(false)).toBe('No');
    });
  });

  describe('truncate', () => {
    it('should truncate text longer than max length', () => {
      expect(truncate('This is a long text', 10)).toBe('This is...');
    });

    it('should not truncate text shorter than max length', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('should handle exact max length', () => {
      expect(truncate('Exact', 5)).toBe('Exact');
    });
  });
});









