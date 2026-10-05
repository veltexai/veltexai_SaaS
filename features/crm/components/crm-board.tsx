'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

type Stage = { id: string; label: string; category: string; position: number; hidden: boolean };
type Pipeline = {
  id: string;
  name: string;
  segment?: 'commercial' | 'residential_turnover';
  is_default: boolean;
  stages: Stage[];
};
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
  segment?: 'commercial' | 'residential' | 'turnover' | 'specialty';
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
  existing_contact_id?: string;
};
type WorkPackage = {
  id: string;
  opportunity_id: string;
  property_id: string;
  status: 'scoping' | 'walkthrough_scheduled' | 'estimated' | 'proposed' | 'accepted' | 'declined';
  walkthrough_id?: string;
  proposal_id?: string;
  loss_reason_id?: string;
  updated_at: string;
};
type Walkthrough = {
  id: string; opportunity_id: string; property_id: string; estimator_user_id: string;
  site_contact_id?: string; status: 'scheduled' | 'rescheduled' | 'completed'; window_start: string;
  window_end: string; timezone: string; updated_at: string; evidence_notes?: string;
  evidence_completed_at?: string;
};
type EstimateSummary = { estimate_run_id: string; opportunity_id: string; work_package_id?: string;
  engine_version: string; selected_amount_minor: number; currency: string; pricing_basis: string;
  created_at: string };
type Board = {
  organization_id: string;
  caller_role: 'owner' | 'admin' | 'estimator' | 'viewer';
  pipelines: Pipeline[];
  opportunities: Opportunity[];
  leads?: Lead[];
  work_packages?: WorkPackage[];
  walkthroughs?: Walkthrough[];
  estimate_summaries?: EstimateSummary[];
  customers?: { id: string; name: string }[];
  properties?: { id: string; customer_id?: string; name: string }[];
  loss_reasons: { id: string; label: string; applies_to: 'lost' | 'disqualified' | 'both' }[];
  assignable_members: { user_id: string; role: 'owner' | 'admin' | 'estimator'; label: string }[];
  viewer_price_redacted: boolean;
};
type DuplicateCandidate = { entity_type: string; entity_id: string; matched_on: string };
type LeadDraft = { contactName: FormDataEntryValue | null; email: FormDataEntryValue | null; phone: FormDataEntryValue | null };

const WALKTHROUGH_EVIDENCE_SAVE_TIMEOUT_MS = 15_000;

function valueLabel(opportunity: Opportunity) {
  if (opportunity.value_amount_minor === undefined) return null;
  const amount = new Intl.NumberFormat(undefined, {
    style: 'currency', currency: opportunity.currency ?? 'USD',
  }).format(opportunity.value_amount_minor / 100);
  return `${amount} · ${opportunity.value_basis?.replaceAll('_', ' ') ?? 'value'}`;
}

function estimateLabel(summary?: EstimateSummary) {
  if (!summary) return null;
  return `${new Intl.NumberFormat(undefined, { style: 'currency', currency: summary.currency })
    .format(summary.selected_amount_minor / 100)} · ${summary.pricing_basis.replaceAll('_', ' ')}`;
}

function estimateHref(board: Board, opportunity: Opportunity, organizationId: string | null) {
  if (!organizationId || !opportunity.property_id) return null;
  if (!['residential', 'turnover'].includes(opportunity.segment ?? '')
      || ['won', 'lost', 'disqualified', 'handed_off'].includes(opportunity.category)) return null;
  const workPackage = (board.work_packages ?? []).find((item) => item.opportunity_id === opportunity.id);
  if (workPackage && !['scoping', 'walkthrough_scheduled', 'estimated'].includes(workPackage.status)) return null;
  return { pathname: `/dashboard/crm/estimate/${opportunity.id}`,
    query: { organizationId, ...(workPackage ? { packageId: workPackage.id } : {}) } };
}

export function CrmBoard() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewOpportunity, setShowNewOpportunity] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [pendingStageByOpportunity, setPendingStageByOpportunity] = useState<Record<string, string>>({});
  const [linkedContactsByLead, setLinkedContactsByLead] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<{ opportunity: Opportunity; stage: Stage } | null>(null);
  const [taskFor, setTaskFor] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [walkthroughFor, setWalkthroughFor] = useState<{
    opportunity: Opportunity; item?: Walkthrough;
  } | null>(null);
  const [evidenceFor, setEvidenceFor] = useState<{
    opportunity: Opportunity; item: Walkthrough;
  } | null>(null);
  const [assigningOpportunity, setAssigningOpportunity] = useState<Opportunity | null>(null);
  const [qualifyingOpportunity, setQualifyingOpportunity] = useState<Opportunity | null>(null);
  const [managingLead, setManagingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [leadAction, setLeadAction] = useState<Lead['status']>('contacted');
  const [packageFor, setPackageFor] = useState<{ opportunity: Opportunity; item?: WorkPackage } | null>(null);
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [duplicateReview, setDuplicateReview] = useState<{
    candidates: DuplicateCandidate[]; draft: LeadDraft; key: string;
  } | null>(null);
  const activeDialog = managingLead || convertingLead || packageFor || outcome || taskFor
    || editingOpportunity || walkthroughFor || evidenceFor || assigningOpportunity || qualifyingOpportunity
    || duplicateReview;

  useEffect(() => {
    if (!activeDialog) return;
    const returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const firstControl = dialog?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    firstControl?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setManagingLead(null); setConvertingLead(null); setPackageFor(null); setOutcome(null);
      setTaskFor(null); setEditingOpportunity(null); setWalkthroughFor(null);
      setEvidenceFor(null);
      setAssigningOpportunity(null); setQualifyingOpportunity(null);
      setDuplicateReview(null);
    };
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      returnTarget?.focus();
    };
  }, [activeDialog]);

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
      const pipelines = payload.data.pipelines ?? [];
      setSelectedPipelineId((current) => current && pipelines.some((item) => item.id === current)
        ? current
        : pipelines.find((item) => item.is_default)?.id ?? pipelines[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load CRM right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBoard(); }, [loadBoard]);

  const activePipeline = useMemo(
    () => board?.pipelines?.find((pipeline) => pipeline.id === selectedPipelineId)
      ?? board?.pipelines?.find((pipeline) => pipeline.is_default) ?? board?.pipelines?.[0],
    [board, selectedPipelineId],
  );
  const shownOpportunities = useMemo(() => board?.opportunities?.filter((opportunity) =>
    opportunity.pipeline_id === activePipeline?.id && (!followUpOnly || opportunity.needs_follow_up)) ?? [],
  [activePipeline?.id, board, followUpOnly]);

  async function moveOpportunity(
    opportunity: Opportunity,
    stageId: string,
    details?: { lossReasonId?: string; manualWinReason?: string; nextActionDueAt?: string },
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
    const nextActionDue = String(form.get('nextActionDueAt') || '');
    await moveOpportunity(outcome.opportunity, outcome.stage.id, {
      lossReasonId: String(form.get('lossReasonId') || '') || undefined,
      manualWinReason: String(form.get('manualWinReason') || '') || undefined,
      nextActionDueAt: nextActionDue ? new Date(nextActionDue).toISOString() : undefined,
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
    const nextActionDue = String(form.get('nextActionDueAt') || '');
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
          nextActionDueAt: nextActionDue ? new Date(nextActionDue).toISOString() : null,
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
    if (!organizationId || !walkthroughFor?.opportunity.property_id
        || !walkthroughFor.opportunity.estimator_user_id) return;
    const form = new FormData(event.currentTarget);
    const start = new Date(String(form.get('windowStart'))).toISOString();
    const end = new Date(String(form.get('windowEnd'))).toISOString();
    let response: Response;
    let payload: { data?: { updated_at?: string }; error?: string } = {};
    try {
      response = await fetch(
        walkthroughFor.item
          ? `/api/orgs/${organizationId}/crm/opportunities/${walkthroughFor.opportunity.id}/walkthroughs/${walkthroughFor.item.id}`
          : `/api/orgs/${organizationId}/crm/opportunities/${walkthroughFor.opportunity.id}/walkthroughs`,
        { method: walkthroughFor.item ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({
          ...(walkthroughFor.item ? { expectedUpdatedAt: walkthroughFor.item.updated_at } : {
            propertyId: walkthroughFor.opportunity.property_id,
            estimatorUserId: walkthroughFor.opportunity.estimator_user_id,
          }),
          windowStart: start, windowEnd: end,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }) },
      );
      try { payload = await response.json(); } catch { payload = {}; }
    } catch {
      setNotice('Unable to schedule the walkthrough. Check your connection and try again.');
      return;
    }
    if (!response.ok) {
      setNotice(payload.error ?? 'Unable to schedule the walkthrough. Check your connection and try again.');
      return;
    }
    if (walkthroughFor.item) {
      setBoard((current) => current ? { ...current,
        walkthroughs: (current.walkthroughs ?? []).map((item) => item.id === walkthroughFor.item?.id
          ? { ...item, status: 'rescheduled', window_start: start, window_end: end,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            updated_at: payload.data?.updated_at ?? item.updated_at }
          : item) } : current);
    } else {
      await loadBoard();
    }
    setWalkthroughFor(null);
    setNotice(walkthroughFor.item ? 'Walkthrough rescheduled.' : 'Walkthrough scheduled.');
  }

  async function cancelWalkthrough() {
    if (!organizationId || !walkthroughFor?.item) return;
    const item = walkthroughFor.item;
    let response: Response;
    let payload: { error?: string } = {};
    try {
      response = await fetch(
        `/api/orgs/${organizationId}/crm/opportunities/${walkthroughFor.opportunity.id}/walkthroughs/${item.id}/cancel`,
        { method: 'POST', headers: { 'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ expectedUpdatedAt: item.updated_at }) },
      );
      try { payload = await response.json(); } catch { payload = {}; }
    } catch {
      setNotice('Unable to cancel the walkthrough. Check your connection and try again.');
      return;
    }
    if (!response.ok) { setNotice(payload.error ?? 'Unable to cancel the walkthrough.'); return; }
    setBoard((current) => current ? { ...current,
      walkthroughs: (current.walkthroughs ?? []).filter((entry) => entry.id !== item.id) } : current);
    setWalkthroughFor(null);
    setNotice('Walkthrough cancelled.');
  }

  async function submitWalkthroughEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !evidenceFor || evidenceFor.item.status === 'completed') return;
    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), WALKTHROUGH_EVIDENCE_SAVE_TIMEOUT_MS);
    setSaving(true);
    setNotice('Saving walkthrough evidence…');
    try {
      const response = await fetch(
        `/api/orgs/${organizationId}/crm/opportunities/${evidenceFor.opportunity.id}`
          + `/walkthroughs/${evidenceFor.item.id}/evidence`,
        { method: 'POST', headers: { 'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID() }, signal: controller.signal, body: JSON.stringify({
          expectedUpdatedAt: evidenceFor.item.updated_at,
          notes: String(form.get('notes') || ''),
          markComplete: form.get('markComplete') === 'on',
        }) },
      );
      let payload: { data?: { evidence_notes?: string; evidence_completed_at?: string; updated_at?: string }; error?: string } = {};
      try { payload = await response.json(); } catch { payload = {}; }
      if (!response.ok || !payload.data?.updated_at) {
        setNotice(payload.error ?? 'Unable to save walkthrough evidence. Try again.');
        return;
      }
      const completed = Boolean(payload.data.evidence_completed_at);
      setBoard((current) => current ? { ...current,
        walkthroughs: (current.walkthroughs ?? []).map((item) => item.id === evidenceFor.item.id
          ? { ...item, evidence_notes: payload.data?.evidence_notes,
            evidence_completed_at: payload.data?.evidence_completed_at,
            status: completed ? 'completed' : item.status,
            updated_at: payload.data?.updated_at ?? item.updated_at }
          : item) } : current);
      setEvidenceFor(null);
      setNotice(completed ? 'Walkthrough evidence completed.' : 'Walkthrough evidence saved.');
    } catch {
      setNotice('Unable to save walkthrough evidence. Check your connection and try again.');
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
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

  async function submitLeadConversion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !convertingLead) return;
    const form = new FormData(event.currentTarget);
    const pipelineId = String(form.get('pipelineId') || '');
    const segment = String(form.get('segment') || '');
    const selectedPipeline = board?.pipelines.find((pipeline) => pipeline.id === pipelineId);
    const compatible = selectedPipeline?.segment === 'commercial'
      ? ['commercial', 'specialty'].includes(segment)
      : selectedPipeline?.segment === 'residential_turnover'
        ? ['residential', 'turnover'].includes(segment)
        : true;
    if (!compatible) {
      setNotice('Choose a pipeline that matches the opportunity segment.');
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/orgs/${organizationId}/crm/leads/${convertingLead.id}/convert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({
        pipelineId,
        opportunityName: String(form.get('opportunityName') || ''),
        segment,
        existingCustomerId: String(form.get('existingCustomerId') || '') || null,
          existingContactId: convertingLead.existing_contact_id
            ?? linkedContactsByLead[convertingLead.id] ?? null,
        existingPropertyId: String(form.get('existingPropertyId') || '') || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? 'Unable to convert the lead.');
      setSaving(false);
      return;
    }
    setConvertingLead(null);
    setNotice('Lead converted to an opportunity.');
    setSaving(false);
    await loadBoard();
  }

  async function submitWorkPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !packageFor?.opportunity.property_id) return;
    if (packageFor.item && packageFor.item.status !== 'scoping') {
      setNotice('This package state is read-only here.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const packageId = packageFor.item?.id ?? crypto.randomUUID();
    const status = String(form.get('status')) as WorkPackage['status'];
    const response = await fetch(`/api/orgs/${organizationId}/crm/opportunities/${packageFor.opportunity.id}/packages/${packageId}`, {
      method: 'PUT', headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ propertyId: packageFor.opportunity.property_id, status,
        expectedUpdatedAt: packageFor.item?.updated_at ?? null }),
    });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? 'Unable to save the work package.'); return; }
    const updatedAt = payload.data.updated_at as string;
    setBoard((current) => {
      if (!current) return current;
      const item: WorkPackage = { id: packageId, opportunity_id: packageFor.opportunity.id,
        property_id: packageFor.opportunity.property_id!, status, updated_at: updatedAt };
      const existing = current.work_packages ?? [];
      return { ...current, work_packages: existing.some((entry) => entry.id === packageId)
        ? existing.map((entry) => entry.id === packageId ? { ...entry, status, updated_at: updatedAt } : entry)
        : [...existing, item] };
    });
    setPackageFor(null); setNotice('Work package saved.');
  }

  function stageMove(opportunity: Opportunity) {
    const selectedStageId = pendingStageByOpportunity[opportunity.id] ?? opportunity.stage_id;
    const source = activePipeline?.stages.find((stage) => stage.id === opportunity.stage_id);
    const allowedTargets: Record<string, string[]> = {
      new: ['new', 'qualifying', 'lost', 'disqualified', 'nurture'],
      qualifying: ['qualifying', 'walkthrough', 'estimating', 'lost', 'disqualified', 'nurture'],
      walkthrough: ['walkthrough', 'estimating', 'lost', 'disqualified', 'nurture'],
      estimating: ['estimating', 'proposing', 'lost', 'disqualified', 'nurture'],
      proposing: ['proposing', 'negotiating', 'won', 'lost', 'disqualified', 'nurture'],
      negotiating: ['negotiating', 'proposing', 'won', 'lost', 'disqualified', 'nurture'],
      nurture: ['nurture', 'qualifying', 'lost', 'disqualified'],
    };
    return (
      <div className="mt-3 flex items-end gap-2">
        <Label className="sr-only" htmlFor={`move-${opportunity.id}`}>Move {opportunity.name}</Label>
        <select
          id={`move-${opportunity.id}`}
          value={selectedStageId}
          onChange={(event) => setPendingStageByOpportunity((current) => ({
            ...current, [opportunity.id]: event.target.value,
          }))}
          className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
          aria-label={`Move ${opportunity.name} to stage`}
        >
          {activePipeline?.stages.filter((stage) => !stage.hidden).map((stage) => (
            <option
              key={stage.id}
              value={stage.id}
              disabled={stage.category === 'handed_off'
                || (stage.id !== opportunity.stage_id
                  && !allowedTargets[source?.category ?? '']?.includes(stage.category))
                || (stage.category === 'won' && !['owner', 'admin'].includes(board?.caller_role ?? 'viewer'))}
            >{stage.label}</option>
          ))}
        </select>
        <Button type="button" variant="outline" className="min-h-11" disabled={selectedStageId === opportunity.stage_id}
          onClick={() => {
            const target = activePipeline?.stages.find((stage) => stage.id === selectedStageId);
            if (!target) return;
            if (['won', 'lost', 'disqualified', 'nurture'].includes(target.category)) setOutcome({ opportunity, stage: target });
            else void moveOpportunity(opportunity, target.id);
          }}>Move</Button>
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
      if (duplicateDecision === 'link_existing' && linkedEntityId
        && duplicateReview?.candidates.some((candidate) => candidate.entity_type === 'contact'
          && candidate.entity_id === linkedEntityId)) {
        setLinkedContactsByLead((current) => ({ ...current, [payload.data.id]: linkedEntityId }));
      }
      setDuplicateReview(null);
      setShowQuickAdd(false);
      await loadBoard();
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
    setShowNewAccount(false);
    await loadBoard();
    setNotice('Customer, primary contact, and property created.');
  }

  async function submitDirectOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const form = new FormData(event.currentTarget);
    const ownerUserId = String(form.get('ownerUserId') || '') || undefined;
    const estimatorUserId = String(form.get('estimatorUserId') || '') || undefined;
    const response = await fetch(`/api/orgs/${organizationId}/crm/opportunities/direct`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify({ opportunityId: crypto.randomUUID(), leadId: crypto.randomUUID(),
        customerId: String(form.get('customerId')), propertyId: String(form.get('propertyId') || '') || null,
        pipelineId: String(form.get('pipelineId')), name: String(form.get('name')),
        ownerUserId, estimatorUserId }),
    });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? 'Unable to create the opportunity.'); return; }
    setShowNewOpportunity(false); setNotice('Opportunity created.'); void loadBoard();
  }

  if (loading) return <p role="status" className="text-sm text-gray-600">Loading CRM…</p>;
  if (error || !board || !activePipeline) {
    return (
      <Card>
        <CardHeader><CardTitle>CRM unavailable</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p role="alert" className="text-sm text-red-700">{error ?? 'No pipeline is configured.'}</p>
          <Button variant="outline" className="min-h-11" onClick={() => void loadBoard()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-labelledby="crm-heading" className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 id="crm-heading" className="text-3xl font-bold text-gray-900">Sales pipeline</h1>
          <p className="mt-1 text-sm text-gray-600">{activePipeline.name}. Values stay separated by billing basis.</p>
        </div>
        {board.caller_role !== 'viewer' && <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11"
          onClick={() => setShowNewAccount((open) => !open)} aria-expanded={showNewAccount}>
          <Plus className="mr-2 h-4 w-4" />New customer</Button>
          <Button variant="outline" className="min-h-11" onClick={() => setShowNewOpportunity((open) => !open)}
            aria-expanded={showNewOpportunity}><Plus className="mr-2 h-4 w-4" />New opportunity</Button>
          <Button className="min-h-11" onClick={() => setShowQuickAdd((open) => !open)} aria-expanded={showQuickAdd}>
            <Plus className="mr-2 h-4 w-4" />Quick-add lead
          </Button></div>}
      </div>

      {showNewOpportunity && (
        <Card><CardHeader><CardTitle>New opportunity</CardTitle></CardHeader>
          <CardContent><form className="grid gap-4 sm:grid-cols-2" onSubmit={submitDirectOpportunity}>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="direct-opportunity-name">Opportunity name</Label>
              <Input id="direct-opportunity-name" name="name" required maxLength={200} /></div>
            <div className="space-y-2"><Label htmlFor="direct-customer">Customer</Label><select id="direct-customer" name="customerId" required
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">Choose a customer</option>
              {(board.customers ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="direct-property">Property</Label><select id="direct-property" name="propertyId"
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">No property yet</option>
              {(board.properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="direct-pipeline">Pipeline</Label><select id="direct-pipeline" name="pipelineId" required
              className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
              {board.pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select></div>
            {['owner','admin'].includes(board.caller_role) && <><div className="space-y-2"><Label htmlFor="direct-owner">Owner</Label>
              <select id="direct-owner" name="ownerUserId" required className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="">Choose an owner</option>{board.assignable_members.map((member) => <option key={member.user_id} value={member.user_id}>{member.label}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="direct-estimator">Estimator</Label><select id="direct-estimator" name="estimatorUserId"
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3"><option value="">Unassigned</option>
                {board.assignable_members.map((member) => <option key={member.user_id} value={member.user_id}>{member.label}</option>)}</select></div></>}
            <div className="flex gap-3 sm:col-span-2"><Button type="submit" className="min-h-11">Create opportunity</Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setShowNewOpportunity(false)}>Cancel</Button></div>
          </form></CardContent></Card>
      )}

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
              <div className="sm:col-span-3"><Button type="submit" className="min-h-11" disabled={saving}>{saving ? 'Adding…' : 'Add lead'}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-blue-800">{notice ?? ''}</p>
      {managingLead && (
        <Card role="dialog" aria-labelledby="lead-action-heading">
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
      {convertingLead && (
        <Card role="dialog" aria-labelledby="lead-conversion-heading">
          <CardHeader><CardTitle id="lead-conversion-heading">Convert lead</CardTitle></CardHeader>
          <CardContent><form className="grid gap-4 sm:grid-cols-2" onSubmit={submitLeadConversion}>
            <p className="text-sm text-gray-700 sm:col-span-2">
              Confirm conversion of {convertingLead.contact_name || convertingLead.email || 'this lead'}.
              Captured contact details will be reused; nothing is merged automatically.
            </p>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="conversion-name">Opportunity name</Label>
              <Input id="conversion-name" name="opportunityName" required maxLength={200}
                defaultValue={convertingLead.property_name || convertingLead.contact_name || 'New opportunity'} /></div>
            <div className="space-y-2"><Label htmlFor="conversion-segment">Segment</Label>
              <select id="conversion-segment" name="segment" required defaultValue="commercial"
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="commercial">Commercial</option><option value="specialty">Specialty</option>
                <option value="residential">Residential</option><option value="turnover">Turnover</option>
              </select></div>
            <div className="space-y-2"><Label htmlFor="conversion-pipeline">Pipeline</Label>
              <select id="conversion-pipeline" name="pipelineId" required defaultValue={activePipeline.id}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                {board.pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
              </select></div>
            <div className="space-y-2"><Label htmlFor="conversion-customer">Existing customer (optional)</Label>
              <select id="conversion-customer" name="existingCustomerId"
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="">Create from this lead</option>{(board.customers ?? []).map((customer) =>
                  <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="conversion-property">Existing property (optional)</Label>
              <select id="conversion-property" name="existingPropertyId"
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="">Create from this lead</option>{(board.properties ?? []).map((property) =>
                  <option key={property.id} value={property.id}>{property.name}</option>)}</select></div>
            <div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" disabled={saving} className="min-h-11">
              {saving ? 'Converting…' : 'Confirm conversion'}</Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setConvertingLead(null)}>Cancel</Button></div>
          </form></CardContent>
        </Card>
      )}
      {packageFor && (
        <Card role="dialog" aria-labelledby="package-heading">
          <CardHeader><CardTitle id="package-heading">Site work package</CardTitle></CardHeader>
          <CardContent>{packageFor.item && packageFor.item.status !== 'scoping' ? <div className="space-y-4">
            <p className="text-sm text-gray-700">This package is <strong>{packageFor.item.status.replaceAll('_', ' ')}</strong>. Its linked evidence and lifecycle state are read-only in this editor.</p>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setPackageFor(null)}>Close</Button>
          </div> : <form className="space-y-4" onSubmit={submitWorkPackage}>
            <p className="text-sm text-gray-700">Track scoped work for {packageFor.opportunity.name}.</p>
            <div className="space-y-2"><Label htmlFor="package-status">Status</Label>
              <select id="package-status" name="status" defaultValue={packageFor.item?.status ?? 'scoping'}
                className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                <option value="scoping">Scoping</option>
              </select></div>
            <p className="text-xs text-gray-600">Walkthrough, proposal, acceptance, and decline states become available only with their required linked evidence.</p>
            <div className="flex gap-3"><Button type="submit" className="min-h-11">Save work package</Button>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => setPackageFor(null)}>Cancel</Button></div>
          </form>}</CardContent>
        </Card>
      )}
      {outcome && (
        <Card role="dialog" aria-labelledby="outcome-heading">
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
              ) : outcome.stage.category === 'nurture' ? (
                <div className="space-y-2">
                  <Label htmlFor="nurture-revisit">Revisit date and time</Label>
                  <Input id="nurture-revisit" name="nextActionDueAt" type="datetime-local" required
                    min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)} />
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
        <Card role="dialog" aria-labelledby="task-heading">
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
        <Card role="dialog" aria-labelledby="opportunity-heading">
          <CardHeader><CardTitle id="opportunity-heading">Edit opportunity</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitOpportunity}>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="opportunity-name">Name</Label>
                <Input id="opportunity-name" name="name" required maxLength={200} defaultValue={editingOpportunity.name} /></div>
              <div className="space-y-2"><Label htmlFor="service-family">Service family</Label>
                <Input id="service-family" name="serviceFamily" maxLength={120} defaultValue={editingOpportunity.service_family} /></div>
              <div className="space-y-2"><Label htmlFor="expected-close">Expected close date</Label>
                <Input id="expected-close" name="expectedCloseDate" type="date" defaultValue={editingOpportunity.expected_close_date} /></div>
              <div className="space-y-2"><Label htmlFor="next-action-due">Next action due</Label>
                <Input id="next-action-due" name="nextActionDueAt" type="datetime-local"
                  defaultValue={editingOpportunity.next_action_due_at?.slice(0, 16) ?? ''} /></div>
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
        <Card role="dialog" aria-labelledby="walkthrough-heading">
          <CardHeader><CardTitle id="walkthrough-heading">{walkthroughFor.item ? 'Manage walkthrough' : 'Schedule walkthrough'}</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitWalkthrough}>
              <p className="text-sm text-gray-700 sm:col-span-2">Schedule a site window for {walkthroughFor.opportunity.name}.</p>
              <div className="space-y-2"><Label htmlFor="walkthrough-start">Starts</Label>
                <Input id="walkthrough-start" name="windowStart" type="datetime-local" required
                  defaultValue={walkthroughFor.item?.window_start.slice(0, 16) ?? ''} /></div>
              <div className="space-y-2"><Label htmlFor="walkthrough-end">Ends</Label>
                <Input id="walkthrough-end" name="windowEnd" type="datetime-local" required
                  defaultValue={walkthroughFor.item?.window_end.slice(0, 16) ?? ''} /></div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" className="min-h-11">{walkthroughFor.item ? 'Reschedule walkthrough' : 'Schedule walkthrough'}</Button>
                {walkthroughFor.item && <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => void cancelWalkthrough()}>Cancel scheduled walkthrough</Button>}
                <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => setWalkthroughFor(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {evidenceFor && (
        <Card role="dialog" aria-labelledby="walkthrough-evidence-heading">
          <CardHeader><CardTitle id="walkthrough-evidence-heading">
            {evidenceFor.item.status === 'completed' ? 'Walkthrough evidence' : 'Record walkthrough evidence'}
          </CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submitWalkthroughEvidence}>
              <p className="text-sm text-gray-700">
                Record factual site observations for {evidenceFor.opportunity.name}. Do not enter door codes,
                alarm codes or other access credentials.
              </p>
              <div className="space-y-2"><Label htmlFor="walkthrough-evidence-notes">Walkthrough notes</Label>
                <Textarea id="walkthrough-evidence-notes" name="notes" required maxLength={5000}
                  disabled={evidenceFor.item.status === 'completed'}
                  defaultValue={evidenceFor.item.evidence_notes ?? ''} /></div>
              {evidenceFor.item.status !== 'completed' && (
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" name="markComplete" /> Mark walkthrough evidence complete
                </label>
              )}
              {evidenceFor.item.evidence_completed_at && <p className="text-sm text-gray-600">
                Completed {new Date(evidenceFor.item.evidence_completed_at).toLocaleString()}.
              </p>}
              <div className="flex flex-wrap gap-3">
                {evidenceFor.item.status !== 'completed' && <Button type="submit" className="min-h-11"
                  disabled={saving}>{saving ? 'Saving…' : 'Save evidence'}</Button>}
                <Button type="button" variant="outline" className="min-h-11"
                  onClick={() => setEvidenceFor(null)}>Close</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {assigningOpportunity && (
        <Card role="dialog" aria-labelledby="assignment-heading">
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
        <Card role="dialog" aria-labelledby="qualification-heading">
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
        <Card role="dialog" aria-labelledby="duplicate-heading">
          <CardHeader><CardTitle id="duplicate-heading">Review possible duplicate</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-700">Choose whether to link this lead to a matching record or keep it separate. Nothing is merged automatically.</p>
            {duplicateReview.candidates.map((candidate) => (
              <div key={`${candidate.entity_type}-${candidate.entity_id}`} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
                <span className="text-sm text-gray-700">Matching {candidate.entity_type} by {candidate.matched_on}</span>
                <Button type="button" variant="outline" disabled={saving} onClick={() => void createLead(
                  duplicateReview.draft, duplicateReview.key, 'link_existing', candidate.entity_id,
                )} className="min-h-11">Link existing</Button>
              </div>
            ))}
            <Button type="button" disabled={saving} onClick={() => void createLead(
              duplicateReview.draft, duplicateReview.key, 'create_new',
            )} className="min-h-11">Create separate lead</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3" aria-label="Pipeline controls">
        <div className="min-w-56 space-y-1">
          <Label htmlFor="active-pipeline">Pipeline</Label>
          <select id="active-pipeline" value={activePipeline.id}
            onChange={(event) => setSelectedPipelineId(event.target.value)}
            className="min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
            {board.pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
          </select>
        </div>
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
              <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11"
                onClick={() => { setLeadAction('contacted'); setManagingLead(lead); }}>Manage lead</Button>
                <Button type="button" className="min-h-11" onClick={() => setConvertingLead(lead)}>Convert lead</Button></div>}
          </article>)}
        </CardContent>
      </Card>}

      {view === 'board' ? <div className="w-full min-w-0 max-w-full overflow-x-auto pb-4" aria-label={`${activePipeline.name} pipeline`}>
        <div className="flex w-max gap-4">
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
                      {estimateLabel((board.estimate_summaries ?? []).find((entry) => entry.opportunity_id === opportunity.id))
                        && <p className="mt-2 text-sm font-medium">Internal planning estimate: {estimateLabel((board.estimate_summaries ?? []).find((entry) => entry.opportunity_id === opportunity.id))}</p>}
                      {opportunity.next_action_due_at && <p className="mt-2 text-xs text-gray-500">Next action {new Date(opportunity.next_action_due_at).toLocaleDateString()}</p>}
                      {board.caller_role !== 'viewer' && stageMove(opportunity)}
                      {board.caller_role !== 'viewer' && (
                        <div className="mt-2 grid gap-2"><Button type="button" variant="outline" className="min-h-11 w-full"
                          onClick={() => setEditingOpportunity(opportunity)}>Edit details</Button>
                        <Button type="button" variant="outline" className="min-h-11 w-full"
                          onClick={() => setTaskFor(opportunity)}>Add next action</Button>
                        {opportunity.property_id && opportunity.estimator_user_id
                          && (board.walkthroughs ?? []).find((entry) => entry.opportunity_id === opportunity.id)?.status !== 'completed' && (
                          <Button type="button" variant="outline" className="min-h-11 w-full"
                            onClick={() => setWalkthroughFor({ opportunity, item: (board.walkthroughs ?? [])
                              .find((entry) => entry.opportunity_id === opportunity.id) })}>
                            {(board.walkthroughs ?? []).some((entry) => entry.opportunity_id === opportunity.id)
                              ? 'Manage walkthrough' : 'Schedule walkthrough'}</Button>
                        )}
                        {(board.walkthroughs ?? []).some((entry) => entry.opportunity_id === opportunity.id) && (
                          <Button type="button" variant="outline" className="min-h-11 w-full"
                            onClick={() => {
                              const item = (board.walkthroughs ?? []).find((entry) => entry.opportunity_id === opportunity.id);
                              if (item) setEvidenceFor({ opportunity, item });
                            }}>
                            {(board.walkthroughs ?? []).find((entry) => entry.opportunity_id === opportunity.id)?.status === 'completed'
                              ? 'Review walkthrough evidence' : 'Record walkthrough evidence'}
                          </Button>
                        )}
                        {opportunity.property_id && <Button type="button" variant="outline" className="min-h-11 w-full"
                          onClick={() => setPackageFor({ opportunity, item: (board.work_packages ?? [])
                            .find((entry) => entry.opportunity_id === opportunity.id) })}>
                          {(board.work_packages ?? []).find((entry) => entry.opportunity_id === opportunity.id)?.status === 'scoping'
                            ? 'Manage work package' : (board.work_packages ?? []).some((entry) => entry.opportunity_id === opportunity.id)
                              ? 'Review work package' : 'Add work package'}</Button>}
                        {estimateHref(board,opportunity,organizationId) && <Button asChild variant="outline" className="min-h-11 w-full"><Link href={estimateHref(board,opportunity,organizationId)!}>Estimate</Link></Button>}
                        {!['residential','turnover'].includes(opportunity.segment ?? '')
                          && <p className="text-xs text-gray-600">Commercial and specialty estimating are not yet supported by the current pricing model.</p>}
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
                  <td className="px-4 py-3 text-sm"><p>{valueLabel(opportunity) ?? '—'}</p>{estimateLabel((board.estimate_summaries ?? []).find((entry) => entry.opportunity_id === opportunity.id))
                    && <p className="mt-1 font-medium">Internal estimate: {estimateLabel((board.estimate_summaries ?? []).find((entry) => entry.opportunity_id === opportunity.id))}</p>}</td>
                  <td className="px-4 py-3">{board.caller_role === 'viewer' ? 'Read only' : (
                    <div>{stageMove(opportunity)}<div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-11"
                        onClick={() => setEditingOpportunity(opportunity)}>Edit details</Button>
                      <Button type="button" variant="outline" className="min-h-11"
                        onClick={() => setTaskFor(opportunity)}>Add next action</Button>
                      {opportunity.property_id && opportunity.estimator_user_id
                        && (board.walkthroughs ?? []).find((entry) => entry.opportunity_id === opportunity.id)?.status !== 'completed' && (
                        <Button type="button" variant="outline" className="min-h-11"
                          onClick={() => setWalkthroughFor({ opportunity, item: (board.walkthroughs ?? [])
                            .find((entry) => entry.opportunity_id === opportunity.id) })}>
                          {(board.walkthroughs ?? []).some((entry) => entry.opportunity_id === opportunity.id)
                            ? 'Manage walkthrough' : 'Schedule walkthrough'}</Button>
                      )}
                      {(board.walkthroughs ?? []).some((entry) => entry.opportunity_id === opportunity.id) && (
                        <Button type="button" variant="outline" className="min-h-11"
                          onClick={() => {
                            const item = (board.walkthroughs ?? []).find((entry) => entry.opportunity_id === opportunity.id);
                            if (item) setEvidenceFor({ opportunity, item });
                          }}>
                          {(board.walkthroughs ?? []).find((entry) => entry.opportunity_id === opportunity.id)?.status === 'completed'
                            ? 'Review walkthrough evidence' : 'Record walkthrough evidence'}
                        </Button>
                      )}
                      {opportunity.property_id && (
                        <Button type="button" variant="outline" className="min-h-11"
                          onClick={() => setPackageFor({ opportunity, item: (board.work_packages ?? [])
                            .find((entry) => entry.opportunity_id === opportunity.id) })}>
                          {(board.work_packages ?? []).find((entry) => entry.opportunity_id === opportunity.id)?.status === 'scoping'
                            ? 'Manage work package' : (board.work_packages ?? []).some((entry) => entry.opportunity_id === opportunity.id)
                              ? 'Review work package' : 'Add work package'}
                        </Button>
                      )}
                      {estimateHref(board,opportunity,organizationId) && <Button asChild variant="outline" className="min-h-11"><Link href={estimateHref(board,opportunity,organizationId)!}>Estimate</Link></Button>}
                      {!['residential','turnover'].includes(opportunity.segment ?? '')
                        && <p className="text-xs text-gray-600">Commercial and specialty estimating are not yet supported by the current pricing model.</p>}
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
