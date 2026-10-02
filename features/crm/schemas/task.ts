import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(240),
  dueAt: z.string().datetime({ offset: true }).optional().nullable(),
  timezone: z.string().trim().min(1).max(80).optional().nullable(),
  assigneeUserId: z.string().uuid(),
});

export const taskCommandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('complete') }),
  z.object({ action: z.literal('snooze'), snoozedUntil: z.string().datetime({ offset: true }) }),
]);
