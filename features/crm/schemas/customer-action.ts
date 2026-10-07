import { z } from 'zod';

export const customerActionIssueSchema = z.object({
  purpose: z.enum(['review_proposal', 'respond_proposal', 'accept_proposal']),
  expiresInDays: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  designatedApproverEmail: z.string().trim().email().max(320).nullable().optional(),
}).strict();

export const customerActionRevokeSchema = z.object({
  reason: z.string().trim().min(1).max(240),
}).strict();

