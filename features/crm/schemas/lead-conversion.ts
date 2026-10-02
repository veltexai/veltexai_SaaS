import { z } from 'zod';

export const leadConversionSchema = z.object({
  pipelineId: z.string().uuid(),
  opportunityName: z.string().trim().min(1).max(200),
  segment: z.enum(['commercial', 'residential', 'turnover', 'specialty']),
  existingCustomerId: z.string().uuid().optional().nullable(),
  existingContactId: z.string().uuid().optional().nullable(),
  existingPropertyId: z.string().uuid().optional().nullable(),
});

export type LeadConversionInput = z.infer<typeof leadConversionSchema>;
