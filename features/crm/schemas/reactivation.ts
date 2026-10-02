import { z } from 'zod';

export const reactivationSchema = z.object({
  name: z.string().trim().min(1).max(200).optional().nullable(),
});
