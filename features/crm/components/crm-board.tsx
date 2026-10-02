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
  pipelines: Pipeline[];
  opportunities: Opportunity[];
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
        <Button onClick={() => setShowQuickAdd((open) => !open)} aria-expanded={showQuickAdd}>
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

      <div className="overflow-x-auto pb-4" aria-label={`${activePipeline.name} pipeline`}>
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
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {board.viewer_price_redacted && <p className="text-xs text-gray-500">Pricing is hidden for read-only viewers.</p>}
    </section>
  );
}
