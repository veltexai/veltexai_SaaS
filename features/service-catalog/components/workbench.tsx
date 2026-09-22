'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CatalogDocument } from './catalog-document';
import type { ProposalFormData } from '@/features/proposals/schemas/proposal';
import { CATALOG, defaultJob, getService } from '../catalog';
import { businessProfileSchema, CatalogJob, JobType } from '../schema';
import { estimateJob } from '../pricing';
import { catalogRequestSchema } from '../proposal';
import { CostFields } from './cost-fields';

type Client = ProposalFormData['global_inputs'];
const blankClient: Client = { client_name: '', client_email: '', contact_phone: '', service_location: '', facility_size: 1500, service_frequency: 'bi-weekly' };
const usd = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
export function CatalogWorkbench({ initialProposal, proposalId, templateId, initialJobType, demo = false }: {
  initialProposal?: ProposalFormData; proposalId?: string; templateId?: string; initialJobType?: JobType; demo?: boolean;
}) {
  const router = useRouter();
  const [job, setJob] = useState<CatalogJob>(() => initialProposal?.service_specific_data.catalogJob ?? { ...defaultJob(initialJobType), ...(demo ? { access: 'Host provides lockbox access and safe parking.' } : {}) });
  const [client, setClient] = useState<Client>(initialProposal?.global_inputs ?? (demo ? { ...blankClient, client_name: 'Sample customer', client_email: 'sample@example.com', contact_phone: '555-0100', service_location: 'Example property — replace before saving' } : blankClient));
  const [preview, setPreview] = useState<ProposalFormData>();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [profileNotice, setProfileNotice] = useState('');
  const revision = useRef(0), inFlight = useRef(false);
  const [hazard, setHazard] = useState(false);
  const selectedTemplate = initialProposal?.template_id ?? templateId;
  useEffect(() => { if (initialProposal || demo) return; let active = true; const started = revision.current;
    fetch('/api/service-catalog/profile').then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => {
      if (!active) return;
      const p = businessProfileSchema.safeParse(data.profile);
      if (p.success && started === revision.current) { setJob(current => ({ ...current, costs: { ...p.data.costs } })); setProfileNotice('Loaded your business cost assumptions.'); }
    }).catch(() => { if (active) setProfileNotice('Business defaults unavailable. Review the example costs below.'); });
    return () => { active = false; };
  }, [initialProposal, demo]);
  function changeJob(next: CatalogJob) { revision.current++; setJob(next); setPreview(undefined); setError(''); }
  function changeClient(key: keyof Client, value: string) { revision.current++; setClient(c => ({ ...c, [key]: value })); setPreview(undefined); }
  let estimate: ReturnType<typeof estimateJob> | undefined;
  try { estimate = estimateJob(job); } catch { /* Field validation is surfaced when preparing the draft. */ }
  const service = getService(job.jobType);
  async function prepare() {
    if (inFlight.current) return;
    setError(''); setPreview(undefined);
    if (hazard) { setError('Hazardous or regulated work cannot be priced in Release 1. Arrange a qualified assessment.'); return; }
    const request = catalogRequestSchema.safeParse({ job, client, templateId: selectedTemplate, proposalId });
    if (!request.success) { setError(request.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')); return; }
    inFlight.current = true; setBusy(true); const atStart = revision.current;
    try {
      const r = await fetch('/api/service-catalog/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request.data) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      if (atStart === revision.current) setPreview(data); else setError('Inputs changed. Prepare the draft again.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to prepare draft. Retry.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function save() {
    if (!preview || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const r = await fetch(proposalId ? `/api/proposals/${proposalId}` : '/api/proposals', { method: proposalId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...preview, status: initialProposal?.status ?? 'draft' }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      router.push(`/dashboard/proposals/${proposalId ?? data.id}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Your inputs remain here.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const numberField = (key: 'squareFeet' | 'bedrooms' | 'bathrooms' | 'applianceInteriors', label: string) => <label className="space-y-1 text-sm">{label}<Input type="number" min="0" step={key === 'bathrooms' ? '0.5' : '1'} value={job[key]} onChange={e => changeJob({ ...job, [key]: Number(e.target.value) })} /></label>;
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-3xl font-bold">Residential and turnover proposal</h1><p className="mt-2 text-gray-600">Capture the job, review the suggested price, then prepare your proposal. All costs are editable planning assumptions.</p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm underline"><Link href="/dashboard/proposals/quick">Commercial quick flow</Link><Link href="/dashboard/proposals/new">Existing service builder</Link><Link href="/dashboard/settings#business-services">Business markets and costs</Link></div>
      {demo && <p className="mt-3 rounded border border-amber-300 p-3">Sample job. Replace customer details and verify all assumptions before saving.</p>}
    </header>
    <fieldset disabled={busy} className="grid min-w-0 gap-6 lg:grid-cols-2">
      <section className="min-w-0 space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Job and customer</h2>
        <label className="block text-sm">Market<select className="mt-1 w-full rounded border p-2" value={job.segment} onChange={e => changeJob({ ...defaultJob(e.target.value === 'short_term_rental' ? 'airbnb_turnover' : 'recurring_standard'), costs: job.costs })}><option value="residential">Residential</option><option value="short_term_rental">Short-term rental</option></select></label>
        <label className="block text-sm">Job type<select className="mt-1 w-full rounded border p-2" value={job.jobType} onChange={e => changeJob({ ...defaultJob(e.target.value as JobType), costs: job.costs })}>{CATALOG.filter(s => s.segment === job.segment).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <p className="text-xs text-gray-500">Changing market or job type resets the job questions; customer details and cost assumptions remain.</p>
        <div className="grid gap-3 sm:grid-cols-2">{(['client_name', 'client_email', 'contact_phone', 'service_location'] as const).map((key, i) => <label key={key} className="text-sm">{['Client name', 'Client email', 'Client phone', 'Service location'][i]}<Input required type={key === 'client_email' ? 'email' : 'text'} value={client[key]} onChange={e => changeClient(key, e.target.value)} /></label>)}</div>
        <label className="block text-sm">Property type<select className="mt-1 w-full rounded border p-2" value={job.propertyType} onChange={e => changeJob({ ...job, propertyType: e.target.value as CatalogJob['propertyType'] })}>{['house', 'apartment', 'condo', 'townhouse'].map(p => <option key={p}>{p}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2">{numberField('squareFeet', 'Cleanable square feet')}{numberField('bedrooms', 'Bedrooms')}{numberField('bathrooms', 'Bathrooms')}{numberField('applianceInteriors', 'Appliance interiors')}</div>
        <label className="block text-sm">Frequency<select className="mt-1 w-full rounded border p-2" value={job.frequency} onChange={e => changeJob({ ...job, frequency: e.target.value as CatalogJob['frequency'] })}>{service.frequencies.map(f => <option key={f} value={f}>{f}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Occupancy<select className="mt-1 w-full rounded border p-2" value={job.occupancy} onChange={e => changeJob({ ...job, occupancy: e.target.value as CatalogJob['occupancy'] })}><option value="occupied">Occupied</option><option value="vacant">Vacant</option></select></label>
        <label className="text-sm">Condition<select className="mt-1 w-full rounded border p-2" value={job.condition} onChange={e => changeJob({ ...job, condition: e.target.value as CatalogJob['condition'] })}>{['light', 'normal', 'heavy'].map(c => <option key={c}>{c}</option>)}</select></label></div>
        <div className="flex flex-wrap gap-4">{(['pets', 'suppliesProvided'] as const).map(key => <label className="text-sm" key={key}><input type="checkbox" checked={job[key]} onChange={e => changeJob({ ...job, [key]: e.target.checked })} /> {key === 'pets' ? 'Pets present' : 'Customer supplies cleaning products'}</label>)}</div>
        <label className="block text-sm">Access, parking, stairs and scheduling<Input value={job.access} onChange={e => changeJob({ ...job, access: e.target.value })} /></label>
        <label className="block text-sm"><input type="checkbox" checked={hazard} onChange={e => { setHazard(e.target.checked); changeJob(job); }} /> Hazardous or regulated materials present (stops this estimate)</label>
        {job.turnover && <fieldset className="space-y-3 rounded border p-3"><legend>Turnover requirements</legend>
          <div className="grid gap-3 sm:grid-cols-2">{(['checkout', 'checkin'] as const).map(key => <label key={key}>{key === 'checkout' ? 'Checkout' : 'Check-in'}<Input type="time" value={job.turnover![key]} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, [key]: e.target.value } })} /></label>)}</div>
          <label className="block text-sm">Laundry loads<Input type="number" min="0" value={job.turnover.laundryLoads} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, laundryLoads: Number(e.target.value) } })} /></label>
          {(['restocking', 'inspection', 'damageDocumentation'] as const).map(key => <label className="block text-sm" key={key}><input type="checkbox" checked={job.turnover![key]} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, [key]: e.target.checked } })} /> {{ restocking: 'Restock customer inventory', inspection: 'Departure inspection', damageDocumentation: 'Document visible damage' }[key]}</label>)}
        </fieldset>}
        <label className="block text-sm">Customer-facing scope notes and agreed terms<Textarea value={job.operatorNotes} onChange={e => changeJob({ ...job, operatorNotes: e.target.value })} /></label>
      </section>
      <section className="min-w-0 space-y-4 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Suggested-price workbench</h2><p className="text-sm">{profileNotice || 'Example costs: replace these with your business costs.'}</p>
        <CostFields costs={job.costs} onChange={costs => changeJob({ ...job, costs })} />
        <p className="text-xs text-gray-600">Crew size changes elapsed time, not person-hours. Overhead applies to direct costs; margin uses price = cost ÷ (1 − margin). Add access and urgency costs to travel or labor hours. Supplies are zero when the customer provides them.</p>
        {estimate && !hazard && <div className="space-y-3">
          <p className="text-sm text-gray-600">Labor model: use the greater of area ÷ {estimate.drivers.squareFeetPerPersonHour} sq ft/person-hour or the room minimum ({estimate.drivers.roomMinimumHours} hours), multiply by condition ({estimate.drivers.conditionMultiplier}) and recurrence ({estimate.drivers.recurrenceMultiplier}), then add {estimate.drivers.additionalHours} hours for selected tasks. {job.costs.laborHours !== undefined ? 'Your person-hour override replaces that model.' : ''}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">{Object.entries({ 'Person-hours': estimate.base.laborHours, 'Elapsed crew hours': estimate.base.elapsedCrewHours, 'Burdened labor': usd(estimate.base.labor), Supplies: usd(estimate.base.supplies), Equipment: usd(estimate.base.equipment), Travel: usd(estimate.base.travel), Overhead: usd(estimate.base.overhead), 'Modeled cost': usd(estimate.base.cost), 'Minimum adjustment': usd(estimate.base.minimumAdjustment), 'Margin amount': usd(estimate.base.marginAmount) }).map(([key, value]) => <div key={key}><dt className="text-gray-600">{key}</dt><dd className="font-medium">{value}</dd></div>)}</dl>
          <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left font-semibold">Planning scenarios per visit</caption><thead><tr><th className="text-left">Low</th><th className="text-left">Base</th><th className="text-left">High</th></tr></thead><tbody><tr>{[estimate.low, estimate.base, estimate.high].map((s, i) => <td key={i}>{usd(s.suggestedPrice)}</td>)}</tr></tbody></table></div>
          <p className="text-lg font-semibold">Working price: {usd(estimate.selectedPrice)} / visit</p><p className="text-sm">{job.frequency === 'one-time' ? 'One-time job' : `Monthly planning amount: ${usd(estimate.periodPrice)}`}. Effective margin after overhead: {estimate.effectiveMarginPercent}%.</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">{estimate.warnings.map(w => <li key={w}>{w}</li>)}</ul>
        </div>}
        <label className="block text-sm"><input type="checkbox" checked={Boolean(job.override)} onChange={e => changeJob({ ...job, override: e.target.checked ? { pricePerVisit: estimate?.base.suggestedPrice ?? 120, reason: '' } : undefined })} /> Override suggested price</label>
        {job.override && <><label className="block text-sm">Operator price per visit ($)<Input type="number" value={job.override.pricePerVisit} onChange={e => changeJob({ ...job, override: { ...job.override!, pricePerVisit: Number(e.target.value) } })} /></label><label className="block text-sm">Override reason (internal)<Textarea value={job.override.reason} onChange={e => changeJob({ ...job, override: { ...job.override!, reason: e.target.value } })} /></label></>}
        <Button onClick={prepare} disabled={busy || hazard}>{busy ? 'Working…' : 'Prepare / regenerate draft'}</Button>
      </section>
    </fieldset>
    {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm">{error}</p>}
    {preview && <section className="space-y-4 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Review proposal</h2><p className="text-sm">Edit the inputs and customer-facing notes above, then regenerate. Prices and scope remain tied to the saved assumptions.</p><CatalogDocument content={preview.generated_content ?? ''} /><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : proposalId ? 'Save revised proposal' : 'Save proposal'}</Button></section>}
  </div>;
}
