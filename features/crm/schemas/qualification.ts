import { z } from 'zod';

export const qualificationSchema = z.object({
  responseId: z.string().uuid(),
  outcome: z.enum(['fit', 'not_fit', 'needs_review']),
  operatorNotes: z.string().trim().max(5000).default(''),
  specialistReview: z.boolean().default(false),
  lossReasonId: z.string().uuid().optional().nullable(),
}).superRefine((value, context) => {
  if (value.outcome === 'not_fit' && !value.lossReasonId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['lossReasonId'], message: 'Choose a disqualification reason.' });
  }
});
