/**
 * Formatting utilities for add-ons display
 */

import { FrequencyType, UnitType, UNIT_TYPE_LABELS, FREQUENCY_LABELS } from '../types';

/**
 * Format currency amount
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format unit type with rate
 */
export function formatPricing(rate: number, unitType: UnitType): string {
  return `${formatCurrency(rate)} / ${UNIT_TYPE_LABELS[unitType]}`;
}

/**
 * Format frequency label
 */
export function formatFrequency(frequency: FrequencyType): string {
  return FREQUENCY_LABELS[frequency];
}

/**
 * Format frequency options as comma-separated list
 */
export function formatFrequencyOptions(frequencies: FrequencyType[]): string {
  return frequencies.map((f) => FREQUENCY_LABELS[f]).join(', ');
}

/**
 * Generate SKU from label
 * Converts label to lowercase, replaces spaces/special chars with underscores
 */
export function generateSkuFromLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * Calculate monthly amount based on frequency and amortization
 */
export function calculateMonthlyAmount(
  subtotal: number,
  frequency: FrequencyType,
  amortize: boolean
): number | null {
  if (!amortize) return null;

  switch (frequency) {
    case 'monthly':
      return subtotal;
    case 'quarterly':
      return Math.round((subtotal / 3) * 100) / 100;
    case 'annual':
      return Math.round((subtotal / 12) * 100) / 100;
    case 'one_time':
      return null;
    default:
      return null;
  }
}

/**
 * Format boolean as Yes/No
 */
export function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}










