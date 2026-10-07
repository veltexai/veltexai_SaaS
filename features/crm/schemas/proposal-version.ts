import { z } from 'zod';

const uuid = z.string().uuid();
const optionalDisplay = z.string().trim().max(500).optional();

const proposalVersionV1RequestSchema = z.object({
  proposalId: uuid,
  propertyId: uuid,
  estimateRunId: uuid,
  workPackageId: uuid.nullable().optional(),
  expectedPackageUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict().superRefine((value, context) => {
  if (value.workPackageId && !value.expectedPackageUpdatedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedPackageUpdatedAt'],
      message: 'The current package version is required.',
    });
  }
  if (!value.workPackageId && value.expectedPackageUpdatedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expectedPackageUpdatedAt'],
      message: 'A package version cannot be supplied without a package.',
    });
  }
});

const proposalPackageReferenceSchema = z.object({
  workPackageId: uuid,
  expectedPackageUpdatedAt: z.string().datetime({ offset: true }),
}).strict();

const proposalVersionV2RequestSchema = z.object({
  schemaVersion: z.literal('crm_proposal_version.v2'),
  proposalId: uuid,
  propertyId: uuid,
  packages: z.array(proposalPackageReferenceSchema).min(1).max(100),
}).strict().superRefine((value, context) => {
  const packageIds = value.packages.map((item) => item.workPackageId);
  if (new Set(packageIds).size !== packageIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['packages'],
      message: 'Each package may be included only once.',
    });
  }
});

// The unversioned v1 request remains exact and strict. R3-4.1 adds a separately
// discriminated v2 request so legacy bytes can never be reinterpreted.
export const proposalVersionRequestSchema = z.union([
  proposalVersionV1RequestSchema,
  proposalVersionV2RequestSchema,
]);

const displayIdentitySchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  address: optionalDisplay,
  phone: optionalDisplay,
  email: optionalDisplay,
  website: optionalDisplay,
}).strict();

const customerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  company: optionalDisplay,
  email: optionalDisplay,
  phone: optionalDisplay,
}).strict();

const serviceLocationSchema = z.object({
  name: optionalDisplay,
  address: z.string().trim().min(1).max(500),
  city: optionalDisplay,
  state: optionalDisplay,
  postalCode: optionalDisplay,
}).strict();

const serviceSchema = z.object({
  type: z.string().trim().min(1).max(120),
  frequency: z.string().trim().min(1).max(120),
  summary: optionalDisplay,
}).strict();

const pricingSchema = z.object({
  amountMinor: z.number().int().nonnegative().safe(),
  currency: z.literal('USD'),
  basis: z.enum(['per_visit', 'per_turn', 'one_time']),
  initialCleanAmountMinor: z.number().int().nonnegative().safe().optional(),
  unitLabel: optionalDisplay,
}).strict();

const templateSchema = z.object({
  id: z.string().trim().min(1).max(200),
  rendererVersion: z.literal('release1-markdown.v1'),
}).strict();

const provenanceSchema = z.object({
  proposalId: uuid,
  opportunityId: uuid,
  propertyId: uuid,
  workPackageId: uuid.nullable(),
  estimateRunId: uuid,
}).strict();

export const proposalVersionSnapshotSchema = z.object({
  schemaVersion: z.literal('crm_proposal_version.v1'),
  title: z.string().trim().min(1).max(240),
  introduction: z.string().trim().max(5000).optional(),
  organization: displayIdentitySchema,
  customer: customerSchema,
  serviceLocation: serviceLocationSchema,
  service: serviceSchema,
  scopeLines: z.array(z.string().trim().min(1).max(1000)).max(500),
  exclusions: z.array(z.string().trim().min(1).max(1000)).max(500).optional(),
  assumptions: z.array(z.string().trim().min(1).max(1000)).max(500).optional(),
  terms: z.array(z.string().trim().min(1).max(2000)).max(200).optional(),
  pricing: pricingSchema,
  template: templateSchema,
  provenance: provenanceSchema,
}).strict();

export type ProposalVersionSnapshot = z.infer<typeof proposalVersionSnapshotSchema>;
