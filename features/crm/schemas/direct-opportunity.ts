import { z } from 'zod';

export const directOpportunitySchema = z.object({
  opportunityId: z.string().uuid(),
  leadId: z.string().uuid(),
  customerId: z.string().uuid(),
  propertyId: z.string().uuid().nullable().optional(),
  pipelineId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  ownerUserId: z.string().uuid().optional(),
  estimatorUserId: z.string().uuid().nullable().optional(),
});
