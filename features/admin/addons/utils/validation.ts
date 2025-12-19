/**
 * Zod validation schemas for add-ons
 */

import { z } from 'zod';

export const unitTypeSchema = z.enum(['sqft', 'pane', 'visit', 'hour', 'flat'], {
  required_error: 'Unit type is required',
});

export const frequencyTypeSchema = z.enum(['one_time', 'monthly', 'quarterly', 'annual'], {
  required_error: 'Frequency is required',
});

export const categorySchema = z.enum(['cleaning', 'maintenance', 'specialty', 'seasonal', 'other']).optional();

/**
 * Main add-on form schema
 */
export const addonFormSchema = z.object({
  sku: z
    .string()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU must be less than 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'SKU must contain only lowercase letters, numbers, underscores, and hyphens'),
  label: z
    .string()
    .min(3, 'Label must be at least 3 characters')
    .max(100, 'Label must be less than 100 characters'),
  category: categorySchema,
  unit_type: unitTypeSchema,
  rate: z
    .number({
      required_error: 'Rate is required',
      invalid_type_error: 'Rate must be a number',
    })
    .positive('Rate must be greater than 0')
    .finite('Rate must be a valid number'),
  min_qty: z
    .number({
      required_error: 'Minimum quantity is required',
      invalid_type_error: 'Minimum quantity must be a number',
    })
    .nonnegative('Minimum quantity cannot be negative')
    .finite('Minimum quantity must be a valid number'),
  default_frequency: frequencyTypeSchema,
  frequency_options: z
    .array(frequencyTypeSchema)
    .min(1, 'At least one frequency option is required')
    .refine(
      (options) => {
        // Ensure default_frequency is included in frequency_options
        return options.length > 0;
      },
      { message: 'Frequency options must include at least one option' }
    ),
  amortize_to_monthly: z.boolean().default(false),
  default_qty_source: z.string().min(1, 'Default quantity source is required'),
  active: z.boolean().default(true),
  show_in_proposals: z.boolean().optional().default(true),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

/**
 * Refine schema to ensure default_frequency is in frequency_options
 */
export const addonFormSchemaWithRefinements = addonFormSchema.refine(
  (data) => {
    return data.frequency_options.includes(data.default_frequency);
  },
  {
    message: 'Default frequency must be one of the selected frequency options',
    path: ['default_frequency'],
  }
);

/**
 * Type inference
 */
export type AddonFormSchemaType = z.infer<typeof addonFormSchema>;
export type AddonFormDataType = z.infer<typeof addonFormSchemaWithRefinements>;

/**
 * Filter schema for querying add-ons
 */
export const addonFiltersSchema = z.object({
  search: z.string().optional(),
  category: categorySchema,
  active: z.boolean().optional(),
  show_in_proposals: z.boolean().optional(),
});

export type AddonFiltersSchemaType = z.infer<typeof addonFiltersSchema>;






