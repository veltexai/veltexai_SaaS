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
  category: string;
  value_amount_minor?: number;
  value_basis?: string;
  currency?: string;
  next_action_due_at?: string;
};
type Board = {
  organization_id: string;
  caller_role: 'owner' | 'admin' | 'estimator' | 'viewer';
  pipelines: Pipeline[];
  opportunities: Opportunity[];
  loss_reasons: { id: string; label: string; applies_to: 'lost' | 'disqualified' | 'both' }[];
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
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [outcome, setOutcome] = useState<{ opportunity: Opportunity; stage: Stage } | null>(null);
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
        <Button className="min-h-11" onClick={() => setShowQuickAdd((open) => !open)} aria-expanded={showQuickAdd}>
          <Plus className="mr-2 h-4 w-4" />Quick-add lead
        </Button>
      </div>

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
      </div>

      {view === 'board' ? <div className="overflow-x-auto pb-4" aria-label={`${activePipeline.name} pipeline`}>
        <div className="flex min-w-max gap-4">
          {activePipeline.stages.filter((stage) => !stage.hidden).map((stage) => {
            const opportunities = board.opportunities.filter((item) => item.stage_id === stage.id);
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
              {board.opportunities.map((opportunity) => (
                <tr key={opportunity.id}>
                  <th scope="row" className="px-4 py-3 text-left text-sm font-medium">{opportunity.name}</th>
                  <td className="px-4 py-3 text-sm">{activePipeline.stages.find((stage) => stage.id === opportunity.stage_id)?.label}</td>
                  <td className="px-4 py-3 text-sm">{valueLabel(opportunity) ?? '—'}</td>
                  <td className="px-4 py-3">{board.caller_role === 'viewer' ? 'Read only' : stageMove(opportunity)}</td>
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
