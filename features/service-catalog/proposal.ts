import { z } from 'zod';
import { globalInputsSchema, proposalFormSchema, type ProposalFormData } from '@/features/proposals/schemas/proposal';
import { getService } from './catalog';
import { estimateJob, money } from './pricing';
import { jobSchema } from './schema';

export const catalogRequestSchema = z.object({
  job: jobSchema, client: globalInputsSchema,
  templateId: z.string().uuid().optional(),
  proposalId: z.string().uuid().optional(),
});
const usd = (n: number) => `$${n.toFixed(2)}`;
const plain = (s: string) => s.replace(/[<>`#*\[\]\\]/g, '').replace(/\n/g, ' ');
export function composeCatalogProposal(input: unknown): ProposalFormData {
  const { job, client, templateId } = catalogRequestSchema.parse(input);
  const service = getService(job.jobType);
  const estimate = estimateJob(job);
  const inclusions = [...service.inclusions];
  if (job.applianceInteriors) inclusions.push(`${job.applianceInteriors} appliance interiors`);
  if (job.turnover) {
    if (job.turnover.laundryLoads) inclusions.push(`${job.turnover.laundryLoads} laundry loads; machine availability and cycle timing must be confirmed`);
    if (job.turnover.restocking) inclusions.push('Restock from customer-provided inventory');
    if (job.turnover.inspection) inclusions.push('Complete departure inspection checklist');
    if (job.turnover.damageDocumentation) inclusions.push('Document visible damage for the host; no warranty of hidden-damage detection');
  }
  const excluded = service.exclusions.filter(s => !(job.applianceInteriors && s.startsWith('Appliance interiors')));
  if (job.turnover && !job.turnover.laundryLoads) excluded.push('Laundry; host supplies clean linens');
  const frequency = { 'one-time': 'One-time service', weekly: 'Weekly', 'bi-weekly': 'Every two weeks', '1x-month': 'Monthly' }[job.frequency];
  const scopeRows = inclusions.map(area => ({ area, frequency, notes: '' }));
  const pricingTable = { rows: [{ service: service.label, frequency: job.frequency === 'one-time' ? frequency : `${frequency}; monthly planning total`, pricePerMonth: usd(estimate.periodPrice) }], summary: { subtotal: usd(estimate.periodPrice), tax: 'Not assessed', total: usd(estimate.periodPrice) } };
  const content = `## Cover letter
We propose ${service.label.toLowerCase()} for ${plain(client.client_name)} at ${plain(client.service_location)}. This scope and suggested price are subject to operator review and customer acceptance.

## Scope of service
\`\`\`veliz_scope_table
${JSON.stringify({ rows: scopeRows })}
\`\`\`

Property: ${job.propertyType}; ${job.squareFeet} cleanable square feet, ${job.bedrooms} bedrooms, ${job.bathrooms} bathrooms; ${job.occupancy}, ${job.condition} condition${job.pets ? ', pets present' : ''}.
Access: ${plain(job.access)}.
${job.turnover ? `Turnover window: ${job.turnover.checkout} checkout to ${job.turnover.checkin} check-in, same day. Confirm machine cycle time and staffing before accepting this window.` : ''}
${job.suppliesProvided ? 'Customer provides approved cleaning supplies.' : 'Ordinary cleaning supplies are included.'}

### Exclusions
${excluded.map(s => `- ${s}`).join('\n')}

### Optional services
${service.options.map(s => `- ${s}; agree scope and price before adding work.`).join('\n')}

### Customer responsibilities
${service.responsibilities.map(s => `- ${s}`).join('\n')}

## Service Quote & Pricing
\`\`\`veliz_pricing_table
${JSON.stringify(pricingTable)}
\`\`\`

Suggested price: ${usd(estimate.selectedPrice)} per visit.${job.frequency !== 'one-time' ? ` Monthly planning amount: ${usd(estimate.periodPrice)}, based on ${estimate.visitsPerMonth.toFixed(3)} average visits per month. Confirm actual billing schedule in writing.` : ' This is a one-time job total.'}
Taxes are not assessed in this estimate; confirm applicability before acceptance. No price is guaranteed by Veltex AI.

## Terms & Conditions
${service.terms}
Operator notes: ${plain(job.operatorNotes) || 'No additional terms specified.'}

## Acceptance
Customer signature: ____________________ Date: __________

Operator signature: ____________________ Date: __________
Confirm the scope, scheduling, taxes and payment terms before signing.`;
  return proposalFormSchema.parse({
    title: `${service.label} proposal`, service_type: service.legacyServiceType, template_id: templateId,
    global_inputs: { ...client, facility_size: job.squareFeet, service_frequency: job.frequency },
    service_specific_data: { catalogJob: job, catalogSnapshot: service, estimateSnapshot: estimate,
      home_type: job.propertyType, bedrooms: job.bedrooms, bathrooms: job.bathrooms, pets: job.pets,
      cleaning_supplies_provided: job.suppliesProvided },
    pricing_enabled: true,
    // Existing renderers use midpoint as the selected price. Scenario ranges live
    // separately in the immutable estimate snapshot, never as a midpoint quote.
    pricing_data: { price_range: { low: estimate.periodPrice, high: estimate.periodPrice },
      hours_estimate: { min: money(estimate.low.laborHours * estimate.visitsPerMonth), max: money(estimate.high.laborHours * estimate.visitsPerMonth) },
      assumptions: { labor_rate: job.costs.wage * (1 + job.costs.burdenPercent / 100), overhead_percentage: job.costs.overheadPercent,
        margin_percentage: job.costs.marginPercent, production_rate: { min: service.production.min, max: service.production.max } } },
    generated_content: content, status: 'draft',
    facility_details: { building_type: job.propertyType },
    service_scope: { areas_included: inclusions, areas_excluded: excluded, special_notes: job.operatorNotes },
  });
}

export function isCatalogProposal(data: { service_specific_data?: unknown }) {
  const value = data.service_specific_data;
  return Boolean(value && typeof value === 'object' && 'catalogJob' in value);
}

/** Called at both save boundaries: never trust a client quote or snapshot. */
export function normalizeCatalogProposal(data: ProposalFormData): ProposalFormData {
  if (!isCatalogProposal(data)) return data;
  const composed = composeCatalogProposal({ job: data.service_specific_data.catalogJob, client: data.global_inputs, templateId: data.template_id });
  return { ...composed, status: data.status };
}

export function catalogAnalytics(data: { service_specific_data?: unknown }) {
  if (!isCatalogProposal(data)) return {};
  const raw = data.service_specific_data as Record<string, unknown>;
  const parsed = jobSchema.safeParse(raw.catalogJob);
  if (!parsed.success) return {};
  return { flow: 'catalog', business_segment: parsed.data.segment, service_family: getService(parsed.data.jobType).family,
    job_type: parsed.data.jobType, catalog_version: parsed.data.catalogVersion, operator_override: Boolean(parsed.data.override) };
}
