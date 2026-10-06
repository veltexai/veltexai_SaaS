import { proposalVersionSnapshotSchema, type ProposalVersionSnapshot } from './schemas/proposal-version';

type JsonObject = Record<string, unknown>;

export type ProposalVersionSource = {
  proposal: {
    id: string;
    title: string;
    client_name: string;
    client_email: string;
    client_company: string | null;
    contact_phone: string;
    service_location: string;
    service_type: string;
    service_frequency: string;
    service_scope: unknown;
    template_id: string | null;
  };
  companyProfile: { company_name: string; contact_info: unknown } | null;
  customer: { name: string };
  property: {
    name: string;
    address_line_1: string | null;
    address_line_2: string | null;
    city: string | null;
    region: string | null;
    postal_code: string | null;
  };
  estimate: {
    id: string;
    selected_amount_minor: number;
    currency: string;
    pricing_basis: string;
  };
  opportunityId: string;
  propertyId: string;
  workPackageId: string | null;
};

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function display(value: unknown, limit = 500): string | undefined {
  if (typeof value !== 'string') return undefined;
  const result = value.trim();
  return result ? result.slice(0, limit) : undefined;
}

function displayList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.flatMap((item) => {
    const safe = display(item, 1000);
    return safe ? [safe] : [];
  });
  return result.length ? result.slice(0, 500) : undefined;
}

function compact<T extends JsonObject>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export function composeProposalVersion(source: ProposalVersionSource): {
  snapshot: ProposalVersionSnapshot;
  renderedContent: string;
} {
  const contact = object(source.companyProfile?.contact_info);
  const scope = object(source.proposal.service_scope);
  const address = [source.property.address_line_1, source.property.address_line_2]
    .map((part) => part?.trim()).filter(Boolean).join(', ') || source.proposal.service_location.trim();

  const snapshot = proposalVersionSnapshotSchema.parse(compact({
    schemaVersion: 'crm_proposal_version.v1',
    title: source.proposal.title,
    organization: compact({
      displayName: source.companyProfile?.company_name || 'Cleaning company',
      address: display(contact.address),
      phone: display(contact.phone),
      email: display(contact.email),
      website: display(contact.website),
    }),
    customer: compact({
      name: source.customer.name || source.proposal.client_name,
      company: display(source.proposal.client_company),
      email: display(source.proposal.client_email),
      phone: display(source.proposal.contact_phone),
    }),
    serviceLocation: compact({
      name: display(source.property.name),
      address,
      city: display(source.property.city),
      state: display(source.property.region),
      postalCode: display(source.property.postal_code),
    }),
    service: compact({
      type: source.proposal.service_type,
      frequency: source.proposal.service_frequency,
      summary: display(source.property.name),
    }),
    scopeLines: displayList(scope.areas_included) ?? [],
    exclusions: displayList(scope.areas_excluded),
    pricing: compact({
      amountMinor: source.estimate.selected_amount_minor,
      currency: source.estimate.currency,
      basis: source.estimate.pricing_basis,
      unitLabel: source.estimate.pricing_basis.replaceAll('_', ' '),
    }),
    template: {
      id: source.proposal.template_id || 'default',
      rendererVersion: 'release1-markdown.v1',
    },
    provenance: {
      proposalId: source.proposal.id,
      opportunityId: source.opportunityId,
      propertyId: source.propertyId,
      workPackageId: source.workPackageId,
      estimateRunId: source.estimate.id,
    },
  }));

  return { snapshot, renderedContent: renderProposalVersion(snapshot) };
}

export function renderProposalVersion(snapshot: ProposalVersionSnapshot): string {
  const scope = snapshot.scopeLines.length
    ? snapshot.scopeLines.map((line) => `- ${line}`).join('\n')
    : '- Scope to be confirmed';
  return [
    `# ${snapshot.title}`,
    '',
    `Prepared for: ${snapshot.customer.name}`,
    `Service location: ${snapshot.serviceLocation.address}`,
    `Service: ${snapshot.service.type} (${snapshot.service.frequency})`,
    '',
    'Scope:',
    scope,
    '',
    `Price: ${snapshot.pricing.currency} ${(snapshot.pricing.amountMinor / 100).toFixed(2)} ${snapshot.pricing.basis.replaceAll('_', ' ')}`,
  ].join('\n');
}
