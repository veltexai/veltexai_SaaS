import type { z } from 'zod';
import type { costAssumptionsSchema } from '@/features/service-catalog/versions/v2/schema';
import { locationPricingSnapshotSchema, type LocationPricingSnapshot } from './schema';

type Costs = z.infer<typeof costAssumptionsSchema>;

export function applyLocationPricing(costs: Costs, snapshotInput?: LocationPricingSnapshot) {
  if (!snapshotInput?.enabled) return {
    costs,
    applied: false as const,
    explanation: undefined,
  };
  const snapshot = locationPricingSnapshotSchema.parse(snapshotInput);
  const wageFloor = Math.max(snapshot.wageBenchmark, snapshot.legalWageFloor);
  const wage = Math.max(costs.wage, wageFloor);
  const nonLaborIndex = snapshot.applyNonLaborIndex ? snapshot.regionalPriceParity / 100 : 1;
  const loadedTravelLabor = snapshot.paidTravelHours * wage * (1 + costs.burdenPercent / 100);
  const vehicleTravel = snapshot.routeMiles * snapshot.mileageRate;
  return {
    applied: true as const,
    costs: {
      ...costs,
      wage,
      supplies: costs.supplies * nonLaborIndex,
      equipment: costs.equipment * nonLaborIndex,
      travel: costs.travel + vehicleTravel + loadedTravelLabor,
    },
    explanation: {
      marketName: snapshot.marketName,
      resolution: snapshot.resolution,
      confidence: snapshot.confidence,
      operatorWage: costs.wage,
      benchmarkWage: snapshot.wageBenchmark,
      legalWageFloor: snapshot.legalWageFloor,
      selectedWage: wage,
      regionalPriceParity: snapshot.regionalPriceParity,
      nonLaborIndexApplied: snapshot.applyNonLaborIndex,
      vehicleTravel,
      paidTravelLabor: loadedTravelLabor,
      sourceVintages: snapshot.sources.map(source => `${source.agency}:${source.vintage}`),
      datasetVersion: snapshot.datasetVersion,
    },
  };
}

