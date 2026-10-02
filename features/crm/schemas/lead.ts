import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const quickAddLeadSchema = z.object({
  customerName: optionalText(200),
  contactName: optionalText(200),
  email: z.string().trim().email().max(320).optional().nullable(),
  phone: optionalText(40),
  propertyName: optionalText(200),
  serviceLocation: optionalText(500),
  assignedToUserId: z.string().uuid().optional().nullable(),
  duplicateDecision: z.enum(['create_new', 'link_existing']).optional(),
  linkedEntityId: z.string().uuid().optional().nullable(),
}).superRefine((value, ctx) => {
  if (!value.customerName && !value.contactName && !value.email && !value.phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Add a customer, contact, email, or phone.',
      path: ['contactName'],
    });
  }
  if (value.duplicateDecision === 'link_existing' && !value.linkedEntityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Choose the existing record to link.',
      path: ['linkedEntityId'],
    });
  }
});

export type QuickAddLeadInput = z.infer<typeof quickAddLeadSchema>;

