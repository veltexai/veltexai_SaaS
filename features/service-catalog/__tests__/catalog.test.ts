import { CATALOG, adaptLegacy, defaultJob } from '../catalog';
import { businessProfileSchema, jobSchema } from '../schema';
import { estimateJob } from '../pricing';
import { catalogAnalytics, composeCatalogProposal, normalizeCatalogProposal } from '../proposal';
import { catalogDocumentText } from '../document';
import { SCOPE_TEMPLATE_IDS, getScopeTemplate, getScopeTemplateServiceType } from '@/features/proposals/quick/constants/scope-templates';

const client = { client_name: 'Sample', client_email: 'sample@example.com', contact_phone: '555-0100', service_location: 'Test property', facility_size: 1500, service_frequency: 'one-time' };
const valid = (id: Parameters<typeof defaultJob>[0] = 'standard') => ({ ...defaultJob(id), access: 'Safe access and parking confirmed' });
it.each(CATALOG.map(s => s.id))('round trips %s with version, selected price and full scope', id => {
  const p = composeCatalogProposal({ job: valid(id), client });
  expect(p.service_type).toBe('residential');
  expect(normalizeCatalogProposal(JSON.parse(JSON.stringify(p)))).toEqual(p);
  const content = catalogDocumentText(p.generated_content!);
  expect(content).toContain('Customer responsibilities');
  expect(content).toContain('Acceptance');
  expect(content).not.toContain('```');
  expect(p.pricing_data!.price_range!.low).toBe(p.service_specific_data.estimateSnapshot.selectedPrice);
  expect(p.service_specific_data.catalogSnapshot.version).toBe(p.service_specific_data.catalogJob.catalogVersion);
});
it.each(['light', 'normal', 'heavy'] as const)('produces ordered finite scenarios for %s', condition => {
  for (const pack of CATALOG) {
    const result = estimateJob({ ...valid(pack.id), condition });
    expect(result.low.suggestedPrice).toBeLessThanOrEqual(result.base.suggestedPrice);
    expect(result.base.suggestedPrice).toBeLessThanOrEqual(result.high.suggestedPrice);
    expect(Number.isFinite(result.periodPrice)).toBe(true);
  }
});
it('calculates burden, overhead and margin rather than markup', () => {
  const job = valid(); job.costs = { ...job.costs, laborHours: 4, wage: 20, burdenPercent: 25, supplies: 10, equipment: 5, travel: 10, overheadPercent: 20, marginPercent: 25, minimumCharge: 0 };
  const quote = estimateJob(job);
  expect(quote.base).toMatchObject({ labor: 100, directCost: 125, overhead: 25, cost: 150, suggestedPrice: 200, elapsedCrewHours: 2 });
  expect(estimateJob({ ...job, costs: { ...job.costs, crewSize: 4 } }).base).toMatchObject({ labor: 100, elapsedCrewHours: 1 });
});
it('honors minimum, customer supplies and override without changing scenario price', () => {
  const job = valid(); job.suppliesProvided = true; job.costs.minimumCharge = 1000;
  job.override = { pricePerVisit: 1, reason: 'Operator test override' };
  const quote = estimateJob(job);
  expect(quote.base.supplies).toBe(0); expect(quote.base.suggestedPrice).toBe(1000);
  expect(quote.selectedPrice).toBe(1); expect(quote.warnings).toContain('Operator price is below modeled cost.');
});
it('monthly values count average visits exactly once and one-time stays a job total', () => {
  const recurring = estimateJob(valid('recurring_standard'));
  expect(recurring.periodPrice).toBe(Math.round(recurring.selectedPrice * 26 / 12 * 100) / 100);
  const one = estimateJob(valid()); expect(one.periodPrice).toBe(one.selectedPrice);
});
it('flags constrained turnovers and laundry without hiding extra labor', () => {
  const job = valid('airbnb_turnover'); job.turnover = { ...job.turnover!, checkout: '11:00', checkin: '12:00', laundryLoads: 3 };
  const quote = estimateJob(job);
  expect(quote.warnings.some(w => w.includes('exceeds the turnover window'))).toBe(true);
  expect(quote.warnings.some(w => w.includes('machine capacity'))).toBe(true);
});
it.each([
  { segment: 'commercial' }, { frequency: 'daily' }, { regulatedHazards: true },
  { squareFeet: Infinity }, { bedrooms: -1 }, { catalogVersion: 'future' },
  { override: { pricePerVisit: 100, reason: '' } }, { turnover: { checkout: '11:00', checkin: '10:00' } },
])('rejects invalid job: %j', bad => expect(jobSchema.safeParse({ ...valid(), ...bad }).success).toBe(false));
it('rejects invalid costs including NaN and 100% margin', () => {
  expect(() => estimateJob({ ...valid(), costs: { ...valid().costs, wage: NaN } })).toThrow();
  expect(() => estimateJob({ ...valid(), costs: { ...valid().costs, marginPercent: 100 } })).toThrow();
  expect(() => estimateJob({ ...valid(), costs: { ...valid().costs, wage: 0, supplies: 0, equipment: 0, travel: 0, minimumCharge: 0 } })).toThrow();
});
it('blocks mismatched business profile markets and services', () => {
  expect(businessProfileSchema.safeParse({ markets: ['commercial'], services: ['airbnb_turnover'], costs: valid().costs, equipment: [] }).success).toBe(false);
});
it.each(['commercial', 'residential', 'carpet', 'window', 'floor'])('preserves legacy %s with no catalog repricing', service => {
  const adapted = adaptLegacy(service); expect(adapted.legacyServiceType).toBe(service); expect(adapted.catalogVersion).toBeNull(); expect(adapted.strategy).toBe('legacy');
});
it.each(SCOPE_TEMPLATE_IDS)('preserves quick template %s', id => {
  const type = getScopeTemplateServiceType(getScopeTemplate(id));
  expect(adaptLegacy(type, id)).toMatchObject({ legacyServiceType: type, legacyScopeTemplateId: id, strategy: 'legacy' });
});
it('server normalization replaces forged price/content/snapshot', () => {
  const original = composeCatalogProposal({ job: valid(), client });
  const tampered = { ...original, pricing_data: { price_range: { low: 1, high: 1 } }, generated_content: 'Perfect bid', service_specific_data: { ...original.service_specific_data, catalogSnapshot: { version: 'fake' } } };
  expect(normalizeCatalogProposal(tampered)).toEqual(original);
});
it('analytics includes taxonomy without customer data or override reason', () => {
  const p = composeCatalogProposal({ job: { ...valid(), override: { pricePerVisit: 200, reason: 'Private reason' } }, client });
  expect(catalogAnalytics(p)).toMatchObject({ business_segment: 'residential', operator_override: true });
  expect(JSON.stringify(catalogAnalytics(p))).not.toMatch(/Sample|sample@example|Private reason|Test property/);
});
