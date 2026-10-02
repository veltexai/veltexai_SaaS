import { z } from 'zod';

export const siteWorkPackageSchema = z.object({
  propertyId: z.string().uuid(),
  status: z.enum(['scoping', 'walkthrough_scheduled', 'estimated', 'proposed', 'accepted', 'declined']),
  walkthroughId: z.string().uuid().nullable().optional(),
  proposalId: z.string().uuid().nullable().optional(),
  lossReasonId: z.string().uuid().nullable().optional(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
}).superRefine((value, context) => {
  if (value.status === 'walkthrough_scheduled' && !value.walkthroughId) {
    context.addIssue({ code: 'custom', path: ['walkthroughId'], message: 'A walkthrough is required.' });
  }
  if (['proposed', 'accepted'].includes(value.status) && !value.proposalId) {
    context.addIssue({ code: 'custom', path: ['proposalId'], message: 'A linked proposal is required.' });
  }
  if (value.status === 'declined' && !value.lossReasonId) {
    context.addIssue({ code: 'custom', path: ['lossReasonId'], message: 'A loss reason is required.' });
  }
});
