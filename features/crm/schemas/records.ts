import { z } from 'zod';

const expectedUpdatedAt = z.string().datetime({ offset: true }).optional().nullable();
export const customerRecordSchema = z.object({
  expectedUpdatedAt,
  customerType: z.enum(['commercial', 'household']),
  name: z.string().trim().min(1).max(200),
});
export const contactRecordSchema = z.object({
  expectedUpdatedAt,
  firstName: z.string().trim().optional().nullable(), lastName: z.string().trim().optional().nullable(),
  email: z.string().trim().email().max(320).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  preferredChannel: z.enum(['email', 'phone', 'sms']).optional().nullable(),
  timezone: z.string().trim().max(80).optional().nullable(),
  doNotContact: z.boolean().default(false),
  doNotContactReason: z.string().trim().max(500).optional().nullable(),
}).superRefine((value, context) => {
  if (![value.firstName, value.lastName, value.email, value.phone].some((item) => item?.trim())) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['firstName'], message: 'Provide a name, email, or phone.' });
  }
  if (value.doNotContact && !value.doNotContactReason?.trim()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['doNotContactReason'], message: 'Explain the do-not-contact status.' });
  }
});
export const propertyRecordSchema = z.object({
  expectedUpdatedAt, customerId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1).max(200),
  addressLine1: z.string().trim().optional().nullable(), addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(), region: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(), countryCode: z.string().regex(/^[A-Z]{2}$/).default('US'),
  timezone: z.string().trim().max(80).optional().nullable(), ownerName: z.string().trim().optional().nullable(),
});

export const accountBundleSchema = z.object({
  customerId: z.string().uuid(), contactId: z.string().uuid(), propertyId: z.string().uuid(),
  customerType: z.enum(['commercial', 'household']), customerName: z.string().trim().min(1).max(200),
  contactFirstName: z.string().trim().optional().nullable(), contactLastName: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email().max(320).optional().nullable(),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  propertyName: z.string().trim().min(1).max(200), addressLine1: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(), region: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(), timezone: z.string().trim().max(80).optional().nullable(),
}).superRefine((value, context) => {
  if (!value.contactFirstName && !value.contactLastName && !value.contactEmail && !value.contactPhone) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['contactFirstName'], message: 'Provide contact details.' });
  }
  if (new Set([value.customerId, value.contactId, value.propertyId]).size !== 3) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['customerId'], message: 'Record identifiers must be distinct.' });
  }
});
