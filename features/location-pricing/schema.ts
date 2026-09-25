import { z } from 'zod';

export const PRICING_DATASET_VERSION = 'us-location-2026-09-25.1' as const;

export const locationPricingSnapshotSchema = z.object({
  enabled: z.boolean(),
  datasetVersion: z.literal(PRICING_DATASET_VERSION),
  countryCode: z.literal('US'),
  stateCode: z.string().regex(/^[A-Z]{2}$/),
  marketCode: z.string().trim().min(1).max(40),
  marketName: z.string().trim().min(1).max(160),
  resolution: z.enum(['metro', 'nonmetro', 'state', 'national']),
  occupationCode: z.enum(['37-2011', '37-2012']),
  occupationLabel: z.string().trim().min(1).max(160),
  wageBenchmark: z.number().finite().positive().max(250),
  wageStatistic: z.enum(['median', 'mean']),
  legalWageFloor: z.number().finite().min(0).max(100),
  regionalPriceParity: z.number().finite().min(50).max(200),
  mileageRate: z.number().finite().min(0).max(5),
  routeMiles: z.number().finite().min(0).max(2000),
  paidTravelHours: z.number().finite().min(0).max(100),
  applyNonLaborIndex: z.boolean(),
  confidence: z.enum(['A', 'B', 'C', 'D']),
  sources: z.array(z.object({
    agency: z.enum(['BLS', 'BEA', 'DOL', 'IRS', 'CENSUS', 'OPERATOR']),
    title: z.string().trim().min(1).max(240),
    url: z.string().url(),
    vintage: z.string().trim().min(1).max(40),
    retrievedAt: z.string().datetime(),
  }).strict()).min(1).max(12),
}).strict();

export type LocationPricingSnapshot = z.infer<typeof locationPricingSnapshotSchema>;

