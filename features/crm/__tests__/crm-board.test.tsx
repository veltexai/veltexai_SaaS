/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CrmBoard } from '@/features/crm/components/crm-board';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const fetchMock = jest.fn();

describe('R3-1 CRM board', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('renders an accessible board from the explicit active organization', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {
          organization_id: ORG_ID,
          caller_role: 'owner', loss_reasons: [],
          viewer_price_redacted: false,
          pipelines: [{
            id: 'pipeline-1', name: 'Commercial facility', is_default: true,
            stages: [{ id: 'stage-1', label: 'Lead', category: 'new', position: 10, hidden: false }],
          }],
          opportunities: [{
            id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
            stage_id: 'stage-1', category: 'new', value_amount_minor: 125000,
            value_basis: 'monthly', currency: 'USD',
          }],
        } }),
      });
    render(<CrmBoard />);
    expect(await screen.findByRole('heading', { name: 'Sales pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lead' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'North Campus' })).toBeInTheDocument();
    expect(screen.getByText(/\$1,250\.00 · monthly/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/orgs/${ORG_ID}/crm/opportunities`, { cache: 'no-store' });
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('table', { name: 'Commercial facility opportunities' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Stage' })).toBeInTheDocument();
  });

  it('respects a viewer-redacted payload and removes mutation controls', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {
          organization_id: ORG_ID,
          caller_role: 'viewer', loss_reasons: [],
          viewer_price_redacted: true,
          pipelines: [{
            id: 'pipeline-1', name: 'Residential and turnover', is_default: true,
            stages: [{ id: 'stage-1', label: 'Inquiry', category: 'new', position: 10, hidden: false }],
          }],
          opportunities: [{ id: 'opportunity-1', name: 'Turnover', pipeline_id: 'pipeline-1', stage_id: 'stage-1', category: 'new' }],
        } }),
      });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Sales pipeline' });
    expect(screen.getByText('Pricing is hidden for read-only viewers.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quick-add lead' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New customer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Move Turnover to stage' })).not.toBeInTheDocument();
  });

  it('shows the same internal estimate summary and Estimate action on Board and List', async () => {
    fetchMock.mockResolvedValueOnce({ok:true,json:async()=>({data:ORG_ID})}).mockResolvedValueOnce({ok:true,json:async()=>({data:{
      organization_id:ORG_ID,caller_role:'estimator',loss_reasons:[],viewer_price_redacted:false,
      pipelines:[{id:'pipeline-1',name:'Residential',is_default:true,stages:[{id:'stage-1',label:'Quote',category:'estimating',position:40,hidden:false}]}],
      opportunities:[{id:'opportunity-1',name:'Turnover',pipeline_id:'pipeline-1',stage_id:'stage-1',category:'estimating',segment:'residential',property_id:'property-1',updated_at:'2026-10-03T08:00:00Z'}],
      work_packages:[{id:'package-1',opportunity_id:'opportunity-1',property_id:'property-1',status:'estimated',updated_at:'2026-10-03T08:00:00Z'}],
      estimate_summaries:[{estimate_run_id:'run-1',opportunity_id:'opportunity-1',work_package_id:'package-1',engine_version:'2026-09-22.2',selected_amount_minor:18500,currency:'USD',pricing_basis:'per_visit',created_at:'2026-10-03T08:00:00Z'}],
    }})});
    render(<CrmBoard/>);await screen.findByRole('heading',{name:'Turnover'});
    expect(screen.getByText(/Internal planning estimate:.*185\.00/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Estimate'})).toHaveAttribute('href',expect.stringContaining('/dashboard/crm/estimate/opportunity-1'));
    fireEvent.click(screen.getByRole('button',{name:'List'}));
    expect(screen.getByText(/Internal estimate:.*185\.00/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Estimate'})).toBeInTheDocument();
  });

  it('shows the same caller-scoped acceptance summary on Board and List with viewer price redaction', async () => {
    fetchMock.mockResolvedValueOnce({ok:true,json:async()=>({data:ORG_ID})}).mockResolvedValueOnce({ok:true,json:async()=>({data:{
      organization_id:ORG_ID,caller_role:'viewer',loss_reasons:[],viewer_price_redacted:true,
      pipelines:[{id:'pipeline-1',name:'Residential',is_default:true,stages:[{id:'stage-1',label:'Accepted',category:'won',position:60,hidden:false}]}],
      opportunities:[{id:'opportunity-1',name:'Accepted turnover',pipeline_id:'pipeline-1',stage_id:'stage-1',category:'won',segment:'turnover'}],
      acceptance_summaries:[{receipt_id:'abcdef12-3456-4789-8123-456789abcdef',opportunity_id:'opportunity-1',proposal_version_id:'version-1',accepted_at:'2026-10-08T01:00:00Z',selected_count:2,receipt_sha256:'c'.repeat(64)}],
    }})});
    render(<CrmBoard/>);
    await screen.findByRole('heading',{name:'Accepted turnover'});
    expect(screen.getByText(/Proposal acceptance received/)).toBeInTheDocument();
    expect(screen.getByText(/2 packages · receipt abcdef12/)).toBeInTheDocument();
    expect(screen.queryByText(/\$325\.00/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'List'}));
    expect(screen.getByRole('table')).toHaveTextContent('2 packages · receipt abcdef12');
    expect(screen.getByRole('table')).not.toHaveTextContent('$325.00');
  });

  it('prepares the same immutable proposal-version workflow from Board and List', async () => {
    const board = {
      organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
      pipelines: [{ id: 'pipeline-1', name: 'Residential', is_default: true,
        stages: [{ id: 'stage-1', label: 'Quote', category: 'estimating', position: 40, hidden: false }] }],
      opportunities: [{ id: 'opportunity-1', name: 'Taylor home', pipeline_id: 'pipeline-1',
        stage_id: 'stage-1', category: 'estimating', segment: 'residential', property_id: 'property-1',
        updated_at: '2026-10-06T08:00:00Z' }],
      work_packages: [{ id: 'package-1', opportunity_id: 'opportunity-1', property_id: 'property-1',
        status: 'estimated', proposal_id: 'proposal-1', estimate_run_id: 'run-1',
        updated_at: '2026-10-06T08:00:00Z' }],
      estimate_summaries: [{ estimate_run_id: 'run-1', opportunity_id: 'opportunity-1',
        work_package_id: 'package-1', engine_version: '2026-09-22.2', selected_amount_minor: 18500,
        currency: 'USD', pricing_basis: 'per_visit', created_at: '2026-10-06T08:00:00Z' }],
    };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: board }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        candidates: [{ id: 'proposal-1', title: 'Taylor proposal', property_id: 'property-1',
          updated_at: '2026-10-06T07:00:00Z', preview: { rendered_content: '# Taylor proposal\n\nPrice: USD 185.00 per visit',
            scope_lines: ['Kitchen', 'Bathrooms'], amount_minor: 18500, currency: 'USD',
            pricing_basis: 'per_visit' } }], versions: [],
      } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: {
        proposal_version_id: 'version-1', version_number: 1,
        package_updated_at: '2026-10-06T08:05:00Z', replayed: false,
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        candidates: [{ id: 'proposal-1', title: 'Taylor proposal', property_id: 'property-1',
          updated_at: '2026-10-06T07:00:00Z', preview: { rendered_content: '# Taylor proposal\n\nPrice: USD 185.00 per visit',
            scope_lines: ['Kitchen', 'Bathrooms'], amount_minor: 18500, currency: 'USD',
            pricing_basis: 'per_visit' } }],
        versions: [{ id: 'version-1', proposal_id: 'proposal-1', work_package_id: 'package-1',
          estimate_run_id: 'run-1', version_number: 1, display_amount_minor: 18500, currency: 'USD',
          pricing_basis: 'per_visit', content_sha256: 'a', rendered_sha256: 'b',
          schema_version: 'crm_proposal_version.v1', created_at: '2026-10-06T08:05:00Z' }],
      } }) });

    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Taylor home' });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare proposal version' }));
    expect(await screen.findByRole('heading', { name: 'Prepare proposal version' })).toBeInTheDocument();
    expect(screen.getByText(/does not send, sign or accept/)).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Taylor proposal' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Customer-visible proposal review' }))
      .toHaveTextContent('Price: USD 185.00 per visit');
    expect(screen.getByText('Kitchen')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Prepare immutable version' }));
    expect(await screen.findByText(/Version 1/)).toBeInTheDocument();
    expect(screen.getByText(/not sent/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prepare immutable version' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Prepare another version' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(4,
      `/api/orgs/${ORG_ID}/crm/opportunities/opportunity-1/proposal-versions`,
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({
        'idempotency-key': expect.any(String),
      }) }));
    const publishBody = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(publishBody).toEqual({ proposalId: 'proposal-1', propertyId: 'property-1',
      estimateRunId: 'run-1', workPackageId: 'package-1',
      expectedPackageUpdatedAt: '2026-10-06T08:00:00Z' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('button', { name: 'Prepare proposal version' })).toHaveClass('min-h-11');
  });

  it('reviews and publishes an immutable multi-package set without browser pricing inputs', async () => {
    const packagePreview = {
      rendered_content: '# Taylor proposal\n\n## Service option 1\nPrice: USD 185.00 per visit\n\n## Service option 2\nPrice: USD 140.00 one time\n\nOffered total: USD 325.00',
      amount_minor: 32500, currency: 'USD', packages: [
        { display_position: 1, work_package_id: 'package-1',
          expected_package_updated_at: '2026-10-06T08:00:00Z', title: 'Service option 1',
          scope_lines: ['Kitchen'], amount_minor: 18500, currency: 'USD', pricing_basis: 'per_visit' },
        { display_position: 2, work_package_id: 'package-2',
          expected_package_updated_at: '2026-10-06T08:01:00Z', title: 'Service option 2',
          scope_lines: ['Bathrooms'], amount_minor: 14000, currency: 'USD', pricing_basis: 'one_time' },
      ],
    };
    const board = {
      organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
      pipelines: [{ id: 'pipeline-1', name: 'Residential', is_default: true,
        stages: [{ id: 'stage-1', label: 'Quote', category: 'estimating', position: 40, hidden: false }] }],
      opportunities: [{ id: 'opportunity-1', name: 'Taylor options', pipeline_id: 'pipeline-1',
        stage_id: 'stage-1', category: 'estimating', segment: 'residential', property_id: 'property-1' }],
      work_packages: [
        { id: 'package-1', opportunity_id: 'opportunity-1', property_id: 'property-1',
          status: 'estimated', proposal_id: 'proposal-1', estimate_run_id: 'run-1',
          updated_at: '2026-10-06T08:00:00Z' },
        { id: 'package-2', opportunity_id: 'opportunity-1', property_id: 'property-1',
          status: 'estimated', proposal_id: 'proposal-1', estimate_run_id: 'run-2',
          updated_at: '2026-10-06T08:01:00Z' },
      ],
      estimate_summaries: [
        { estimate_run_id: 'run-1', opportunity_id: 'opportunity-1', work_package_id: 'package-1',
          engine_version: 'v', selected_amount_minor: 18500, currency: 'USD', pricing_basis: 'per_visit',
          created_at: '2026-10-06T08:00:00Z' },
        { estimate_run_id: 'run-2', opportunity_id: 'opportunity-1', work_package_id: 'package-2',
          engine_version: 'v', selected_amount_minor: 14000, currency: 'USD', pricing_basis: 'one_time',
          created_at: '2026-10-06T08:01:00Z' },
      ],
    };
    const context = { data: { candidates: [{ id: 'proposal-1', title: 'Taylor proposal',
      property_id: 'property-1', updated_at: '2026-10-06T07:00:00Z',
      package_set_preview: packagePreview }], versions: [] } };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: board }) })
      .mockResolvedValueOnce({ ok: true, json: async () => context })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: {
        proposal_version_id: 'version-2', version_number: 2, package_updated_ats: [
          { workPackageId: 'package-1', updatedAt: '2026-10-06T08:05:00Z' },
          { workPackageId: 'package-2', updatedAt: '2026-10-06T08:05:00Z' },
        ], replayed: false,
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        candidates: [{ ...context.data.candidates[0], package_set_preview: {
          ...packagePreview,
          packages: packagePreview.packages.map((item) => ({ ...item,
            expected_package_updated_at: '2026-10-06T08:05:00Z' })),
        } }],
        versions: [{ id: 'version-2', proposal_id: 'proposal-1', estimate_run_id: null,
          version_number: 2, display_amount_minor: 32500, currency: 'USD', pricing_basis: null,
          content_sha256: 'a', rendered_sha256: 'b', schema_version: 'crm_proposal_version.v2',
          package_count: 2, created_at: '2026-10-06T08:05:00Z' }],
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Taylor options' });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare proposal version' }));
    expect(await screen.findByRole('group', { name: 'Packages included in this version' }))
      .toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Customer-visible proposal review' }))
      .toHaveTextContent('Offered total: USD 325.00');
    fireEvent.click(screen.getByRole('button', { name: 'Prepare immutable version' }));
    expect(await screen.findByText(/2 package set/)).toBeInTheDocument();
    const getUrl = String(fetchMock.mock.calls[2][0]);
    expect(getUrl).toContain('mode=package_set');
    expect(getUrl).toContain('packageId=package-1');
    expect(getUrl).toContain('packageId=package-2');
    const body = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(body).toEqual({ schemaVersion: 'crm_proposal_version.v2', proposalId: 'proposal-1',
      propertyId: 'property-1', packages: [
        { workPackageId: 'package-1', expectedPackageUpdatedAt: '2026-10-06T08:00:00Z' },
        { workPackageId: 'package-2', expectedPackageUpdatedAt: '2026-10-06T08:01:00Z' },
      ] });
    expect(JSON.stringify(body)).not.toMatch(/amount|price|scope|estimate/i);
  });

  it('ignores an older package-selection preview that resolves after the current request', async () => {
    const board = {
      organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
      pipelines: [{ id: 'pipeline-1', name: 'Residential', is_default: true,
        stages: [{ id: 'stage-1', label: 'Quote', category: 'estimating', position: 40, hidden: false }] }],
      opportunities: [{ id: 'opportunity-1', name: 'Preview race', pipeline_id: 'pipeline-1',
        stage_id: 'stage-1', category: 'estimating', segment: 'residential', property_id: 'property-1' }],
      work_packages: [1, 2].map((number) => ({ id: `package-${number}`,
        opportunity_id: 'opportunity-1', property_id: 'property-1', status: 'estimated',
        proposal_id: 'proposal-1', estimate_run_id: `run-${number}`,
        updated_at: `2026-10-06T08:0${number}:00Z` })),
      estimate_summaries: [1, 2].map((number) => ({ estimate_run_id: `run-${number}`,
        opportunity_id: 'opportunity-1', work_package_id: `package-${number}`, engine_version: 'v',
        selected_amount_minor: number * 10000, currency: 'USD', pricing_basis: 'one_time',
        created_at: `2026-10-06T08:0${number}:00Z` })),
    };
    const packageContext = (rendered: string) => ({ ok: true, json: async () => ({ data: {
      candidates: [{ id: 'proposal-1', title: 'Proposal', property_id: 'property-1',
        package_set_preview: { rendered_content: rendered, amount_minor: 30000, currency: 'USD',
          packages: [1, 2].map((number) => ({ display_position: number,
            work_package_id: `package-${number}`,
            expected_package_updated_at: `2026-10-06T08:0${number}:00Z`,
            title: `Option ${number}`, scope_lines: ['Scope'], amount_minor: number * 10000,
            currency: 'USD', pricing_basis: 'one_time' })) } }], versions: [],
    } }) });
    let resolveOld!: (value: any) => void;
    let resolveCurrent!: (value: any) => void;
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: board }) })
      .mockResolvedValueOnce(packageContext('initial package set'))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveCurrent = resolve; }));
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Preview race' });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare proposal version' }));
    await screen.findByText('initial package set');
    fireEvent.click(screen.getByRole('checkbox', { name: /Service package 2/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Prepare proposal version' }))
      .not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Prepare proposal version' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    await act(async () => { resolveCurrent(packageContext('current package set')); });
    expect(await screen.findByText('current package set')).toBeInTheDocument();
    await act(async () => { resolveOld({ ok: true, json: async () => ({ data: {
      candidates: [{ id: 'proposal-1', title: 'Proposal', property_id: 'property-1', preview: {
        rendered_content: 'stale one-package preview', scope_lines: ['Old'], amount_minor: 10000,
        currency: 'USD', pricing_basis: 'one_time' } }], versions: [],
    } }) }); });
    expect(screen.getByText('current package set')).toBeInTheDocument();
    expect(screen.queryByText('stale one-package preview')).not.toBeInTheDocument();
  });

  it('recovers a stale package through an explicit board refresh', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const board = {
      organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
      pipelines: [{ id: 'pipeline-1', name: 'Residential', is_default: true,
        stages: [{ id: 'stage-1', label: 'Quote', category: 'estimating', position: 40, hidden: false }] }],
      opportunities: [{ id: 'opportunity-1', name: 'Stale package', pipeline_id: 'pipeline-1',
        stage_id: 'stage-1', category: 'estimating', segment: 'residential', property_id: 'property-1' }],
      work_packages: [{ id: 'package-1', opportunity_id: 'opportunity-1', property_id: 'property-1',
        status: 'estimated', proposal_id: 'proposal-1', estimate_run_id: 'run-1',
        updated_at: '2026-10-06T08:00:00Z' }],
      estimate_summaries: [{ estimate_run_id: 'run-1', opportunity_id: 'opportunity-1',
        work_package_id: 'package-1', engine_version: '2026-09-22.2', selected_amount_minor: 18500,
        currency: 'USD', pricing_basis: 'per_visit', created_at: '2026-10-06T08:00:00Z' }],
    };
    const context = { data: { candidates: [{ id: 'proposal-1', title: 'Proposal', property_id: 'property-1',
      updated_at: '2026-10-06T07:00:00Z', preview: { rendered_content: 'Price: USD 185.00 per visit',
        scope_lines: ['Kitchen'], amount_minor: 18500, currency: 'USD', pricing_basis: 'per_visit' } }],
      versions: [] } };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: board }) })
      .mockResolvedValueOnce({ ok: true, json: async () => context })
      .mockResolvedValueOnce({ ok: false, status: 409,
        json: async () => ({ error: 'This package changed. Reload and try again.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ...board,
        work_packages: [{ ...board.work_packages[0], updated_at: '2026-10-06T08:05:00Z' }] } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Stale package' });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare proposal version' }));
    await screen.findByText('Price: USD 185.00 per visit');
    fireEvent.click(screen.getByRole('button', { name: 'Prepare immutable version' }));
    expect(await screen.findByRole('button', { name: 'Refresh proposal data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prepare immutable version' })).toBeDisabled();
    expect(fetchMock.mock.calls[3][1].headers['idempotency-key'])
      .toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh proposal data' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Prepare proposal version' }))
      .not.toBeInTheDocument());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
  });

  it('blocks specialty estimates and makes non-scoping packages read-only',async()=>{
    fetchMock.mockResolvedValueOnce({ok:true,json:async()=>({data:ORG_ID})}).mockResolvedValueOnce({ok:true,json:async()=>({data:{
      organization_id:ORG_ID,caller_role:'owner',loss_reasons:[],viewer_price_redacted:false,
      pipelines:[{id:'pipeline-1',name:'Commercial',is_default:true,stages:[{id:'stage-1',label:'Quote',category:'estimating',position:40,hidden:false}]}],
      opportunities:[{id:'opportunity-1',name:'Specialty floor',pipeline_id:'pipeline-1',stage_id:'stage-1',category:'estimating',segment:'specialty',property_id:'property-1',updated_at:'2026-10-03T08:00:00Z'}],
      work_packages:[{id:'package-1',opportunity_id:'opportunity-1',property_id:'property-1',status:'accepted',updated_at:'2026-10-03T08:00:00Z'}],
    }})});
    render(<CrmBoard/>);await screen.findByRole('heading',{name:'Specialty floor'});
    expect(screen.queryByRole('link',{name:'Estimate'})).not.toBeInTheDocument();
    expect(screen.getByText(/Commercial and specialty estimating are not yet supported/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Review work package'}));
    expect(screen.getByText('accepted')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Save work package'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Close'}));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('creates a customer, primary contact, and property through one account command', async () => {
    jest.spyOn(global.crypto, 'randomUUID')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], assignable_members: [],
        viewer_price_redacted: false, pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [] }], opportunities: [],
      } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { customer_id: 'customer' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], assignable_members: [],
        viewer_price_redacted: false, pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [] }],
        opportunities: [], customers: [{ id: 'customer', name: 'North Campus' }],
        properties: [{ id: 'property', customer_id: 'customer', name: 'Building A' }],
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Sales pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'New customer' }));
    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'North Campus' } });
    fireEvent.change(screen.getByLabelText('Contact email'), { target: { value: 'manager@example.test' } });
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Building A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe(`/api/orgs/${ORG_ID}/crm/records/account`);
    expect(fetchMock.mock.calls[2][1].body).toContain('"customerName":"North Campus"');
    expect(fetchMock.mock.calls[2][1].body).toContain('"contactEmail":"manager@example.test"');
    expect(await screen.findByText('Customer, primary contact, and property created.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New opportunity' }));
    expect(screen.getByRole('option', { name: 'North Campus' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Building A' })).toBeInTheDocument();
  });

  it('announces load failures and offers a retry', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    render(<CrmBoard />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load your active organization.'));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('records a lead lifecycle action from the open-leads queue', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], assignable_members: [],
        viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [] }],
        opportunities: [], leads: [{ id: 'lead-1', status: 'new', contact_name: 'Morgan Lee', email: 'morgan@example.test' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { action: 'contacted' }, replayed: false }) });

    render(<CrmBoard />);
    expect(await screen.findByRole('heading', { name: 'Open leads' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Morgan Lee' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Manage lead' }));
    expect(screen.getByRole('dialog', { name: 'Manage lead' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save lead' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe(`/api/orgs/${ORG_ID}/crm/leads/lead-1/lifecycle`);
    expect(fetchMock.mock.calls[2][1].body).toBe('{"action":"contacted"}');
    expect(await screen.findByText('Lead updated.')).toBeInTheDocument();
  });

  it('requires confirmation before converting a lead and reuses captured details', async () => {
    const pipelineId = '22222222-2222-4222-8222-222222222222';
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const board = {
      organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], assignable_members: [],
      viewer_price_redacted: false, customers: [], properties: [],
      pipelines: [{ id: pipelineId, name: 'Commercial', segment: 'commercial', is_default: true, stages: [] }],
      opportunities: [], leads: [{ id: 'lead-1', status: 'new', contact_name: 'Morgan Lee',
        email: 'morgan@example.test', property_name: 'North Campus' }],
    };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: board }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        opportunity_id: 'opportunity-1', customer_id: 'customer-1', replayed: false,
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ...board, leads: [] } }) });

    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Open leads' });
    fireEvent.click(screen.getByRole('button', { name: 'Convert lead' }));
    expect(screen.getByRole('dialog', { name: 'Convert lead' })).toBeInTheDocument();
    expect(screen.getByText(/Captured contact details will be reused/)).toBeInTheDocument();
    expect(screen.getByLabelText('Opportunity name')).toHaveValue('North Campus');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm conversion' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(fetchMock.mock.calls[2][0]).toBe(`/api/orgs/${ORG_ID}/crm/leads/lead-1/convert`);
    expect(fetchMock.mock.calls[2][1].headers['idempotency-key']).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify({
      pipelineId, opportunityName: 'North Campus', segment: 'commercial',
      existingCustomerId: null, existingContactId: null, existingPropertyId: null,
    }));
    expect(await screen.findByText('Lead converted to an opportunity.')).toBeInTheDocument();
  });

  it('switches pipelines without rendering opportunities from another pipeline', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'viewer', loss_reasons: [], assignable_members: [],
        viewer_price_redacted: false,
        pipelines: [
          { id: 'commercial', name: 'Commercial', is_default: true,
            stages: [{ id: 'commercial-new', label: 'Commercial lead', category: 'new', position: 10, hidden: false }] },
          { id: 'residential', name: 'Residential', is_default: false,
            stages: [{ id: 'residential-new', label: 'Residential inquiry', category: 'new', position: 10, hidden: false }] },
        ],
        opportunities: [
          { id: 'commercial-opp', name: 'Office park', pipeline_id: 'commercial', stage_id: 'commercial-new', category: 'new' },
          { id: 'residential-opp', name: 'Lake house', pipeline_id: 'residential', stage_id: 'residential-new', category: 'new' },
        ],
      } }) });

    render(<CrmBoard />);
    expect(await screen.findByRole('heading', { name: 'Office park' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lake house' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Pipeline'), { target: { value: 'residential' } });
    expect(screen.getByRole('heading', { name: 'Lake house' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Office park' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Residential pipeline')).toHaveClass('max-w-full', 'overflow-x-auto');
  });

  it('creates a scoped site work package from a property-bound opportunity', async () => {
    jest.spyOn(global.crypto, 'randomUUID')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], assignable_members: [],
        viewer_price_redacted: false, leads: [], work_packages: [],
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true,
          stages: [{ id: 'stage-1', label: 'Scoping', category: 'qualifying', position: 10, hidden: false }] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-1', category: 'qualifying', property_id: 'property-1' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: {
        package_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', created: true, replayed: false,
        updated_at: '2026-10-02T01:00:00Z',
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Add work package' }));
    expect(screen.getByRole('dialog', { name: 'Site work package' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save work package' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toContain('/opportunities/opportunity-1/packages/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1');
    expect(fetchMock.mock.calls[2][1].body).toBe('{"propertyId":"property-1","status":"scoping","expectedUpdatedAt":null}');
    expect(await screen.findByText('Work package saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage work package' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('button', { name: 'Manage work package' })).toBeInTheDocument();
  });

  it('creates a direct opportunity without exposing attribution-lead internals', async () => {
    jest.spyOn(global.crypto, 'randomUUID')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
    const board = { organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], viewer_price_redacted: false,
      assignable_members: [{ user_id: USER_ID, role: 'owner', label: 'Morgan Lee' }],
      customers: [{ id: 'customer-1', name: 'North Campus' }], properties: [{ id: 'property-1', customer_id: 'customer-1', name: 'Building A' }],
      pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [] }], opportunities: [] };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: board }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { opportunity_id: 'opportunity-1', replayed: false } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: board }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Sales pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'New opportunity' }));
    fireEvent.change(screen.getByLabelText('Opportunity name'), { target: { value: 'North Campus Renewal' } });
    fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'customer-1' } });
    fireEvent.change(screen.getByLabelText('Property'), { target: { value: 'property-1' } });
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: USER_ID } });
    fireEvent.click(screen.getByRole('button', { name: 'Create opportunity' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(fetchMock.mock.calls[2][0]).toBe(`/api/orgs/${ORG_ID}/crm/opportunities/direct`);
    expect(fetchMock.mock.calls[2][1].body).toContain('"name":"North Campus Renewal"');
    expect(fetchMock.mock.calls[2][1].body).toContain('"leadId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3"');
    expect(await screen.findByText('Opportunity created.')).toBeInTheDocument();
  });

  it('requires an explicit duplicate decision and reuses the original command key', async () => {
    const commandKey = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const contactId = '44444444-4444-4444-8444-444444444444';
    const leadId = '55555555-5555-4555-8555-555555555555';
    const boardAfterLink = {
      organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], assignable_members: [],
      viewer_price_redacted: false,
      pipelines: [{ id: 'pipeline-1', name: 'Commercial', segment: 'commercial', is_default: true, stages: [] }],
      opportunities: [], leads: [{ id: leadId, status: 'new', email: 'person@example.test',
        existing_contact_id: contactId }],
    };
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue(commandKey);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [] }],
        opportunities: [],
      } }) })
      .mockResolvedValueOnce({
        ok: false, status: 409, json: async () => ({ duplicateCandidates: [{
          entity_type: 'contact', entity_id: contactId, matched_on: 'email',
        }] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: leadId } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: boardAfterLink }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { opportunity_id: 'opportunity-1' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { ...boardAfterLink, leads: [] } }) });

    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Sales pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'Quick-add lead' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(await screen.findByRole('heading', { name: 'Review possible duplicate' })).toBeInTheDocument();
    expect(screen.getByText('Matching contact by email')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link existing' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(fetchMock.mock.calls[2][1].headers['idempotency-key']).toBe(commandKey);
    expect(fetchMock.mock.calls[3][1].headers['idempotency-key']).toBe(commandKey);
    expect(fetchMock.mock.calls[3][1].body).toContain('"duplicateDecision":"link_existing"');
    fireEvent.click(screen.getByRole('button', { name: 'Convert lead' }));
    fireEvent.change(screen.getByLabelText('Opportunity name'), { target: { value: 'Linked opportunity' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm conversion' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(9));
    expect(fetchMock.mock.calls[6][1].body).toContain(`"existingContactId":"${contactId}"`);
  });

  it('offers a keyboard stage menu and announces a successful move', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
          { id: 'stage-qualifying', label: 'Qualification', category: 'qualifying', position: 20, hidden: false },
          { id: 'stage-won', label: 'Won', category: 'won', position: 30, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1', stage_id: 'stage-new', category: 'new' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { replayed: false } }) });
    render(<CrmBoard />);
    const move = await screen.findByRole('combobox', { name: 'Move North Campus to stage' });
    expect(screen.getByRole('option', { name: 'Won' })).toBeDisabled();
    fireEvent.change(move, { target: { value: 'stage-qualifying' } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(await screen.findByText('Opportunity moved.')).toBeInTheDocument();
    expect(fetchMock.mock.calls[2][0]).toBe(`/api/orgs/${ORG_ID}/crm/opportunities/opportunity-1/stage`);
    expect(fetchMock.mock.calls[2][1].body).toBe('{"stageId":"stage-qualifying"}');
  });

  it('collects a required loss reason before a terminal stage move', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', viewer_price_redacted: false,
        loss_reasons: [{ id: 'reason-1', label: 'Price', applies_to: 'lost' }],
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
          { id: 'stage-lost', label: 'Lost', category: 'lost', position: 90, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1', stage_id: 'stage-new', category: 'new' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { replayed: false } }) });
    render(<CrmBoard />);
    const move = await screen.findByRole('combobox', { name: 'Move North Campus to stage' });
    fireEvent.change(move, { target: { value: 'stage-lost' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(screen.getByRole('dialog', { name: 'Record Lost' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'reason-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm outcome' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].body).toBe('{"stageId":"stage-lost","lossReasonId":"reason-1"}');
  });

  it('collects a future revisit date before moving to Nurture', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('edededed-eded-4ded-8ded-edededededed');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
          { id: 'stage-nurture', label: 'Nurture', category: 'nurture', position: 80, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { replayed: false } }) });
    render(<CrmBoard />);
    const move = await screen.findByRole('combobox', { name: 'Move North Campus to stage' });
    fireEvent.change(move, { target: { value: 'stage-nurture' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(screen.getByRole('dialog', { name: 'Record Nurture' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Revisit date and time'), { target: { value: '2099-01-02T09:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm outcome' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].body).toContain('"nextActionDueAt":"2099-01-02T');
  });

  it('requires a manual reason for an owner-recorded win', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-proposing', label: 'Proposal', category: 'proposing', position: 60, hidden: false },
          { id: 'stage-won', label: 'Won', category: 'won', position: 70, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1', stage_id: 'stage-proposing', category: 'proposing' }],
      } }) });
    render(<CrmBoard />);
    const move = await screen.findByRole('combobox', { name: 'Move North Campus to stage' });
    fireEvent.change(move, { target: { value: 'stage-won' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(screen.getByLabelText('Manual win reason')).toBeRequired();
  });

  it('creates an assigned next action without asking for a user id', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', owner_user_id: 'owner-1', estimator_user_id: USER_ID }],
      } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: 'task-1' } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Add next action' }));
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'Call facilities manager' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add next action' })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe(`/api/orgs/${ORG_ID}/crm/opportunities/opportunity-1/tasks`);
    expect(fetchMock.mock.calls[2][1].body).toContain('"assigneeUserId":"33333333-3333-4333-8333-333333333333"');
    expect(await screen.findByText('Next action added.')).toBeInTheDocument();
  });

  it('edits absolute opportunity details with the loaded concurrency timestamp', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'admin', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', owner_user_id: USER_ID,
          updated_at: '2026-10-01T19:00:00Z', value_amount_minor: 120000,
          value_basis: 'monthly', currency: 'USD' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        opportunity_id: 'opportunity-1', updated_at: '2026-10-01T20:00:00Z',
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'North Campus Renewal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save opportunity' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].body).toContain('"expectedUpdatedAt":"2026-10-01T19:00:00Z"');
    expect(fetchMock.mock.calls[2][1].body).toContain('"name":"North Campus Renewal"');
    expect(await screen.findByText('Opportunity updated.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'North Campus Renewal' })).toBeInTheDocument();
  });

  it('schedules a walkthrough from scoped property and estimator identifiers', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', owner_user_id: USER_ID, estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444', updated_at: '2026-10-01T19:00:00Z' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { walkthrough_id: 'walk-1' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', owner_user_id: USER_ID, estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444', updated_at: '2026-10-01T19:00:00Z' }],
        walkthroughs: [{ id: 'walk-1', opportunity_id: 'opportunity-1', status: 'scheduled',
          window_start: '2026-10-15T16:00:00.000Z', window_end: '2026-10-15T17:00:00.000Z',
          timezone: 'America/Los_Angeles', updated_at: '2026-10-01T20:00:00.000Z' }],
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule walkthrough' }));
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-10-15T09:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-10-15T10:00' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Schedule walkthrough' })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe(`/api/orgs/${ORG_ID}/crm/opportunities/opportunity-1/walkthroughs`);
    expect(fetchMock.mock.calls[2][1].body).toContain('"propertyId":"44444444-4444-4444-8444-444444444444"');
    expect(fetchMock.mock.calls[2][1].body).toContain(`"estimatorUserId":"${USER_ID}"`);
    expect(await screen.findByText('Walkthrough scheduled.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage walkthrough' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Schedule walkthrough' })).not.toBeInTheDocument();
  });

  it('reschedules and cancels an existing walkthrough with its concurrency token', async () => {
    jest.spyOn(global.crypto, 'randomUUID')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1')
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
    const walkthrough = {
      id: 'walk-1', opportunity_id: 'opportunity-1',
      window_start: '2026-10-15T16:00:00.000Z', window_end: '2026-10-15T17:00:00.000Z',
      timezone: 'America/Los_Angeles', status: 'scheduled', updated_at: '2026-10-01T19:00:00.000Z',
    };
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', owner_user_id: USER_ID, estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444', updated_at: '2026-10-01T19:00:00Z' }],
        walkthroughs: [walkthrough],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        walkthrough_id: 'walk-1', walkthrough_status: 'rescheduled',
        updated_at: '2026-10-01T20:00:00.000Z', replayed: false,
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        walkthrough_id: 'walk-1', walkthrough_status: 'cancelled',
        updated_at: '2026-10-01T21:00:00.000Z', replayed: false,
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Manage walkthrough' }));
    expect(screen.getByRole('dialog', { name: 'Manage walkthrough' })).not.toHaveAttribute('aria-modal');
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-10-16T09:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-10-16T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reschedule walkthrough' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe(
      `/api/orgs/${ORG_ID}/crm/opportunities/opportunity-1/walkthroughs/walk-1`,
    );
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'PATCH' }));
    expect(fetchMock.mock.calls[2][1].body).toContain('"expectedUpdatedAt":"2026-10-01T19:00:00.000Z"');
    expect(await screen.findByText('Walkthrough rescheduled.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Manage walkthrough' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel scheduled walkthrough' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][0]).toBe(
      `/api/orgs/${ORG_ID}/crm/opportunities/opportunity-1/walkthroughs/walk-1/cancel`,
    );
    expect(fetchMock.mock.calls[3][1].body).toBe('{"expectedUpdatedAt":"2026-10-01T20:00:00.000Z"}');
    expect(await screen.findByText('Walkthrough cancelled.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule walkthrough' })).toBeInTheDocument();
  });

  it('records and completes walkthrough evidence with the loaded concurrency token', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444' }],
        walkthroughs: [{ id: 'walk-1', opportunity_id: 'opportunity-1', status: 'scheduled',
          window_start: '2026-10-15T16:00:00.000Z', window_end: '2026-10-15T17:00:00.000Z',
          timezone: 'UTC', updated_at: '2026-10-03T08:00:00.000Z' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        walkthrough_id: 'walk-1', evidence_notes: 'Two restrooms and resilient flooring observed.',
        evidence_completed_at: '2026-10-03T09:00:00.000Z',
        updated_at: '2026-10-03T09:00:00.000Z', replayed: false,
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Record walkthrough evidence' }));
    expect(screen.getByText(/Do not enter door codes/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Walkthrough notes'), {
      target: { value: 'Two restrooms and resilient flooring observed.' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark walkthrough evidence complete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save evidence' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe(
      `/api/orgs/${ORG_ID}/crm/opportunities/opportunity-1/walkthroughs/walk-1/evidence`,
    );
    expect(fetchMock.mock.calls[2][1].body).toBe(JSON.stringify({
      expectedUpdatedAt: '2026-10-03T08:00:00.000Z',
      notes: 'Two restrooms and resilient flooring observed.', markComplete: true,
    }));
    expect(await screen.findByText('Walkthrough evidence completed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review walkthrough evidence' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage walkthrough' })).not.toBeInTheDocument();
  });

  it('keeps walkthrough evidence open and announces a network failure', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'admin', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }], opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444' }],
        walkthroughs: [{ id: 'walk-1', opportunity_id: 'opportunity-1', status: 'scheduled',
          window_start: '2026-10-15T16:00:00.000Z', window_end: '2026-10-15T17:00:00.000Z',
          timezone: 'UTC', updated_at: '2026-10-03T08:00:00.000Z' }],
      } }) })
      .mockRejectedValueOnce(new Error('offline'));
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Record walkthrough evidence' }));
    fireEvent.change(screen.getByLabelText('Walkthrough notes'), { target: { value: 'Observed floors.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save evidence' }));
    expect(await screen.findByText('Unable to save walkthrough evidence. Check your connection and try again.'))
      .toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Record walkthrough evidence' })).toBeInTheDocument();
  });

  it('times out a stalled walkthrough evidence request and restores retry controls', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'admin', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }], opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444' }],
        walkthroughs: [{ id: 'walk-1', opportunity_id: 'opportunity-1', status: 'scheduled',
          window_start: '2026-10-15T16:00:00.000Z', window_end: '2026-10-15T17:00:00.000Z',
          timezone: 'UTC', updated_at: '2026-10-03T08:00:00.000Z' }],
      } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    jest.useFakeTimers();
    fetchMock.mockImplementationOnce((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Record walkthrough evidence' }));
    fireEvent.change(screen.getByLabelText('Walkthrough notes'), { target: { value: 'Observed floors.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save evidence' }));
    await act(async () => { jest.advanceTimersByTime(15_000); });
    expect(screen.getByText('Unable to save walkthrough evidence. Check your connection and try again.'))
      .toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Record walkthrough evidence' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save evidence' })).toBeEnabled();
    jest.useRealTimers();
  });

  it('keeps the walkthrough form open and announces a network failure', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'estimator', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444' }],
      } }) })
      .mockRejectedValueOnce(new Error('offline'));
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule walkthrough' }));
    fireEvent.change(screen.getByLabelText('Starts'), { target: { value: '2026-10-15T09:00' } });
    fireEvent.change(screen.getByLabelText('Ends'), { target: { value: '2026-10-15T10:00' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Schedule walkthrough' })[0]);
    expect(await screen.findByText('Unable to schedule the walkthrough. Check your connection and try again.'))
      .toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Schedule walkthrough' })).toBeInTheDocument();
  });

  it('keeps an existing walkthrough open when cancellation returns malformed data', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'admin', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', estimator_user_id: USER_ID,
          property_id: '44444444-4444-4444-8444-444444444444' }],
        walkthroughs: [{ id: 'walk-1', opportunity_id: 'opportunity-1', status: 'scheduled',
          window_start: '2026-10-15T16:00:00.000Z', window_end: '2026-10-15T17:00:00.000Z',
          timezone: 'UTC', updated_at: '2026-10-01T20:00:00.000Z' }],
      } }) })
      .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('not json'); } });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Manage walkthrough' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel scheduled walkthrough' }));
    expect(await screen.findByText('Unable to cancel the walkthrough.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Manage walkthrough' })).toBeInTheDocument();
  });

  it('lets managers select only projected organization assignees', async () => {
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue('ffffffff-ffff-4fff-8fff-ffffffffffff');
    const ESTIMATOR = '44444444-4444-4444-8444-444444444444';
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], viewer_price_redacted: false,
        assignable_members: [{ user_id: USER_ID, role: 'owner', label: 'Owner' },
          { user_id: ESTIMATOR, role: 'estimator', label: 'Estimator' }],
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
          stage_id: 'stage-new', category: 'new', owner_user_id: USER_ID,
          updated_at: '2026-10-01T19:00:00Z' }],
      } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { transferred_task_count: 0 } }) });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'North Campus' });
    fireEvent.click(screen.getByRole('button', { name: 'Change assignment' }));
    fireEvent.change(screen.getByLabelText('Estimator'), { target: { value: ESTIMATOR } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Transfer matching open tasks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save assignment' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].body).toBe(`{"ownerUserId":"${USER_ID}","estimatorUserId":"${ESTIMATOR}","transferOpenTasks":true}`);
    expect(await screen.findByText('Assignment updated.')).toBeInTheDocument();
  });

  it('filters needs-follow-up and records a reviewed qualification outcome', async () => {
    jest.spyOn(global.crypto, 'randomUUID')
      .mockReturnValueOnce('66666666-6666-4666-8666-666666666666')
      .mockReturnValueOnce('77777777-7777-4777-8777-777777777777');
    fetchMock.mockResolvedValueOnce({ok:true,json:async()=>({data:ORG_ID})})
      .mockResolvedValueOnce({ok:true,json:async()=>({data:{organization_id:ORG_ID,caller_role:'estimator',viewer_price_redacted:false,
        loss_reasons:[],assignable_members:[],pipelines:[{id:'pipeline-1',name:'Commercial',is_default:true,stages:[{id:'stage-new',label:'Lead',category:'new',position:10,hidden:false}]}],
        opportunities:[{id:'opp-1',name:'Needs Call',pipeline_id:'pipeline-1',stage_id:'stage-new',category:'new',owner_user_id:USER_ID,updated_at:'2026-10-01T19:00:00Z',needs_follow_up:true},{id:'opp-2',name:'Has Task',pipeline_id:'pipeline-1',stage_id:'stage-new',category:'new',owner_user_id:USER_ID,updated_at:'2026-10-01T19:00:00Z',needs_follow_up:false}]}})})
      .mockResolvedValueOnce({ok:true,status:201,json:async()=>({data:{response_id:'response'}})});
    render(<CrmBoard/>); await screen.findByRole('heading',{name:'Needs Call'});
    fireEvent.click(screen.getByRole('button',{name:'Needs follow-up'}));
    expect(screen.queryByRole('heading',{name:'Has Task'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Record qualification'}));
    fireEvent.change(screen.getByLabelText('Qualification notes'),{target:{value:'Reviewed with estimator'}});
    fireEvent.click(screen.getByRole('button',{name:'Save qualification'}));
    await waitFor(()=>expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].body).toContain('"outcome":"fit"');
    expect(await screen.findByText('Qualification recorded.')).toBeInTheDocument();
  });
});
