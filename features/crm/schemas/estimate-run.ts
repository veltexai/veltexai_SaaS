import { z } from 'zod';
import { jobSchema } from '@/features/service-catalog/versions/v2/schema';

const finite = z.number().finite();
const scenarioSchema = z.object({ laborHours: finite, elapsedCrewHours: finite, labor: finite,
  supplies: finite, equipment: finite, travel: finite, directCost: finite, overhead: finite,
  cost: finite, marginAmount: finite, minimumAdjustment: finite, suggestedPrice: finite }).strict();
export const estimateOutputSchema = z.object({
  version: z.literal('2026-09-22.2'), strategy: z.string().min(1), unit: z.literal('per_visit'),
  low: scenarioSchema, base: scenarioSchema, high: scenarioSchema, selectedPrice: finite.positive(),
  locationPricing: z.unknown().optional(),
  drivers: z.object({ squareFeetPerPersonHour: finite.positive(), roomMinimumHours: finite,
    conditionMultiplier: finite, recurrenceMultiplier: finite, additionalHours: finite }).strict(),
  modeledHours: finite, visitsPerMonth: finite.positive(), periodPrice: finite,
  effectiveMarginPercent: finite, warnings: z.array(z.string()),
}).strict();

export const estimateRunSchema = z.object({
  propertyId: z.string().uuid(),
  workPackageId: z.string().uuid().nullable().optional(),
  expectedPackageUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  selectedScenario: z.enum(['low', 'base', 'high', 'override']),
  pricingBasis: z.enum(['per_visit', 'per_turn', 'one_time', 'monthly']),
  job: jobSchema,
}).strict().superRefine((value, context) => {
  if (Boolean(value.workPackageId) !== Boolean(value.expectedPackageUpdatedAt)) {
    context.addIssue({ code: 'custom', path: ['expectedPackageUpdatedAt'],
      message: 'A package concurrency token is required exactly when a package is selected.' });
  }
  if (value.selectedScenario === 'override' && !value.job.override) {
    context.addIssue({ code: 'custom', path: ['selectedScenario'],
      message: 'An override scenario requires an operator override and reason.' });
  }
  if (value.selectedScenario !== 'override' && value.job.override) {
    context.addIssue({ code: 'custom', path: ['selectedScenario'],
      message: 'Select override when an operator price is present.' });
  }
});

export type EstimateRunInput = z.infer<typeof estimateRunSchema>;
