import { PRICING_DATASET_VERSION, type LocationPricingSnapshot } from './schema';

export const OFFICIAL_SOURCES = {
  bls: 'https://www.bls.gov/OES/current/oessrcma.htm',
  blsNational: 'https://www.bls.gov/news.release/ocwage.t01.htm',
  bea: 'https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area',
  dol: 'https://www.dol.gov/agencies/whd/mw-consolidated',
  irs: 'https://www.irs.gov/tax-professionals/standard-mileage-rates',
  census: 'https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html',
} as const;

export const NATIONAL_WAGES = {
  '37-2011': { value: 17.71, label: 'Janitors and cleaners, except maids and housekeeping cleaners' },
  '37-2012': { value: 17.07, label: 'Maids and housekeeping cleaners' },
} as const;

// Effective July 1, 2026. Local ordinances may be higher and require confirmation.
export const STATE_MINIMUM_WAGES_2026_07: Readonly<Record<string, number>> = {
  AL: 7.25, AK: 14, AZ: 15.15, AR: 11, CA: 16.90, CO: 15.16, CT: 16.94,
  DE: 15, DC: 18.40, FL: 14, GA: 7.25, HI: 16, ID: 7.25, IL: 15,
  IN: 7.25, IA: 7.25, KS: 7.25, KY: 7.25, LA: 7.25, ME: 15.10,
  MD: 15, MA: 15, MI: 13.73, MN: 11.41, MS: 7.25, MO: 15, MT: 10.85,
  NE: 15, NV: 12, NH: 7.25, NJ: 15.92, NM: 12, NY: 16, NC: 7.25,
  ND: 7.25, OH: 11, OK: 7.25, OR: 15.55, PA: 7.25, RI: 16, SC: 7.25,
  SD: 11.85, TN: 7.25, TX: 7.25, UT: 7.25, VT: 14.42, VA: 12.77,
  WA: 17.13, WV: 8.75, WI: 7.25, WY: 7.25,
};

export const CURRENT_IRS_MILEAGE_RATE = 0.76;

export function nationalFallback(args: {
  stateCode: string;
  occupationCode: keyof typeof NATIONAL_WAGES;
  routeMiles?: number;
  paidTravelHours?: number;
  now?: string;
}): LocationPricingSnapshot {
  const wage = NATIONAL_WAGES[args.occupationCode];
  const retrievedAt = args.now ?? new Date().toISOString();
  return {
    enabled: true,
    datasetVersion: PRICING_DATASET_VERSION,
    countryCode: 'US',
    stateCode: args.stateCode,
    marketCode: 'US-NATIONAL',
    marketName: 'United States national fallback',
    resolution: 'national',
    occupationCode: args.occupationCode,
    occupationLabel: wage.label,
    wageBenchmark: wage.value,
    wageStatistic: 'median',
    legalWageFloor: STATE_MINIMUM_WAGES_2026_07[args.stateCode] ?? 7.25,
    regionalPriceParity: 100,
    mileageRate: CURRENT_IRS_MILEAGE_RATE,
    routeMiles: args.routeMiles ?? 0,
    paidTravelHours: args.paidTravelHours ?? 0,
    applyNonLaborIndex: false,
    confidence: 'D',
    sources: [
      { agency: 'BLS', title: 'May 2025 national occupational wage estimates', url: OFFICIAL_SOURCES.blsNational, vintage: '2025-05', retrievedAt },
      { agency: 'DOL', title: 'Consolidated state minimum wage table', url: OFFICIAL_SOURCES.dol, vintage: '2026-07-01', retrievedAt },
      { agency: 'IRS', title: 'Business standard mileage rate', url: OFFICIAL_SOURCES.irs, vintage: '2026-07-01', retrievedAt },
    ],
  };
}

