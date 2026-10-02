'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Stage = { id: string; label: string; category: string; position: number; hidden: boolean };
type Pipeline = { id: string; name: string; is_default: boolean; stages: Stage[] };
type Opportunity = {
  id: string;
  name: string;
  pipeline_id: string;
  stage_id: string;
  property_id?: string;
  category: string;
  value_amount_minor?: number;
  value_basis?: string;
  currency?: string;
  next_action_due_at?: string;
  service_family?: string;
  expected_close_date?: string;
  updated_at: string;
  needs_follow_up?: boolean;
  owner_user_id?: string;
  estimator_user_id?: string;
};
type Lead = {
  id: string;
  status: 'new' | 'contacted' | 'junk' | 'merged' | 'disqualified';
  contact_name?: string;
  email?: string;
  phone?: string;
  property_name?: string;
};
type Board = {
  organization_id: string;
  caller_role: 'owner' | 'admin' | 'estimator' | 'viewer';
  pipelines: Pipeline[];
  opportunities: Opportunity[];
  leads?: Lead[];
  loss_reasons: { id: string; label: string; applies_to: 'lost' | 'disqualified' | 'both' }[];
  assignable_members: { user_id: string; role: 'owner' | 'admin' | 'estimator'; label: string }[];
  viewer_price_redacted: boolean;
};
type DuplicateCandidate = { entity_type: string; entity_id: string; matched_on: string };
type LeadDraft = { contactName: FormDataEntryValue | null; email: FormDataEntryValue | null; phone: FormDataEntryValue | null };

function valueLabel(opportunity: Opportunity) {
  if (opportunity.value_amount_minor === undefined) return null;
  const amount = new Intl.NumberFormat(undefined, {
    style: 'currency', currency: opportunity.currency ?? 'USD',
  }).format(opportunity.value_amount_minor / 100);
  return `${amount} · ${opportunity.value_basis?.replaceAll('_', ' ') ?? 'value'}`;
}

export function CrmBoard() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [outcome, setOutcome] = useState<{ opportunity: Opportunity; stage: Stage } | null>(null);
  const [taskFor, setTaskFor] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [walkthroughFor, setWalkthroughFor] = useState<Opportunity | null>(null);
  const [assigningOpportunity, setAssigningOpportunity] = useState<Opportunity | null>(null);
  const [qualifyingOpportunity, setQualifyingOpportunity] = useState<Opportunity | null>(null);
  const [managingLead, setManagingLead] = useState<Lead | null>(null);
  const [leadAction, setLeadAction] = useState<Lead['status']>('contacted');
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [duplicateReview, setDuplicateReview] = useState<{
    candidates: DuplicateCandidate[]; draft: LeadDraft; key: string;
  } | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeResponse = await fetch('/api/team/active-organization', { cache: 'no-store' });
      if (!activeResponse.ok) throw new Error('Unable to load your active organization.');
      const active = await activeResponse.json() as { data: string | null };
      if (!active.data) throw new Error('Choose an organization before opening CRM.');
      setOrganizationId(active.data);
      const response = await fetch(`/api/orgs/${active.data}/crm/opportunities`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to load CRM right now.');
      const payload = await response.json() as { data: Board };
      setBoard(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load CRM right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBoard(); }, [loadBoard]);

  const activePipeline = useMemo(
    () => board?.pipelines.find((pipeline) => pipeline.is_default) ?? board?.pipelines[0],
    [board],
  );
  const shownOpportunities = useMemo(() => board?.opportunities.filter((opportunity) =>
    !followUpOnly || opportunity.needs_follow_up) ?? [], [board, followUpOnly]);

  async function moveOpportunity(
    opportunity: Opportunity,
    stageId: string,
    details?: { lossReasonId?: string; manualWinReason?: string },
  ) {
    if (!organizationId || stageId === opportunity.stage_id) return;
    setNotice('Moving opportunity…');
    const response = await fetch(
      `/api/orgs/${organizationId}/crm/opportunities/${opportunity.id}/stage`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ stageId, ...details }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? 'Unable to move the opportunity.');
      return;
    }
    const target = activePipeline?.stages.find((stage) => stage.id === stageId);
    setBoard((current) => current ? {
      ...current,
      opportunities: current.opportunities.map((item) => item.id === opportunity.id
        ? { ...item, stage_id: stageId, category: target?.category ?? item.category }
        : item),
    } : current);
    setOutcome(null);
    setNotice('Opportunity moved.');
  }

  async function submitOutcome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outcome) return;
    const form = new FormData(event.currentTarget);
    await moveOpportunity(outcome.opportunity, outcome.stage.id, {
      lossReasonId: String(form.get('lossReasonId') || '') || undefined,
      manualWinReason: String(form.get('manualWinReason') || '') || undefined,
    });
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !taskFor) return;
    const assignee = taskFor.estimator_user_id ?? taskFor.owner_user_id;
    if (!assignee) {
      setNotice('Assign an owner or estimator before adding a next action.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const localDue = String(form.get('dueAt') || '');
    const response = await fetch(
      `/api/orgs/${organizationId}/crm/opportunities/${taskFor.id}/tasks`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({
          title: String(form.get('title') || ''),
          dueAt: localDue ? new Date(localDue).toISOString() : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          assigneeUserId: assignee,
        }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? 'Unable to add the next action.');
      return;
    }
    setTaskFor(null);
    setNotice('Next action added.');
  }

  async function submitOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !editingOpportunity) return;
    const form = new FormData(event.currentTarget);
    const amountText = String(form.get('valueAmount') || '').trim();
    const closeDate = String(form.get('expectedCloseDate') || '');
    const response = await fetch(
      `/api/orgs/${organizationId}/crm/opportunities/${editingOpportunity.id}`,
      {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedUpdatedAt: editingOpportunity.updated_at,
          name: String(form.get('name') || ''),
          serviceFamily: String(form.get('serviceFamily') || '') || null,
          expectedCloseDate: closeDate || null,
          valueAmountMinor: amountText ? Math.round(Number(amountText) * 100) : null,
          valueBasis: amountText ? String(form.get('valueBasis') || '') : null,
          currency: amountText ? 'USD' : null,
          nextActionDueAt: editingOpportunity.next_action_due_at ?? null,
        }),
      },
    );
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? 'Unable to update the opportunity.');
      return;
    }
    const name = String(form.get('name') || '');
    const serviceFamily = String(form.get('serviceFamily') || '') || undefined;
    const valueAmountMinor = amountText ? Math.round(Number(amountText) * 100) : undefined;
    const valueBasis = amountText ? String(form.get('valueBasis') || '') : undefined;
    setBoard((current) => current ? { ...current, opportunities: current.opportunities.map((item) =>
      item.id === editingOpportunity.id ? { ...item, name, service_family: serviceFamily,
        expected_close_date: closeDate || undefined, value_amount_minor: valueAmountMinor,
        value_basis: valueBasis, currency: amountText ? 'USD' : undefined,
        updated_at: payload.data.updated_at } : item) } : current);
    setEditingOpportunity(null);
    setNotice('Opportunity updated.');
  }

  async function submitWalkthrough(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !walkthroughFor?.property_id || !walkthroughFor.estimator_user_id) return;
    const form = new FormData(event.currentTarget);
    const start = new Date(String(form.get('windowStart'))).toISOString();
    const end = new Date(String(form.get('windowEnd'))).toISOString();
    const response = await fetch(
      `/api/orgs/${organizationId}/crm/opportunities/${walkthroughFor.id}/walkthroughs`,
      { method: 'POST', headers: { 'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({
        propertyId: walkthroughFor.property_id,
        estimatorUserId: walkthroughFor.estimator_user_id,
        windowStart: start, windowEnd: end,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }) },
    );
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? 'Unable to schedule the walkthrough.');
      return;
    }
    setWalkthroughFor(null);
    setNotice('Walkthrough scheduled.');
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !assigningOpportunity) return;
    const form = new FormData(event.currentTarget);
    const ownerUserId = String(form.get('ownerUserId') || '');
    const estimatorUserId = String(form.get('estimatorUserId') || '') || null;
    const response = await fetch(
      `/api/orgs/${organizationId}/crm/opportunities/${assigningOpportunity.id}/assignment`,
      { method: 'PATCH', headers: { 'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({
        ownerUserId, estimatorUserId,
        transferOpenTasks: form.get('transferOpenTasks') === 'on',
      }) },
    );
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? 'Unable to update the assignment.');
      return;
    }
    setBoard((current) => current ? { ...current, opportunities: current.opportunities.map((item) =>
      item.id === assigningOpportunity.id ? { ...item, owner_user_id: ownerUserId,
        estimator_user_id: estimatorUserId ?? undefined } : item) } : current);
    setAssigningOpportunity(null);
    setNotice('Assignment updated.');
  }

  async function submitQualification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !qualifyingOpportunity) return;
    const form = new FormData(event.currentTarget);
    const outcome = String(form.get('outcome'));
    const key = crypto.randomUUID();
    const response = await fetch(`/api/orgs/${organizationId}/crm/opportunities/${qualifyingOpportunity.id}/qualification`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({ responseId: crypto.randomUUID(), outcome,
        operatorNotes: String(form.get('operatorNotes') || ''),
        specialistReview: form.get('specialistReview') === 'on',
        lossReasonId: outcome === 'not_fit' ? String(form.get('lossReasonId') || '') || null : null }),
    });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? 'Unable to record qualification.'); return; }
    setQualifyingOpportunity(null); setNotice('Qualification recorded.');
    if (outcome === 'not_fit') void loadBoard();
  }

  async function submitLeadAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !managingLead) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/orgs/${organizationId}/crm/leads/${managingLead.id}/lifecycle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        action: leadAction,
        note: leadAction === 'junk' ? String(form.get('note') || '') : undefined,
        mergedIntoLeadId: leadAction === 'merged' ? String(form.get('mergedIntoLeadId') || '') : undefined,
        lossReasonId: leadAction === 'disqualified' ? String(form.get('lossReasonId') || '') : undefined,
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? 'Unable to update the lead.'); return; }
    setBoard((current) => current ? { ...current, leads: (current.leads ?? []).map((lead) =>
      lead.id === managingLead.id ? { ...lead, status: leadAction } : lead) } : current);
    setManagingLead(null);
    setNotice('Lead updated.');
  }

  function stageMove(opportunity: Opportunity) {
    return (
      <div className="mt-3">
        <Label className="sr-only" htmlFor={`move-${opportunity.id}`}>Move {opportunity.name}</Label>
        <select
          id={`move-${opportunity.id}`}
          value={opportunity.stage_id}
          onChange={(event) => {
            const target = activePipeline?.stages.find((stage) => stage.id === event.target.value);
            if (!target) return;
            if (['won', 'lost', 'disqualified'].includes(target.category)) {
              setOutcome({ opportunity, stage: target });
              return;
            }
            void moveOpportunity(opportunity, target.id);
          }}
          className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
          aria-label={`Move ${opportunity.name} to stage`}
        >
          {activePipeline?.stages.filter((stage) => !stage.hidden).map((stage) => (
            <option
              key={stage.id}
              value={stage.id}
              disabled={stage.category === 'handed_off'
                || (stage.category === 'won' && !['owner', 'admin'].includes(board?.caller_role ?? 'viewer'))}
            >{stage.label}</option>
          ))}
        </select>
      </div>
    );
  }

  async function createLead(
    draft: LeadDraft,
    key: string,
    duplicateDecision?: 'create_new' | 'link_existing',
    linkedEntityId?: string,
  ) {
    if (!organizationId) return;
    setSaving(true);
    setNotice(null);
    const response = await fetch(`/api/orgs/${organizationId}/crm/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({
        contactName: draft.contactName || null,
        email: draft.email || null,
        phone: draft.phone || null,
        duplicateDecision,
        linkedEntityId,
      }),
    });
    const payload = await response.json();
    if (response.status === 409) {
      setNotice('A possible existing record needs review before this lead is added.');
      setDuplicateReview({ candidates: payload.duplicateCandidates ?? [], draft, key });
    } else if (!response.ok) {
      setNotice(payload.error ?? 'Unable to add the lead.');
    } else {
      setNotice('Lead added. Open it to confirm customer and property details.');
      setDuplicateReview(null);
      setShowQuickAdd(false);
    }
    setSaving(false);
  }

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const draft = {
      contactName: form.get('contactName'), email: form.get('email'), phone: form.get('phone'),
    };
    await createLead(draft, crypto.randomUUID());
    if (!duplicateReview) formElement.reset();
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/orgs/${organizationId}/crm/records/account`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        customerId: crypto.randomUUID(), contactId: crypto.randomUUID(), propertyId: crypto.randomUUID(),
        customerType: String(form.get('customerType')), customerName: String(form.get('customerName')),
        contactFirstName: String(form.get('contactFirstName') || '') || null,
        contactLastName: String(form.get('contactLastName') || '') || null,
        contactEmail: String(form.get('contactEmail') || '') || null,
        contactPhone: String(form.get('contactPhone') || '') || null,
        propertyName: String(form.get('propertyName')), addressLine1: String(form.get('addressLine1') || '') || null,
        city: String(form.get('city') || '') || null, region: String(form.get('region') || '') || null,
        postalCode: String(form.get('postalCode') || '') || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? 'Unable to create the customer account.'); return; }
    setShowNewAccount(false); setNotice('Customer, primary contact, and property created.');
  }

  if (loading) return <p role="status" className="text-sm text-gray-600">Loading CRM…</p>;
  if (error || !board || !activePipeline) {
    return (
      <Card>
        <CardHeader><CardTitle>CRM unavailable</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p role="alert" className="text-sm text-red-700">{error ?? 'No pipeline is configured.'}</p>
          <Button variant="outline" onClick={() => void loadBoard()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-labelledby="crm-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 id="crm-heading" className="text-3xl font-bold text-gray-900">Sales pipeline</h1>
          <p className="mt-1 text-sm text-gray-600">{activePipeline.name}. Values stay separated by billing basis.</p>
        </div>
        {board.caller_role !== 'viewer' && <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11"
          onClick={() => setShowNewAccount((open) => !open)} aria-expanded={showNewAccount}>
          <Plus className="mr-2 h-4 w-4" />New customer</Button>
          <Button className="min-h-11" onClick={() => setShowQuickAdd((open) => !open)} aria-expanded={showQuickAdd}>
            <Plus className="mr-2 h-4 w-4" />Quick-add lead
          </Button></div>}
      </div>

      {showNewAccount && (
        <Card>
          <CardHeader><CardTitle>New customer account</CardTitle></CardHeader>
          <CardContent><form className="grid gap-4 sm:grid-cols-2" onSubmit={submitAccount}>
            <div className="space-y-2"><Label htmlFor="customer-type">Customer type</Label><select id="customer-type" name="customerType"
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="commercial">Commercial</option><option value="household">Household</option></select></div>
            <div className="space-y-2"><Label htmlFor="customer-name">Customer name</Label><Input id="customer-name" name="customerName" required maxLength={200} /></div>
            <div className="space-y-2"><Label htmlFor="contact-first">Contact first name</Label><Input id="contact-first" name="contactFirstName" /></div>
            <div className="space-y-2"><Label htmlFor="contact-last">Contact last name</Label><Input id="contact-last" name="contactLastName" /></div>
            <div className="space-y-2"><Label htmlFor="contact-email">Contact email</Label><Input id="contact-email" name="contactEmail" type="email" /></div>
            <div className="space-y-2"><Label htmlFor="contact-phone">Contact phone</Label><Input id="contact-phone" name="contactPhone" type="tel" /></div>
            <div className="space-y-2"><Label htmlFor="property-name">Property name</Label><Input id="property-name" name="propertyName" required maxLength={200} /></div>
            <div className="space-y-2"><Label htmlFor="property-address">Street address</Label><Input id="property-address" name="addressLine1" /></div>
            <div className="space-y-2"><Label htmlFor="property-city">City</Label><Input id="property-city" name="city" /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="property-region">State</Label><Input id="property-region" name="region" /></div>
              <div className="space-y-2"><Label htmlFor="property-postal">Postal code</Label><Input id="property-postal" name="postalCode" /></div></div>
            <div className="flex gap-3 sm:col-span-2"><Button type="submit" className="min-h-11">Create account</Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setShowNewAccount(false)}>Cancel</Button></div>
          </form></CardContent>
        </Card>
      )}

      {showQuickAdd && (
        <Card>
          <CardHeader><CardTitle>New lead</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-3" onSubmit={submitLead}>
              <div className="space-y-2"><Label htmlFor="lead-name">Contact name</Label><Input id="lead-name" name="contactName" autoComplete="name" /></div>
              <div className="space-y-2"><Label htmlFor="lead-email">Email</Label><Input id="lead-email" name="email" type="email" autoComplete="email" /></div>
              <div className="space-y-2"><Label htmlFor="lead-phone">Phone</Label><Input id="lead-phone" name="phone" type="tel" autoComplete="tel" /></div>
              <div className="sm:col-span-3"><Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add lead'}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      {notice && <p role="status" aria-live="polite" className="text-sm text-blue-800">{notice}</p>}
      {managingLead && (
        <Card role="dialog" aria-modal="true" aria-labelledby="lead-action-heading">
          <CardHeader><CardTitle id="lead-action-heading">Manage lead</CardTitle></CardHeader>
          <CardContent><form className="space-y-4" onSubmit={submitLeadAction}>
            <p className="text-sm text-gray-700">Update {managingLead.contact_name || managingLead.email || 'this lead'}.</p>
            <div className="space-y-2"><Label htmlFor="lead-action">Action</Label>
              <select id="lead-action" name="action" value={leadAction}
                onChange={(event) => setLeadAction(event.target.value as Lead['status'])}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="contacted">Mark contacted</option><option value="junk">Mark junk</option>
                <option value="merged">Merge into lead</option><option value="disqualified">Disqualify</option>
              </select></div>
            {leadAction === 'junk' && <div className="space-y-2"><Label htmlFor="lead-junk-note">Junk reason</Label>
              <textarea id="lead-junk-note" name="note" required maxLength={1000}
                className="min-h-24 w-full rounded-md border border-gray-300 p-3" /></div>}
            {leadAction === 'merged' && <div className="space-y-2"><Label htmlFor="merge-lead">Merge into</Label>
              <select id="merge-lead" name="mergedIntoLeadId" required
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="">Choose a lead</option>{(board.leads ?? []).filter((lead) => lead.id !== managingLead.id
                  && ['new', 'contacted'].includes(lead.status)).map((lead) =>
                  <option key={lead.id} value={lead.id}>{lead.contact_name || lead.email || lead.id}</option>)}</select></div>}
            {leadAction === 'disqualified' && <div className="space-y-2"><Label htmlFor="lead-loss-reason">Disqualification reason</Label>
              <select id="lead-loss-reason" name="lossReasonId" required
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="">Choose a reason</option>{board.loss_reasons.filter((reason) => reason.applies_to === 'both'
                  || reason.applies_to === 'disqualified').map((reason) =>
                  <option key={reason.id} value={reason.id}>{reason.label}</option>)}</select></div>}
            <div className="flex gap-3"><Button type="submit" className="min-h-11">Save lead</Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setManagingLead(null)}>Cancel</Button></div>
          </form></CardContent>
        </Card>
      )}
      {outcome && (
        <Card role="dialog" aria-modal="true" aria-labelledby="outcome-heading">
          <CardHeader><CardTitle id="outcome-heading">Record {outcome.stage.label}</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitOutcome}>
              <p className="text-sm text-gray-700">Confirm the outcome for {outcome.opportunity.name}.</p>
              {outcome.stage.category === 'won' ? (
                <div className="space-y-2">
                  <Label htmlFor="manual-win-reason">Manual win reason</Label>
                  <textarea id="manual-win-reason" name="manualWinReason" required maxLength={1000}
                    className="min-h-24 w-full rounded-md border border-gray-300 p-3" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="loss-reason">Reason</Label>
                  <select id="loss-reason" name="lossReasonId" required
                    className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                    <option value="">Choose a reason</option>
                    {board.loss_reasons.filter((reason) => reason.applies_to === 'both'
                      || reason.applies_to === outcome.stage.category).map((reason) => (
                      <option key={reason.id} value={reason.id}>{reason.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="min-h-11">Confirm outcome</Button>
                <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => setOutcome(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {taskFor && (
        <Card role="dialog" aria-modal="true" aria-labelledby="task-heading">
          <CardHeader><CardTitle id="task-heading">Add next action</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitTask}>
              <p className="text-sm text-gray-700">Create a task for {taskFor.name}.</p>
              <div className="space-y-2">
                <Label htmlFor="task-title">Task</Label>
                <Input id="task-title" name="title" required maxLength={240} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due date and time</Label>
                <Input id="task-due" name="dueAt" type="datetime-local" />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="min-h-11">Add next action</Button>
                <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => setTaskFor(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {editingOpportunity && (
        <Card role="dialog" aria-modal="true" aria-labelledby="opportunity-heading">
          <CardHeader><CardTitle id="opportunity-heading">Edit opportunity</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitOpportunity}>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="opportunity-name">Name</Label>
                <Input id="opportunity-name" name="name" required maxLength={200} defaultValue={editingOpportunity.name} /></div>
              <div className="space-y-2"><Label htmlFor="service-family">Service family</Label>
                <Input id="service-family" name="serviceFamily" maxLength={120} defaultValue={editingOpportunity.service_family} /></div>
              <div className="space-y-2"><Label htmlFor="expected-close">Expected close date</Label>
                <Input id="expected-close" name="expectedCloseDate" type="date" defaultValue={editingOpportunity.expected_close_date} /></div>
              <div className="space-y-2"><Label htmlFor="opportunity-value">Value (USD)</Label>
                <Input id="opportunity-value" name="valueAmount" type="number" min="0" step="0.01"
                  defaultValue={editingOpportunity.value_amount_minor === undefined ? '' : editingOpportunity.value_amount_minor / 100} /></div>
              <div className="space-y-2"><Label htmlFor="value-basis">Value basis</Label>
                <select id="value-basis" name="valueBasis" defaultValue={editingOpportunity.value_basis ?? 'monthly'}
                  className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                  <option value="one_time">One time</option><option value="per_visit">Per visit</option>
                  <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select></div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" className="min-h-11">Save opportunity</Button>
                <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => setEditingOpportunity(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {walkthroughFor && (
        <Card role="dialog" aria-modal="true" aria-labelledby="walkthrough-heading">
          <CardHeader><CardTitle id="walkthrough-heading">Schedule walkthrough</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitWalkthrough}>
              <p className="text-sm text-gray-700 sm:col-span-2">Schedule a site window for {walkthroughFor.name}.</p>
              <div className="space-y-2"><Label htmlFor="walkthrough-start">Starts</Label>
                <Input id="walkthrough-start" name="windowStart" type="datetime-local" required /></div>
              <div className="space-y-2"><Label htmlFor="walkthrough-end">Ends</Label>
                <Input id="walkthrough-end" name="windowEnd" type="datetime-local" required /></div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" className="min-h-11">Schedule walkthrough</Button>
                <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => setWalkthroughFor(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {assigningOpportunity && (
        <Card role="dialog" aria-modal="true" aria-labelledby="assignment-heading">
          <CardHeader><CardTitle id="assignment-heading">Assign opportunity</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitAssignment}>
              <div className="space-y-2"><Label htmlFor="opportunity-owner">Owner</Label>
                <select id="opportunity-owner" name="ownerUserId" required
                  defaultValue={assigningOpportunity.owner_user_id}
                  className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                  {board.assignable_members.map((member) => <option key={member.user_id}
                    value={member.user_id}>{member.label} ({member.role})</option>)}
                </select></div>
              <div className="space-y-2"><Label htmlFor="opportunity-estimator">Estimator</Label>
                <select id="opportunity-estimator" name="estimatorUserId"
                  defaultValue={assigningOpportunity.estimator_user_id ?? ''}
                  className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                  <option value="">Unassigned</option>
                  {board.assignable_members.map((member) => <option key={member.user_id}
                    value={member.user_id}>{member.label} ({member.role})</option>)}
                </select></div>
              <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
                <input type="checkbox" name="transferOpenTasks" /> Transfer matching open tasks
              </label>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" className="min-h-11">Save assignment</Button>
                <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => setAssigningOpportunity(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {qualifyingOpportunity && (
        <Card role="dialog" aria-modal="true" aria-labelledby="qualification-heading">
          <CardHeader><CardTitle id="qualification-heading">Record qualification</CardTitle></CardHeader>
          <CardContent><form className="space-y-4" onSubmit={submitQualification}>
            <p className="text-sm text-amber-800">The default checklist is not operator-validated yet. Record the reviewed outcome and notes only.</p>
            <div className="space-y-2"><Label htmlFor="qualification-outcome">Outcome</Label><select id="qualification-outcome" name="outcome"
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
              <option value="fit">Fit</option><option value="needs_review">Needs specialist review</option><option value="not_fit">Not a fit</option>
            </select></div>
            <div className="space-y-2"><Label htmlFor="qualification-notes">Qualification notes</Label><textarea id="qualification-notes"
              name="operatorNotes" maxLength={5000} className="min-h-24 w-full rounded-md border border-gray-300 p-3" /></div>
            <div className="space-y-2"><Label htmlFor="qualification-loss">Disqualification reason (required for Not a fit)</Label>
              <select id="qualification-loss" name="lossReasonId" className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="">Choose a reason</option>{board.loss_reasons.filter((reason) => reason.applies_to === 'both' || reason.applies_to === 'disqualified')
                  .map((reason) => <option key={reason.id} value={reason.id}>{reason.label}</option>)}</select></div>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="specialistReview" /> Flag for specialist review</label>
            <div className="flex gap-3"><Button type="submit" className="min-h-11">Save qualification</Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setQualifyingOpportunity(null)}>Cancel</Button></div>
          </form></CardContent>
        </Card>
      )}
      {duplicateReview && (
        <Card aria-labelledby="duplicate-heading">
          <CardHeader><CardTitle id="duplicate-heading">Review possible duplicate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">Choose whether to link this lead to a matching record or keep it separate. Nothing is merged automatically.</p>
            {duplicateReview.candidates.map((candidate) => (
              <div key={`${candidate.entity_type}-${candidate.entity_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                <span className="text-sm text-gray-700">Matching {candidate.entity_type} by {candidate.matched_on}</span>
                <Button type="button" variant="outline" disabled={saving} onClick={() => void createLead(
                  duplicateReview.draft, duplicateReview.key, 'link_existing', candidate.entity_id,
                )}>Link existing</Button>
              </div>
            ))}
            <Button type="button" disabled={saving} onClick={() => void createLead(
              duplicateReview.draft, duplicateReview.key, 'create_new',
            )}>Create separate lead</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2" aria-label="Pipeline view">
        <Button className="min-h-11" type="button" variant={view === 'board' ? 'default' : 'outline'} aria-pressed={view === 'board'} onClick={() => setView('board')}>Board</Button>
        <Button className="min-h-11" type="button" variant={view === 'list' ? 'default' : 'outline'} aria-pressed={view === 'list'} onClick={() => setView('list')}>List</Button>
        <Button className="min-h-11" type="button" variant={followUpOnly ? 'default' : 'outline'}
          aria-pressed={followUpOnly} onClick={() => setFollowUpOnly((value) => !value)}>Needs follow-up</Button>
      </div>

      {(board.leads ?? []).length > 0 && <Card>
        <CardHeader><CardTitle>Open leads</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(board.leads ?? []).map((lead) => <article key={lead.id} className="rounded-md border p-4">
            <h3 className="font-medium">{lead.contact_name || lead.email || lead.phone || 'Unnamed lead'}</h3>
            {lead.property_name && <p className="mt-1 text-sm text-gray-600">{lead.property_name}</p>}
            <p className="mt-1 text-xs capitalize text-gray-500">{lead.status}</p>
            {board.caller_role !== 'viewer' && ['new', 'contacted'].includes(lead.status) &&
              <Button type="button" variant="outline" className="mt-3 min-h-11"
                onClick={() => { setLeadAction('contacted'); setManagingLead(lead); }}>Manage lead</Button>}
          </article>)}
        </CardContent>
      </Card>}

      {view === 'board' ? <div className="overflow-x-auto pb-4" aria-label={`${activePipeline.name} pipeline`}>
        <div className="flex min-w-max gap-4">
          {activePipeline.stages.filter((stage) => !stage.hidden).map((stage) => {
            const opportunities = shownOpportunities.filter((item) => item.stage_id === stage.id);
            return (
              <section key={stage.id} aria-labelledby={`stage-${stage.id}`} className="w-72 rounded-lg bg-gray-100 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h2 id={`stage-${stage.id}`} className="font-semibold text-gray-900">{stage.label}</h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-600" aria-label={`${opportunities.length} opportunities`}>{opportunities.length}</span>
                </div>
                <div className="space-y-3">
                  {opportunities.length === 0 && <p className="rounded border border-dashed border-gray-300 p-3 text-sm text-gray-500">No opportunities</p>}
                  {opportunities.map((opportunity) => (
                    <article key={opportunity.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                      <h3 className="font-medium text-gray-900">{opportunity.name}</h3>
                      {valueLabel(opportunity) && <p className="mt-2 text-sm text-gray-600">{valueLabel(opportunity)}</p>}
                      {opportunity.next_action_due_at && <p className="mt-2 text-xs text-gray-500">Next action {new Date(opportunity.next_action_due_at).toLocaleDateString()}</p>}
                      {board.caller_role !== 'viewer' && stageMove(opportunity)}
                      {board.caller_role !== 'viewer' && (
                        <div className="mt-2 grid gap-2"><Button type="button" variant="outline" className="min-h-11 w-full"
                          onClick={() => setEditingOpportunity(opportunity)}>Edit details</Button>
                        <Button type="button" variant="outline" className="min-h-11 w-full"
                          onClick={() => setTaskFor(opportunity)}>Add next action</Button>
                        {opportunity.property_id && opportunity.estimator_user_id && (
                          <Button type="button" variant="outline" className="min-h-11 w-full"
                            onClick={() => setWalkthroughFor(opportunity)}>Schedule walkthrough</Button>
                        )}
                        {['owner', 'admin'].includes(board.caller_role) && (
                          <Button type="button" variant="outline" className="min-h-11 w-full"
                            onClick={() => setAssigningOpportunity(opportunity)}>Change assignment</Button>
                        )}<Button type="button" variant="outline" className="min-h-11 w-full"
                          onClick={() => setQualifyingOpportunity(opportunity)}>Record qualification</Button></div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">{activePipeline.name} opportunities</caption>
            <thead className="bg-gray-50"><tr>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">Opportunity</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">Stage</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">Value</th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold">Move</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {shownOpportunities.map((opportunity) => (
                <tr key={opportunity.id}>
                  <th scope="row" className="px-4 py-3 text-left text-sm font-medium">{opportunity.name}</th>
                  <td className="px-4 py-3 text-sm">{activePipeline.stages.find((stage) => stage.id === opportunity.stage_id)?.label}</td>
                  <td className="px-4 py-3 text-sm">{valueLabel(opportunity) ?? '—'}</td>
                  <td className="px-4 py-3">{board.caller_role === 'viewer' ? 'Read only' : (
                    <div>{stageMove(opportunity)}<div className="mt-2 flex gap-2">
                      <Button type="button" variant="outline" className="min-h-11"
                        onClick={() => setEditingOpportunity(opportunity)}>Edit details</Button>
                      <Button type="button" variant="outline" className="min-h-11"
                        onClick={() => setTaskFor(opportunity)}>Add next action</Button>
                      {opportunity.property_id && opportunity.estimator_user_id && (
                        <Button type="button" variant="outline" className="min-h-11"
                          onClick={() => setWalkthroughFor(opportunity)}>Schedule walkthrough</Button>
                      )}
                      {['owner', 'admin'].includes(board.caller_role) && (
                        <Button type="button" variant="outline" className="min-h-11"
                          onClick={() => setAssigningOpportunity(opportunity)}>Change assignment</Button>
                      )}<Button type="button" variant="outline" className="min-h-11"
                        onClick={() => setQualifyingOpportunity(opportunity)}>Record qualification</Button></div></div>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {board.viewer_price_redacted && <p className="text-xs text-gray-500">Pricing is hidden for read-only viewers.</p>}
    </section>
  );
}
