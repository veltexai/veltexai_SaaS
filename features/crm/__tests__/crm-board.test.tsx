/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { customer_id: 'customer' } }) });
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
  });

  it('requires an explicit duplicate decision and reuses the original command key', async () => {
    const commandKey = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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
          entity_type: 'contact', entity_id: 'candidate-1', matched_on: 'email',
        }] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: 'lead-1' } }) });

    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Sales pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'Quick-add lead' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(await screen.findByRole('heading', { name: 'Review possible duplicate' })).toBeInTheDocument();
    expect(screen.getByText('Matching contact by email')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link existing' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[2][1].headers['idempotency-key']).toBe(commandKey);
    expect(fetchMock.mock.calls[3][1].headers['idempotency-key']).toBe(commandKey);
    expect(fetchMock.mock.calls[3][1].body).toContain('"duplicateDecision":"link_existing"');
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
    expect(screen.getByRole('option', { name: 'Won' })).toBeEnabled();
    fireEvent.change(move, { target: { value: 'stage-qualifying' } });
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
    expect(screen.getByRole('dialog', { name: 'Record Lost' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'reason-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm outcome' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].body).toBe('{"stageId":"stage-lost","lossReasonId":"reason-1"}');
  });

  it('requires a manual reason for an owner-recorded win', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, caller_role: 'owner', loss_reasons: [], viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [
          { id: 'stage-new', label: 'Lead', category: 'new', position: 10, hidden: false },
          { id: 'stage-won', label: 'Won', category: 'won', position: 70, hidden: false },
        ] }],
        opportunities: [{ id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1', stage_id: 'stage-new', category: 'new' }],
      } }) });
    render(<CrmBoard />);
    const move = await screen.findByRole('combobox', { name: 'Move North Campus to stage' });
    fireEvent.change(move, { target: { value: 'stage-won' } });
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
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { walkthrough_id: 'walk-1' } }) });
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
