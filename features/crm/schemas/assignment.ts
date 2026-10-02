import { z } from 'zod';

export const opportunityAssignmentSchema = z.object({
  ownerUserId: z.string().uuid(),
  estimatorUserId: z.string().uuid().optional().nullable(),
  transferOpenTasks: z.boolean().default(false),
});
