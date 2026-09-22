'use client';
import { captureEvent } from '@/lib/analytics/client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CatalogDocument } from './catalog-document';
import type { ProposalFormData } from '@/features/proposals/schemas/proposal';
import { CATALOG, defaultJob, getService } from '../catalog';
import { ZodError } from 'zod';
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
  const [job, setJob] = useState<CatalogJob>(() => initialProposal?.service_specific_data.catalogJob ?? { ...defaultJob(initialJobType), ...(demo ? { demo: true } : {}) });
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
  let validation = '';
  const fieldLabels: Record<string, string> = { squareFeet: 'Cleanable square feet', wage: 'Hourly wage', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', reason: 'Override reason', checkin: 'Check-in', roundingIncrement: 'Rounding increment' };
  try { estimate = estimateJob(job); } catch (e) { validation = e instanceof ZodError ? e.issues.map(i => `${fieldLabels[String(i.path[i.path.length - 1])] ?? 'Job details'}: ${i.message.includes('nan') ? 'Enter a number to calculate your price.' : i.message}`).join('; ') : 'Review the job quantities and costs to calculate your price.'; }
  const viewed = useRef(false), seenEstimates = useRef(new Set<string>());
  const telemetry = { job_type: job.jobType, catalog_version: job.catalogVersion, business_segment: job.segment, demo: Boolean(demo || job.demo) };
  useEffect(() => {
    if (!viewed.current) { viewed.current = true; captureEvent('catalog_workbench_viewed', telemetry); if (demo) captureEvent('demo_started', { demo_type: 'catalog', package_type: job.jobType }); }
    if (estimate && !hazard && !seenEstimates.current.has(job.jobType)) { seenEstimates.current.add(job.jobType); captureEvent('catalog_estimate_visible', telemetry); }
  }, [job.jobType, Boolean(estimate), hazard]);
  const service = getService(job.jobType, job.catalogVersion);
  function switchType(id: JobType) {
    const defaults = defaultJob(id);
    changeJob({ ...job, jobType: id, segment: defaults.segment, frequency: defaults.frequency,
      occupancy: ['move_in_out', 'airbnb_turnover'].includes(id) ? 'vacant' : job.occupancy,
      scopeOmissions: undefined,
      turnover: id === 'airbnb_turnover' ? job.turnover ?? defaults.turnover : undefined });
  }
  async function prepare() {
    if (inFlight.current) return;
    setError(''); setPreview(undefined);
    if (hazard) { setError('Hazardous or regulated work cannot be priced in Release 1. Arrange a qualified assessment.'); return; }
    const request = catalogRequestSchema.safeParse({ job, client, templateId: selectedTemplate, proposalId });
    if (!request.success) { captureEvent('catalog_validation_failed', telemetry); setError(request.error.issues.map(i => `${i.path[i.path.length - 1].toString().replace(/_/g, ' ')}: ${i.message}`).join('; ')); return; }
    inFlight.current = true; setBusy(true); const atStart = revision.current;
    try {
      const r = await fetch('/api/service-catalog/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request.data) });
      const data = await r.json(); if (!r.ok) throw new Error(data.details?.length ? data.details.map((i: { message: string }) => i.message).join('; ') : data.error);
      if (atStart === revision.current) setPreview(data); else setError('Inputs changed. Prepare the draft again.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to prepare draft. Retry.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function save() {
    if (!preview || inFlight.current || demo || job.demo) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const r = await fetch(proposalId ? `/api/proposals/${proposalId}` : '/api/proposals', { method: proposalId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...preview, status: initialProposal?.status ?? 'draft' }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.details?.length ? data.details.map((i: { message: string }) => i.message).join('; ') : data.error);
      router.push(`/dashboard/proposals/${proposalId ?? data.id}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Your inputs remain here.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const numberField = (key: 'squareFeet' | 'bedrooms' | 'bathrooms' | 'applianceInteriors' | 'levels' | 'hardFloorPercent' | 'monthsSinceClean' | 'occupants', label: string) => <label className="space-y-1 text-sm">{label}<Input type="number" min="0" step={key === 'bathrooms' ? '0.5' : '1'} value={typeof job[key] === 'number' && Number.isNaN(job[key]) ? '' : job[key] ?? ''} onChange={e => changeJob({ ...job, [key]: e.target.value === '' ? NaN : Number(e.target.value) })} /></label>;
  return <div className="mx-auto max-w-6xl space-y-6">
    <header><h1 className="text-3xl font-bold">Residential and turnover proposal</h1><p className="mt-2 text-gray-600">Capture the job, review the suggested price, then prepare your proposal. All costs are editable planning assumptions.</p><p className="mt-2 text-sm text-gray-600">Catalog proposals use the standard complete-scope layout with your company branding.</p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm underline"><Link href="/dashboard/proposals/quick">Commercial quick flow</Link><Link href="/dashboard/proposals/new">Existing service builder</Link><Link href="/dashboard/settings#business-services">Business markets and costs</Link></div>
      {demo && <p className="mt-3 rounded border border-amber-300 p-3">Sample job. Saving is disabled for sample jobs. <Link className="underline" href={`/dashboard/proposals/category?job=${job.jobType}`}>Start a real job</Link> to prepare a customer proposal.</p>}
    </header>
    <div className="sticky top-0 z-10 rounded-xl border bg-white p-4 shadow-sm" aria-live="polite">
      {hazard ? <p role="alert">Stop: hazardous work requires a qualified assessment.</p> : estimate ? <><p className="text-xl font-bold">Suggested price: {usd(estimate.selectedPrice)} / {job.turnover ? 'turn' : 'visit'}</p><p className="text-sm">{job.bedrooms} bedrooms · {job.bathrooms} bathrooms · {estimate.base.laborHours} person-hours · {estimate.effectiveMarginPercent}% margin</p></> : <p role="alert">Review your inputs: {validation}</p>}
    </div>
    <fieldset disabled={busy} className="grid min-w-0 gap-6 lg:grid-cols-2">
      <section className="min-w-0 space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Job and customer</h2>
        <label className="block text-sm">Market<select className="mt-1 w-full rounded border p-2" value={job.segment} onChange={e => switchType(e.target.value === 'short_term_rental' ? 'airbnb_turnover' : 'recurring_standard')}><option value="residential">Residential</option><option value="short_term_rental">Short-term rental</option></select></label>
        <label className="block text-sm">Job type<select className="mt-1 w-full rounded border p-2" value={job.jobType} onChange={e => switchType(e.target.value as JobType)}>{CATALOG.filter(s => s.segment === job.segment).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <p className="text-xs text-gray-500">Property details and costs stay with you when changing services. Turnover and vacant-property requirements adapt to the selected service.</p>

        <label className="block text-sm">Property type<select className="mt-1 w-full rounded border p-2" value={job.propertyType} onChange={e => changeJob({ ...job, propertyType: e.target.value as CatalogJob['propertyType'] })}>{['house', 'apartment', 'condo', 'townhouse'].map(p => <option key={p}>{p}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2">{numberField('squareFeet', 'Cleanable square feet')}{numberField('bedrooms', 'Bedrooms')}{numberField('bathrooms', 'Bathrooms')}{numberField('applianceInteriors', 'Appliance interiors')}</div>
        {job.jobType === 'recurring_standard' && <label className="block text-sm"><input type="checkbox" checked={job.initialClean ?? false} onChange={e => changeJob({ ...job, initialClean: e.target.checked })} /> Include a separately priced initial detailed clean (uses deep-clean labor model and current costs)</label>}
        <label className="block text-sm">Frequency<select className="mt-1 w-full rounded border p-2" value={job.frequency} onChange={e => changeJob({ ...job, frequency: e.target.value as CatalogJob['frequency'] })}>{service.frequencies.map(f => <option key={f} value={f}>{{ 'one-time': job.turnover ? 'Per turn agreement' : 'One-time visit', weekly: 'Weekly', 'bi-weekly': 'Every two weeks', '1x-month': 'Monthly' }[f]}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Occupancy<select className="mt-1 w-full rounded border p-2" value={job.occupancy} onChange={e => changeJob({ ...job, occupancy: e.target.value as CatalogJob['occupancy'] })}><option value="occupied">Occupied</option><option value="vacant">Vacant</option></select></label>
        <label className="text-sm">Condition<select className="mt-1 w-full rounded border p-2" value={job.condition} onChange={e => changeJob({ ...job, condition: e.target.value as CatalogJob['condition'] })}>{['light', 'normal', 'heavy'].map(c => <option key={c}>{c}</option>)}</select></label></div>
        <div className="flex flex-wrap gap-4">{(['pets', 'suppliesProvided'] as const).map(key => <label className="text-sm" key={key}><input type="checkbox" checked={job[key]} onChange={e => changeJob({ ...job, [key]: e.target.checked })} /> {key === 'pets' ? 'Pets present' : 'Customer supplies cleaning products'}</label>)}</div>
        <label className="block text-sm">Internal access notes (never shown to customer)<Input value={job.access} onChange={e => changeJob({ ...job, access: e.target.value })} /></label>
        {/(?:code|lockbox|gate|alarm|entry).{0,30}\d{3,8}|\d{3,8}.{0,30}(?:code|lockbox|gate|alarm|entry)/i.test(job.access) && <p role="status" className="text-sm text-amber-900">Entry code detected. Keep this only in internal access notes.</p>}
        <label className="block text-sm">Customer scheduling (optional; no entry details)<Input value={job.scheduling ?? ''} onChange={e => changeJob({ ...job, scheduling: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">{numberField('levels', 'Levels / stairs')}{numberField('hardFloorPercent', 'Hard flooring (%)')}{numberField('monthsSinceClean', 'Months since professional clean')}{numberField('occupants', 'Occupants')}</div>
        <label className="block text-sm">Clutter<select value={job.clutter ?? 'normal'} onChange={e => changeJob({ ...job, clutter: e.target.value as CatalogJob['clutter'] })}>{['light', 'normal', 'heavy'].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="block text-sm"><input type="checkbox" checked={hazard} onChange={e => { setHazard(e.target.checked); changeJob(job); }} /> Hoarding, mold, bodily fluids, sharps, pests or regulated materials present (stops this estimate)</label>
        {job.turnover && <fieldset className="space-y-3 rounded border p-3"><legend>Turnover requirements</legend>
          <div className="grid gap-3 sm:grid-cols-2">{(['checkout', 'checkin'] as const).map(key => <label key={key}>{key === 'checkout' ? 'Checkout' : 'Check-in'}<Input type="time" value={job.turnover![key]} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, [key]: e.target.value } })} /></label>)}</div>
          <label className="block text-sm"><input type="checkbox" checked={job.turnover.nextDay ?? false} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, nextDay: e.target.checked } })} /> Next-day check-in</label>
          {(['expectedTurns', 'beds', 'linenPar', 'reportWithinHours'] as const).map(key => <label className="block text-sm" key={key}>{{ expectedTurns: 'Expected turns per month', beds: 'Beds to reset', linenPar: 'Linen sets per bed', reportWithinHours: 'Photo / damage report within hours' }[key]}<Input type="number" value={job.turnover![key] ?? ''} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, [key]: Number(e.target.value) } })} /></label>)}
          <label className="block text-sm">Restock checklist<Input value={job.turnover.restockList ?? ''} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, restockList: e.target.value } })} /></label>
          <label className="block text-sm">Laundry loads<Input type="number" min="0" value={job.turnover.laundryLoads} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, laundryLoads: Number(e.target.value) } })} /></label>
          {(['restocking', 'inspection', 'damageDocumentation'] as const).map(key => <label className="block text-sm" key={key}><input type="checkbox" checked={job.turnover![key]} onChange={e => changeJob({ ...job, turnover: { ...job.turnover!, [key]: e.target.checked } })} /> {{ restocking: 'Restock customer inventory', inspection: 'Departure inspection', damageDocumentation: 'Document visible damage' }[key]}</label>)}
        </fieldset>}
        <details><summary>Included scope — uncheck items to omit (price does not automatically change)</summary>{service.inclusions.map(line => <label key={line} className="block text-sm"><input type="checkbox" checked={!job.scopeOmissions?.includes(line)} onChange={e => changeJob({ ...job, scopeOmissions: e.target.checked ? job.scopeOmissions?.filter(s => s !== line) : [...(job.scopeOmissions ?? []), line] })} /> {line}</label>)}</details>
        {(['companyName', 'coverLetter', 'scopeAdditions'] as const).map(key => <label key={key} className="block text-sm">{{ companyName: 'Cleaning company name / signature', coverLetter: 'Custom cover letter (optional)', scopeAdditions: 'Additional agreed scope (optional)' }[key]}<Textarea value={job[key] ?? ''} onChange={e => changeJob({ ...job, [key]: e.target.value })} /></label>)}
        <label className="block text-sm">Customer-facing scope notes and agreed terms<Textarea value={job.operatorNotes} onChange={e => changeJob({ ...job, operatorNotes: e.target.value })} /></label>
      </section>
      <section className="min-w-0 space-y-4 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Suggested-price workbench</h2><p className="text-sm">{profileNotice || 'Example costs: replace these with your business costs.'}</p>
        <details><summary>Your costs (from business profile)</summary><CostFields costs={job.costs} onChange={costs => changeJob({ ...job, costs })} /></details>
        <p className="text-xs text-gray-600">Crew size changes elapsed time, not person-hours. Overhead applies to direct costs; margin uses price = cost ÷ (1 − margin). Add access and urgency costs to travel or labor hours. Supplies are zero when the customer provides them.</p>
        {estimate && !hazard && <div className="space-y-3">
          <p className="text-sm text-gray-600">{job.catalogVersion === '2026-09-22.1' ? 'Original model: greater of area / production rate or room minimum, then condition and frequency factors.' : 'Labor model: 65% of area / production rate + 0.2 hours per bedroom + 0.5 per bathroom + 0.2 per extra level + 0.2 × hard-floor share + 0.08 per occupant above two + 0.04 per month since cleaning (up to 12). Multiply by soil, clutter and frequency factors, then add appliance, pet and turnover tasks.'} Production: {estimate.drivers.squareFeetPerPersonHour} sq ft/person-hour; room workload: {estimate.drivers.roomMinimumHours} hours; soil factor: {estimate.drivers.conditionMultiplier}; frequency factor: {estimate.drivers.recurrenceMultiplier}; extra tasks: {estimate.drivers.additionalHours} hours. {job.costs.laborHours !== undefined ? 'Your person-hour override replaces that model.' : ''}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">{Object.entries({ 'Person-hours': estimate.base.laborHours, 'Elapsed crew hours': estimate.base.elapsedCrewHours, 'Burdened labor': usd(estimate.base.labor), Supplies: usd(estimate.base.supplies), Equipment: usd(estimate.base.equipment), Travel: usd(estimate.base.travel), Overhead: usd(estimate.base.overhead), 'Modeled cost': usd(estimate.base.cost), 'Minimum adjustment': usd(estimate.base.minimumAdjustment), 'Margin amount': usd(estimate.base.marginAmount) }).map(([key, value]) => <div key={key}><dt className="text-gray-600">{key}</dt><dd className="font-medium">{value}</dd></div>)}</dl>
          <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left font-semibold">Planning scenarios per visit</caption><thead><tr><th className="text-left">Low</th><th className="text-left">Base</th><th className="text-left">High</th></tr></thead><tbody><tr>{[estimate.low, estimate.base, estimate.high].map((s, i) => <td key={i}>{usd(s.suggestedPrice)}</td>)}</tr></tbody></table></div>
          <p className="text-lg font-semibold">Working price: {usd(estimate.selectedPrice)} / visit</p><p className="text-sm">{job.frequency === 'one-time' ? 'One-time job' : `Monthly planning amount: ${usd(estimate.periodPrice)}`}. Effective margin after overhead: {estimate.effectiveMarginPercent}%.</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900">{estimate.warnings.map(w => <li key={w}>{w}</li>)}</ul>
        </div>}
        <label className="block text-sm"><input type="checkbox" checked={Boolean(job.override)} onChange={e => changeJob({ ...job, override: e.target.checked ? { pricePerVisit: estimate?.base.suggestedPrice ?? 120, reason: '' } : undefined })} /> Override suggested price</label>
        {job.override && <><label className="block text-sm">Operator price per visit ($)<Input type="number" value={job.override.pricePerVisit} onChange={e => changeJob({ ...job, override: { ...job.override!, pricePerVisit: Number(e.target.value) } })} /></label><label className="block text-sm">Override reason (internal)<Textarea value={job.override.reason} onChange={e => changeJob({ ...job, override: { ...job.override!, reason: e.target.value } })} /></label></>}
<details className="rounded border p-3"><summary>Customer details — needed when preparing your proposal</summary>        <div className="grid gap-3 sm:grid-cols-2">{(['client_name', 'client_email', 'contact_phone', 'service_location'] as const).map((key, i) => <label key={key} className="text-sm">{['Client name', 'Client email', 'Client phone', 'Service location'][i]}<Input required type={key === 'client_email' ? 'email' : 'text'} value={client[key]} onChange={e => changeClient(key, e.target.value)} /></label>)}</div></details>
        <p className="text-sm text-amber-900">Review costs, scope and scheduling before saving. These unvalidated planning assumptions require your approval.</p>
        <Button onClick={prepare} disabled={busy || hazard}>{busy ? 'Working…' : 'Prepare / regenerate draft'}</Button>
      </section>
    </fieldset>
    {error && <p role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm">{error}</p>}
    {preview && <section className="space-y-4 rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Review proposal</h2><p className="text-sm">Edit the inputs and customer-facing notes above, then regenerate. Prices and scope remain tied to the saved assumptions.</p><CatalogDocument content={preview.generated_content ?? ''} /><Button disabled={busy || demo || job.demo} onClick={save}>{busy ? 'Saving…' : proposalId ? 'Save revised proposal' : 'Save proposal'}</Button></section>}
  </div>;
}
