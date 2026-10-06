import { composeProposalVersion, type ProposalVersionSource } from '../proposal-version';

const source: ProposalVersionSource = {
  proposal: {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Turnover proposal',
    client_name: 'Alex Rivera',
    client_email: 'alex@example.test',
    client_company: 'Rivera Stays',
    contact_phone: '555-0100',
    service_location: '10 Main St',
    service_type: 'residential',
    service_frequency: 'one-time',
    service_scope: {
      areas_included: ['Kitchen', 'Bathrooms'],
      areas_excluded: ['Exterior windows'],
      special_notes: 'Door code 4815 — internal only',
      operator_margin: 42,
    },
    template_id: null,
  },
  companyProfile: {
    company_name: 'Keystone Cleaning',
    contact_info: { address: '20 Market St', phone: '555-0200', email: 'hello@example.test' },
  },
  customer: { name: 'Rivera Stays' },
  property: {
    name: 'Main Street rental',
    address_line_1: '10 Main St',
    address_line_2: 'Unit 2',
    city: 'Portland',
    region: 'OR',
    postal_code: '97201',
  },
  estimate: {
    id: '22222222-2222-4222-8222-222222222222',
    selected_amount_minor: 24500,
    currency: 'USD',
    pricing_basis: 'per_turn',
  },
  opportunityId: '33333333-3333-4333-8333-333333333333',
  propertyId: '44444444-4444-4444-8444-444444444444',
  workPackageId: '55555555-5555-4555-8555-555555555555',
};

describe('R3-4 proposal-version composer', () => {
  it('composes a strict customer-visible snapshot from authoritative values', () => {
    const result = composeProposalVersion(source);
    expect(result.renderedContent).toContain('Price: USD 245.00 per turn');
    expect(result.renderedContent).toContain('- Kitchen');
    expect(result.renderedContent).not.toContain('4815');
    expect(result.snapshot).toMatchObject({
      schemaVersion: 'crm_proposal_version.v1',
      organization: { displayName: 'Keystone Cleaning' },
      customer: { name: 'Rivera Stays' },
      serviceLocation: { address: '10 Main St, Unit 2' },
      scopeLines: ['Kitchen', 'Bathrooms'],
      exclusions: ['Exterior windows'],
      pricing: { amountMinor: 24500, currency: 'USD', basis: 'per_turn' },
      provenance: {
        proposalId: source.proposal.id,
        estimateRunId: source.estimate.id,
        workPackageId: source.workPackageId,
      },
    });
  });

  it('does not copy internal scope fields or estimate economics into the snapshot', () => {
    const serialized = JSON.stringify(composeProposalVersion(source).snapshot);
    expect(serialized).not.toContain('4815');
    expect(serialized).not.toContain('operator_margin');
    expect(serialized).not.toMatch(/labor|margin|overhead|access/i);
  });

  it('renders from the allowlisted snapshot and rejects invalid estimate output', () => {
    expect(() => composeProposalVersion({
      ...source,
      estimate: { ...source.estimate, selected_amount_minor: -1 },
    })).toThrow();
  });
});
