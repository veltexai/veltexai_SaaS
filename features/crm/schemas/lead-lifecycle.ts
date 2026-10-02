import { z } from 'zod';
export const leadLifecycleSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('contacted') }),
  z.object({ action: z.literal('junk'), note: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal('merged'), mergedIntoLeadId: z.string().uuid() }),
  z.object({ action: z.literal('disqualified'), lossReasonId: z.string().uuid() }),
]);
