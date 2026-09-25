import { z } from 'zod';
import { globalInputsSchema, proposalFormSchema, type ProposalFormData } from '@/features/proposals/schemas/proposal';
import { getService } from './catalog';
import { estimateJob, estimateInitialClean, money } from './pricing';
import { jobSchema } from './schema';

export const catalogRequestSchema = z.object({
  job: jobSchema, client: globalInputsSchema,
  templateId: z.string().uuid().optional(),
  proposalId: z.string().uuid().optional(),
});
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const plain = (s: string) => s.replace(/[<>`#*\[\]\\]/g, '').replace(/\n/g, ' ');
export function composeCatalogProposal(input: unknown): ProposalFormData {
  const { job, client, templateId } = catalogRequestSchema.parse(input);
  const service = getService(job.jobType, job.catalogVersion);
  const estimate = estimateJob(job);
  const perTurn = job.catalogVersion !== '2026-09-22.1' && Boolean(job.turnover);
  const storedAmount = job.catalogVersion === '2026-09-22.1' ? estimate.periodPrice : estimate.selectedPrice;
  const initialPrice = estimateInitialClean(job)?.selectedPrice;
  if (job.scopeOmissions?.some(line => !service.inclusions.includes(line))) throw new z.ZodError([{ code: 'custom', path: ['scopeOmissions'], message: 'Choose scope items from this catalog version.' }]);
  const inclusions = service.inclusions.filter(line => !job.scopeOmissions?.includes(line));
  if (job.applianceInteriors) inclusions.push(`${job.applianceInteriors} appliance interiors`);
  if (job.turnover) {
    if (job.turnover.laundryLoads) inclusions.push(`${job.turnover.laundryLoads} laundry loads; machine availability and cycle timing must be confirmed`);
    if (job.turnover.restocking) inclusions.push('Restock from customer-provided inventory');
    if (job.turnover.inspection) inclusions.push('Complete departure inspection checklist');
    if (job.turnover.damageDocumentation) inclusions.push('Document visible damage for the host; no warranty of hidden-damage detection');
  }
  const excluded = service.exclusions.filter(s => !(job.applianceInteriors && s.startsWith('Appliance interiors')));
  if (job.turnover && !job.turnover.laundryLoads) excluded.push('Laundry; host supplies clean linens');
  const frequency = perTurn ? 'Per turn' : { 'one-time': 'One-time service', weekly: 'Weekly', 'bi-weekly': 'Every two weeks', '1x-month': 'Monthly' }[job.frequency];
  const scopeRows = inclusions.map(area => ({ area, frequency, notes: '' }));
  const pricingLineItems = [{ kind: 'service', amount: estimate.selectedPrice, basis: perTurn ? 'per_turn' : job.frequency === 'one-time' ? 'one_time' : 'per_visit' }, ...(initialPrice === undefined ? [] : [{ kind: 'initial_clean', amount: initialPrice, basis: 'one_time_replaces_first_visit' }])];
  const pricingTable = { rows: [{ service: service.label, frequency: frequency, pricePerMonth: usd(estimate.selectedPrice) }, ...(initialPrice === undefined ? [] : [{ service: 'Initial detailed clean (replaces first visit)', frequency: 'Once', pricePerMonth: usd(initialPrice) }])], summary: { label: initialPrice === undefined ? 'Service price before any applicable tax' : 'Ongoing visit price (initial clean shown separately)', subtotal: usd(estimate.selectedPrice), tax: 'Not assessed', total: usd(estimate.selectedPrice) } };
  const content = `## Cover letter
${job.coverLetter ? plain(job.coverLetter) : `We propose the following service: ${service.label.toLowerCase()} for ${plain(client.client_name)} at ${plain(client.service_location)}.`} Please review the scope and service agreement below.

## Scope of service
Service schedule: ${frequency}.
\`\`\`veliz_scope_table
${JSON.stringify({ rows: scopeRows })}
\`\`\`

Property: ${job.propertyType}; ${job.squareFeet} cleanable square feet, ${job.bedrooms} bedrooms, ${job.bathrooms} bathrooms; ${job.occupancy}${job.pets ? ', pets present' : ''}.
${job.scheduling ? `Scheduling: ${plain(job.scheduling)}` : ''}
${job.scopeAdditions ? `Additional agreed scope: ${plain(job.scopeAdditions)}` : ''}
${job.turnover ? `Turnover window: ${job.turnover.checkout} checkout to ${job.turnover.checkin} check-in, ${job.turnover.nextDay ? 'next day' : 'same day'}.${perTurn ? ` Expected turns per month: ${job.turnover.expectedTurns ?? 4}. Beds: ${job.turnover.beds ?? job.bedrooms}; linen par: ${job.turnover.linenPar ?? 2}. Visible damage and photo report within ${job.turnover.reportWithinHours ?? 24} hours after service. ${job.turnover.restocking ? `Restock list: ${plain(job.turnover.restockList || 'Agree inventory checklist before service')}.` : ''}` : ''}` : ''}
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

Your price: ${usd(estimate.selectedPrice)} ${perTurn ? 'per turn' : 'per visit'}.${job.frequency !== 'one-time' || perTurn ? ` Estimated monthly budget: ${usd(estimate.periodPrice)}; actual billing depends on visits completed. Confirm actual billing schedule in writing.` : ' This is a one-time job total.'}
${initialPrice !== undefined ? `Initial detailed clean: ${usd(initialPrice)} once, before the ongoing recurring visits. Includes reachable baseboards, cabinet fronts, doors, switches, sills, tracks, blinds and vent covers. Initial clean replaces the first standard visit; monthly estimates cover ongoing visits only.` : ''}
Taxes are not assessed in this estimate; confirm applicability before acceptance.

## Terms & Conditions
${perTurn ? 'This is a per-turn service agreement. Each turn must be booked and confirmed; same-day capacity is subject to the agreed window and linen availability. Host supplies consumables and spare linens. Report lost property and visible damage promptly; no hidden-damage inspection is included.' : job.jobType === 'recurring_standard' ? 'Service continues on the agreed recurring schedule until cancelled. Please give at least 48 hours notice to cancel, skip or reschedule a visit. If safe access is unavailable, contact us to reschedule. Any cancellation or lockout fee must be agreed in writing before the first visit.' : 'Service dates and payment timing must be agreed before work. Scope changes require a revised agreement. No automatic renewal for one-time jobs.'}
${job.operatorNotes.trim() ? `Additional agreed terms: ${plain(job.operatorNotes)}` : ''}

## Acceptance
Customer signature: ____________________ Date: __________

${plain(job.companyName || 'Cleaning company')} signature: ____________________ Date: __________

Confirm the scope, scheduling, taxes and payment terms before signing.`;
  return proposalFormSchema.parse({
    title: `${service.label} proposal`, service_type: service.legacyServiceType, template_id: templateId,
    global_inputs: { ...client, facility_size: job.squareFeet, service_frequency: job.frequency },
    service_specific_data: { catalogJob: job, catalogSnapshot: service, estimateSnapshot: estimate, pricingLineItems, priceBasis: job.catalogVersion === '2026-09-22.1' && job.frequency !== 'one-time' ? 'monthly' : pricingLineItems[0].basis,
      home_type: job.propertyType, bedrooms: job.bedrooms, bathrooms: job.bathrooms, pets: job.pets,
      cleaning_supplies_provided: job.suppliesProvided },
    pricing_enabled: true,
    // Existing renderers use midpoint as the selected price. Scenario ranges live
    // separately in the immutable estimate snapshot, never as a midpoint quote.
    pricing_data: { price_range: { low: storedAmount, high: storedAmount },
      hours_estimate: { min: money(estimate.low.laborHours * estimate.visitsPerMonth), max: money(estimate.high.laborHours * estimate.visitsPerMonth) },
      assumptions: { labor_rate: job.costs.wage * (1 + job.costs.burdenPercent / 100), overhead_percentage: job.costs.overheadPercent,
        margin_percentage: job.costs.marginPercent, production_rate: { min: service.production.min, max: service.production.max } } },
    generated_content: content, status: 'draft',
    facility_details: { building_type: job.propertyType },
    service_scope: { areas_included: inclusions, areas_excluded: excluded, special_notes: job.operatorNotes },
  });
}

export function isCatalogProposal(data: { service_specific_data?: unknown; catalog_document?: boolean }) {
  if (data.catalog_document === true) return true;
  const value = data.service_specific_data;
  return Boolean(value && typeof value === 'object' && 'catalogJob' in value);
}

/** JSONB object key order is not a user edit; array order remains meaningful. */
const canonicalJson = (value: unknown) => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

/** Called at both save boundaries: never trust a client quote or snapshot. */
export function normalizeCatalogProposal(data: ProposalFormData, existing?: ProposalFormData): ProposalFormData {
  if (!isCatalogProposal(data)) return data;
  if (existing && isCatalogProposal(existing)) {
    if (data.service_specific_data.catalogJob.catalogVersion !== existing.service_specific_data.catalogJob.catalogVersion) throw new z.ZodError([{ code: 'custom', path: ['service_specific_data', 'catalogJob', 'catalogVersion'], message: 'Create a new proposal to change catalog version.' }]);
    if (canonicalJson(data.service_specific_data.catalogJob) === canonicalJson(existing.service_specific_data.catalogJob) && canonicalJson(data.global_inputs) === canonicalJson(existing.global_inputs) && data.template_id === existing.template_id) return { ...existing, status: data.status };
  }
  if (data.service_specific_data.catalogJob.demo) throw new z.ZodError([{ code: 'custom', path: ['service_specific_data', 'catalogJob', 'demo'], message: 'Sample jobs cannot be saved. Start a real job.' }]);
  const composed = composeCatalogProposal({ job: data.service_specific_data.catalogJob, client: data.global_inputs, templateId: data.template_id });
  return { ...composed, status: data.status };
}

export function catalogAnalytics(data: { service_specific_data?: unknown }) {
  if (!isCatalogProposal(data)) return {};
  const raw = data.service_specific_data as Record<string, unknown>;
  const parsed = jobSchema.safeParse(raw.catalogJob);
  if (!parsed.success) return {};
  return { flow: 'catalog', business_segment: parsed.data.segment, service_family: getService(parsed.data.jobType).family,
    job_type: parsed.data.jobType, catalog_version: parsed.data.catalogVersion, operator_override: Boolean(parsed.data.override), price_basis: parsed.data.catalogVersion === '2026-09-22.1' && parsed.data.frequency !== 'one-time' ? 'monthly' : parsed.data.turnover && parsed.data.catalogVersion !== '2026-09-22.1' ? 'per_turn' : parsed.data.frequency === 'one-time' ? 'one_time' : 'per_visit', initial_clean: Boolean(parsed.data.initialClean) };
}
