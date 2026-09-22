import { z } from 'zod';

export const CATALOG_VERSION = '2026-09-22.2' as const;
export const segmentSchema = z.enum(['commercial', 'residential', 'short_term_rental', 'specialty']);
export const jobTypeSchema = z.enum(['recurring_standard', 'standard', 'first_deep', 'move_in_out', 'airbnb_turnover']);
export const frequencySchema = z.enum(['one-time', 'weekly', 'bi-weekly', '1x-month']);
const amount = z.number().finite().min(0).max(100000);
export const costAssumptionsSchema = z.object({
  roundingIncrement: z.number().min(0.01).max(100).optional(),
  crewSize: z.number().int().min(1).max(30),
  wage: amount,
  burdenPercent: z.number().finite().min(0).max(100),
  supplies: amount,
  equipment: amount,
  travel: amount,
  minimumCharge: amount,
  overheadPercent: z.number().finite().min(0).max(100),
  marginPercent: z.number().finite().min(0).max(80),
  uncertaintyPercent: z.number().finite().min(0).max(75),
  laborHours: z.number().finite().positive().max(1000).optional(),
}).strict();
export const DEFAULT_COSTS: z.infer<typeof costAssumptionsSchema> = {
  roundingIncrement: 5, crewSize: 2, wage: 25, burdenPercent: 25, supplies: 12, equipment: 5,
  travel: 20, minimumCharge: 120, overheadPercent: 15, marginPercent: 25,
  uncertaintyPercent: 20,
};
export const businessProfileSchema = z.object({
  markets: z.array(segmentSchema).min(1).max(4),
  services: z.array(jobTypeSchema).max(5),
  costs: costAssumptionsSchema,
  equipment: z.array(z.string().trim().min(1).max(120)).max(30),
}).strict().superRefine((p, ctx) => {
  if (p.services.some(s => s !== 'airbnb_turnover') && !p.markets.includes('residential'))
    ctx.addIssue({ code: 'custom', path: ['services'], message: 'Residential services require the residential market.' });
  if (p.services.includes('airbnb_turnover') && !p.markets.includes('short_term_rental'))
    ctx.addIssue({ code: 'custom', path: ['services'], message: 'Turnover requires the short-term-rental market.' });
});
export const jobSchema = z.object({
  catalogVersion: z.enum(['2026-09-22.1', CATALOG_VERSION]),
  segment: segmentSchema,
  jobType: jobTypeSchema,
  frequency: frequencySchema,
  propertyType: z.enum(['house', 'apartment', 'condo', 'townhouse']),
  squareFeet: z.number().finite().min(100).max(20000),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().finite().min(0.5).max(20),
  occupancy: z.enum(['occupied', 'vacant']),
  condition: z.enum(['light', 'normal', 'heavy']),
  pets: z.boolean(),
  applianceInteriors: z.number().int().min(0).max(10),
  access: z.string().trim().max(1000),
  initialClean: z.boolean().optional(),
  scheduling: z.string().max(1000).optional(),
  scopeOmissions: z.array(z.string().max(300)).max(30).optional(),
  scopeAdditions: z.string().max(4000).optional(),
  coverLetter: z.string().max(2000).optional(),
  companyName: z.string().max(200).optional(),
  demo: z.boolean().optional(),
  levels: z.number().int().min(1).max(10).optional(),
  hardFloorPercent: z.number().min(0).max(100).optional(),
  clutter: z.enum(['light', 'normal', 'heavy']).optional(),
  monthsSinceClean: z.number().min(0).max(120).optional(),
  occupants: z.number().int().min(0).max(30).optional(),
  suppliesProvided: z.boolean(),
  regulatedHazards: z.literal(false, { errorMap: () => ({ message: 'Regulated or hazardous work is outside Release 1.' }) }),
  turnover: z.object({
    nextDay: z.boolean().optional(),
    expectedTurns: z.number().int().min(1).max(60).optional(),
    beds: z.number().int().min(0).max(40).optional(),
    linenPar: z.number().min(1).max(10).optional(),
    restockList: z.string().max(1000).optional(),
    reportWithinHours: z.number().min(1).max(48).optional(),
    checkout: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    checkin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    laundryLoads: z.number().int().min(0).max(30),
    restocking: z.boolean(),
    inspection: z.boolean(),
    damageDocumentation: z.boolean(),
  }).strict().optional(),
  costs: costAssumptionsSchema,
  override: z.object({ pricePerVisit: amount.positive(), reason: z.string().trim().min(5).max(1000) }).strict().optional(),
  operatorNotes: z.string().max(4000),
}).strict().superRefine((job, ctx) => {
  if (job.costs.wage === 0 && (job.suppliesProvided || job.costs.supplies === 0) && job.costs.equipment === 0 && job.costs.travel === 0 && job.costs.minimumCharge === 0)
    ctx.addIssue({ code: 'custom', path: ['costs'], message: 'Enter a positive labor cost, visit cost or minimum charge before pricing.' });
  for (const key of ['scheduling', 'operatorNotes', 'scopeAdditions', 'coverLetter', 'companyName'] as const) {
    if (job[key] && /(?:lockbox|gate|alarm|entry|door|access|key|pin|code)/i.test(job[key]!))
      ctx.addIssue({ code: 'custom', path: [key], message: 'Keep access and entry details in internal access notes only.' });
  }
  if (job.turnover?.restockList && /lockbox|gate|alarm|entry|access|code/i.test(job.turnover.restockList)) ctx.addIssue({ code: 'custom', path: ['turnover', 'restockList'], message: 'Keep entry details in internal access notes only.' });
  const turnover = job.jobType === 'airbnb_turnover';
  if (job.segment !== (turnover ? 'short_term_rental' : 'residential'))
    ctx.addIssue({ code: 'custom', path: ['segment'], message: 'Choose a job type supported by this market.' });
  if (turnover !== Boolean(job.turnover))
    ctx.addIssue({ code: 'custom', path: ['turnover'], message: 'Turnover details are required only for rental turnover.' });
  if (job.turnover && !job.turnover.nextDay && job.turnover.checkin <= job.turnover.checkout)
    ctx.addIssue({ code: 'custom', path: ['turnover', 'checkin'], message: 'Choose next-day check-in, or a later same-day check-in time.' });
  if (job.jobType === 'recurring_standard' ? job.frequency === 'one-time' : job.frequency !== 'one-time')
    ctx.addIssue({ code: 'custom', path: ['frequency'], message: 'Recurring standard needs a recurring frequency; other packs are priced per job.' });
  if (job.jobType === 'move_in_out' && job.occupancy !== 'vacant')
    ctx.addIssue({ code: 'custom', path: ['occupancy'], message: 'Move-in/out assumes a vacant property.' });
});
export type CatalogJob = z.infer<typeof jobSchema>;
export type BusinessProfile = z.infer<typeof businessProfileSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;

export const serviceRecordSchema = z.object({
  version: z.literal(CATALOG_VERSION), id: jobTypeSchema, segment: segmentSchema,
  family: z.enum(['home_cleaning', 'rental_turnover']), label: z.string(),
  legacyServiceType: z.literal('residential'),
  propertyTypes: z.array(z.string()), unit: z.literal('square_feet'),
  quantityGuidance: z.string(), frequencies: z.array(frequencySchema),
  production: z.object({ min: z.number().positive(), base: z.number().positive(), max: z.number().positive() }),
  defaultCosts: costAssumptionsSchema,
  questionKeys: z.array(z.string()), strategy: z.literal('residential_labor_v2'),
  inclusions: z.array(z.string()), exclusions: z.array(z.string()), options: z.array(z.string()),
  responsibilities: z.array(z.string()), terms: z.string(),
  compliance: z.object({ regulatedPricing: z.literal(false), capabilityReview: z.string() }),
  approval: z.literal('operator_review_required'), effectiveDate: z.literal('2026-09-22'),
});
