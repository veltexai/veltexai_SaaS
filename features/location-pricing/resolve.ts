import { locationPricingSnapshotSchema, type LocationPricingSnapshot } from './schema';
import { nationalFallback } from './benchmarks';

export type MarketBenchmark = Omit<LocationPricingSnapshot, 'enabled' | 'routeMiles' | 'paidTravelHours' | 'applyNonLaborIndex'>;

/**
 * Deterministic, offline resolver. Published benchmark rows are supplied by the
 * versioned data store; the estimate path never calls a public dataset.
 */
export function resolveLocationPricing(args: {
  stateCode: string;
  occupationCode: '37-2011' | '37-2012';
  metroCode?: string;
  nonmetroCode?: string;
  routeMiles?: number;
  paidTravelHours?: number;
  applyNonLaborIndex?: boolean;
  markets: readonly MarketBenchmark[];
  now?: string;
}): LocationPricingSnapshot {
  const requested = [args.metroCode, args.nonmetroCode].filter(Boolean);
  const exact = args.markets.find(market => requested.includes(market.marketCode) && market.occupationCode === args.occupationCode);
  const state = args.markets.find(market => market.resolution === 'state' && market.stateCode === args.stateCode && market.occupationCode === args.occupationCode);
  const selected = exact ?? state;
  if (!selected) return nationalFallback({
    stateCode: args.stateCode,
    occupationCode: args.occupationCode,
    routeMiles: args.routeMiles,
    paidTravelHours: args.paidTravelHours,
    now: args.now,
  });
  return locationPricingSnapshotSchema.parse({
    ...selected,
    enabled: true,
    routeMiles: args.routeMiles ?? 0,
    paidTravelHours: args.paidTravelHours ?? 0,
    applyNonLaborIndex: args.applyNonLaborIndex ?? false,
  });
}

