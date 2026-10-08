import { z } from 'zod';

export const customerActionIssueSchema = z.object({
  purpose: z.enum(['review_proposal', 'respond_proposal', 'accept_proposal']),
  expiresInDays: z.union([z.literal(1), z.literal(3), z.literal(7)]),
  designatedApproverEmail: z.string().trim().email().max(320).nullable().optional(),
}).strict();

export const customerActionRevokeSchema = z.object({
  reason: z.string().trim().min(1).max(240),
}).strict();

export const customerActionExchangeSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();

export const customerProposalResponseSchema = z.object({
  kind: z.enum(['question', 'change_requested', 'declined']),
  message: z.string().trim().min(1).max(2000),
  displayName: z.string().trim().min(1).max(160).nullable().optional(),
}).strict();

export const customerProposalAcceptanceSchema = z.object({
  selectedAssociationIds: z.array(z.string().uuid()).min(1).max(100),
  signerEnteredName: z.string().trim().min(1).max(160),
  signerEnteredEmail: z.string().trim().email().max(320),
}).strict().superRefine((value, context) => {
  if (new Set(value.selectedAssociationIds).size !== value.selectedAssociationIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['selectedAssociationIds'],
      message: 'Association IDs must be unique.' });
  }
});
