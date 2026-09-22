import { getService as getV1Service } from '../v1/catalog';
import { CATALOG_VERSION, DEFAULT_COSTS, JobType, CatalogJob, serviceRecordSchema } from './schema';

const common = {
  version: CATALOG_VERSION, effectiveDate: '2026-09-22' as const,
  legacyServiceType: 'residential' as const,
  propertyTypes: ['house', 'apartment', 'condo', 'townhouse'],
  unit: 'square_feet' as const,
  quantityGuidance: 'Use cleanable interior area; verify room counts and walkthrough condition. Hours are person-hours, not elapsed crew time.',
  strategy: 'residential_labor_v2' as const,
  defaultCosts: DEFAULT_COSTS,
  approval: 'operator_review_required' as const,
  compliance: { regulatedPricing: false as const, capabilityReview: 'Confirm access, insurance and ordinary cleaning capability. Stop for sharps, bodily fluids, mold remediation or other hazardous material.' },
  exclusions: ['Regulated, biohazard and mold remediation', 'Construction debris and pest remediation', 'Exterior or high-access work', 'Heavy furniture moving', 'Appliance interiors unless selected'],
  options: ['Appliance interiors (count each appliance)', 'Additional labor after walkthrough review'],
  responsibilities: ['Provide safe access, running water and electricity', 'Secure pets and valuables', 'Identify delicate surfaces and existing damage', 'Approve scope or price changes before work'],
  terms: 'Service dates and payment timing must be agreed before work. Scope changes require a revised agreement. No automatic renewal for one-time jobs.',
};
const homeScope = ['Dust reachable surfaces', 'Vacuum and mop accessible floors', 'Clean kitchen counters, sink and appliance exteriors', 'Clean bathrooms, fixtures and mirrors', 'Empty ordinary household trash'];
const definitions = [
  { id: 'recurring_standard', segment: 'residential', family: 'home_cleaning', label: 'Recurring standard home cleaning', frequencies: ['weekly', 'bi-weekly', '1x-month'], production: { min: 350, base: 500, max: 650 }, inclusions: homeScope },
  { id: 'standard', segment: 'residential', family: 'home_cleaning', label: 'One-time standard home cleaning', frequencies: ['one-time'], production: { min: 300, base: 450, max: 600 }, inclusions: homeScope },
  { id: 'first_deep', segment: 'residential', family: 'home_cleaning', label: 'First visit / deep clean', frequencies: ['one-time'], production: { min: 180, base: 280, max: 380 }, inclusions: [...homeScope, 'Hand-wipe reachable baseboards, cabinet fronts, doors and light switches', 'Clean reachable window sills, tracks, blinds and vent covers'] },
  { id: 'move_in_out', segment: 'residential', family: 'home_cleaning', label: 'Move-in / move-out', frequencies: ['one-time'], production: { min: 180, base: 300, max: 420 }, inclusions: [...homeScope, 'Clean empty cabinet and drawer interiors', 'Detail vacant rooms and reachable baseboards'] },
  { id: 'airbnb_turnover', segment: 'short_term_rental', family: 'rental_turnover', label: 'Vacation rental turnover service agreement', frequencies: ['one-time'], production: { min: 250, base: 400, max: 550 }, inclusions: [...homeScope, 'Reset beds with available clean linens'] },
];
export const CATALOG = definitions.map(d => serviceRecordSchema.parse({ ...common, ...d,
  questionKeys: ['squareFeet', 'bedrooms', 'bathrooms', 'occupancy', 'condition', 'pets', 'applianceInteriors', 'access', 'suppliesProvided', ...(d.id === 'airbnb_turnover' ? ['turnover'] : [])],
}));
export function getService(id: JobType, version: string = CATALOG_VERSION) {
  if (version === '2026-09-22.1') return getV1Service(id);
  const service = CATALOG.find(s => s.id === id);
  if (!service) throw new Error('Unsupported service');
  return service;
}
export function defaultJob(id: JobType = 'recurring_standard'): CatalogJob {
  return {
    initialClean: id === 'recurring_standard', catalogVersion: CATALOG_VERSION, jobType: id, segment: getService(id).segment,
    frequency: id === 'recurring_standard' ? 'bi-weekly' : 'one-time',
    propertyType: 'house', squareFeet: 1500, bedrooms: 3, bathrooms: 2, occupancy: ['move_in_out', 'airbnb_turnover'].includes(id) ? 'vacant' : 'occupied',
    levels: 1, hardFloorPercent: 50, clutter: 'normal', monthsSinceClean: 1, occupants: 2,
    condition: 'normal', pets: false, applianceInteriors: 0, access: '', suppliesProvided: false,
    regulatedHazards: false, costs: { ...DEFAULT_COSTS }, operatorNotes: '',
    ...(id === 'airbnb_turnover' ? { turnover: { nextDay: false, expectedTurns: 4, beds: 3, linenPar: 2, restockList: '', reportWithinHours: 24, checkout: '11:00', checkin: '16:00', laundryLoads: 0, restocking: false, inspection: true, damageDocumentation: true } } : {}),
  };
}

// Read-only legacy mapping. Never infer a new pricing strategy for an old record.
export function adaptLegacy(serviceType: string, scopeTemplateId?: string) {
  const legacy = ['commercial', 'residential', 'carpet', 'window', 'floor'];
  if (!legacy.includes(serviceType)) throw new Error('Unknown legacy service type');
  const templateJobs: Record<string, JobType> = {
    residential_recurring: 'recurring_standard', residential_deep_clean: 'first_deep',
    residential_premium_detail: 'first_deep', move_out_turnover: 'move_in_out',
  };
  return { legacyServiceType: serviceType, segment: serviceType === 'commercial' ? 'commercial' : serviceType === 'residential' ? 'residential' : 'specialty',
    jobType: scopeTemplateId ? templateJobs[scopeTemplateId] ?? null : null,
    legacyScopeTemplateId: scopeTemplateId ?? null, catalogVersion: null, strategy: 'legacy' as const };
}
