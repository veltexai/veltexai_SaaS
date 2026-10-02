import { z } from 'zod';

export const pipelineStageConfigurationSchema = z.object({
  label: z.string().trim().min(1).max(120),
  category: z.enum([
    'new', 'qualifying', 'walkthrough', 'estimating', 'proposing', 'negotiating',
    'won', 'handed_off', 'lost', 'disqualified', 'nurture',
  ]),
  position: z.number().int().min(0),
  hidden: z.boolean().default(false),
  pipelineName: z.string().trim().min(1).max(120).optional(),
}).superRefine((value, context) => {
  if (value.hidden && ['won', 'lost', 'disqualified'].includes(value.category)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hidden'],
      message: 'Won, lost, and disqualified stages must remain visible.',
    });
  }
});
