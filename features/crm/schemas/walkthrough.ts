import { z } from 'zod';

export const scheduleWalkthroughSchema = z.object({
  propertyId: z.string().uuid(),
  estimatorUserId: z.string().uuid(),
  siteContactId: z.string().uuid().optional().nullable(),
  windowStart: z.string().datetime({ offset: true }),
  windowEnd: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(1).max(80),
}).superRefine((value, ctx) => {
  if (new Date(value.windowEnd).getTime() <= new Date(value.windowStart).getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windowEnd'], message: 'End must be after start.' });
  }
});

export type ScheduleWalkthroughInput = z.infer<typeof scheduleWalkthroughSchema>;

export const rescheduleWalkthroughSchema = z.object({
  windowStart: z.string().datetime({ offset: true }),
  windowEnd: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(1).max(80),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
}).superRefine((value, ctx) => {
  if (new Date(value.windowEnd).getTime() <= new Date(value.windowStart).getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['windowEnd'], message: 'End must be after start.' });
  }
});

export const cancelWalkthroughSchema = z.object({
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});
