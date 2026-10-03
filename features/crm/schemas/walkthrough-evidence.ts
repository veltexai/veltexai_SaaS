import { z } from 'zod';

export const walkthroughEvidenceSchema = z.object({
  expectedUpdatedAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().min(1).max(5000),
  markComplete: z.boolean(),
});

export type WalkthroughEvidenceInput = z.infer<typeof walkthroughEvidenceSchema>;

