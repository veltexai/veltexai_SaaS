import * as z from 'zod';

// Phone number validation with international support
const phoneRegex = /^[+]?[1-9]\d{1,14}$/;

// URL validation with better error messages
const urlSchema = z
  .string()
  .optional()
  .transform((val) => (val === '' ? null : val))
  .refine(
    (val) => {
      if (!val) return true;
      try {
        new URL(val);
        return val.startsWith('http://') || val.startsWith('https://');
      } catch {
        return false;
      }
    },
    {
      message: 'Please enter a valid URL starting with http:// or https://',
    }
  )
  .nullable();

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  
  company_name: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
  
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Please enter a valid international phone number'),
  
  website: urlSchema,
  
  logo_url: z.string().url('Invalid logo URL').optional().or(z.literal('')),
  
  company_background: z
    .string()
    .min(50, 'Company background must be at least 50 characters')
    .max(1000, 'Company background must be less than 1000 characters'),
});

export type ProfileFormData = z.infer<typeof profileSchema>;