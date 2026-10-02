import { z } from 'zod';

export const stageTransitionSchema = z.object({
  stageId: z.string().uuid(),
  lossReasonId: z.string().uuid().optional().nullable(),
  manualWinReason: z.string().trim().min(1).max(1000).optional().nullable(),
});

export type StageTransitionInput = z.infer<typeof stageTransitionSchema>;
