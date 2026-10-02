import { z } from 'zod';

export const opportunityDetailsSchema = z.object({
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(1).max(200),
  serviceFamily: z.string().trim().max(120).optional().nullable(),
  expectedCloseDate: z.string().date().optional().nullable(),
  valueAmountMinor: z.number().int().min(0).optional().nullable(),
  valueBasis: z.enum(['one_time', 'per_visit', 'weekly', 'monthly', 'annual']).optional().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional().nullable(),
  nextActionDueAt: z.string().datetime({ offset: true }).optional().nullable(),
}).superRefine((value, context) => {
  const pricing = [value.valueAmountMinor, value.valueBasis, value.currency];
  const present = pricing.filter((item) => item !== null && item !== undefined).length;
  if (present !== 0 && present !== 3) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['valueAmountMinor'],
      message: 'Value amount, basis, and currency must be supplied together.' });
  }
});
