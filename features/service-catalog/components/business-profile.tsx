'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATALOG } from '../catalog';
import { businessProfileSchema, BusinessProfile, DEFAULT_COSTS, segmentSchema } from '../schema';
import { CostFields } from './cost-fields';

export function BusinessServiceProfile() {
  const [profile, setProfile] = useState<BusinessProfile>({ markets: ['residential'], services: [], costs: { ...DEFAULT_COSTS }, equipment: [] });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [loadFailed, setLoadFailed] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { let active = true;
    fetch('/api/service-catalog/profile').then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data; }).then(data => {
      if (active && data.profile) setProfile(businessProfileSchema.parse(data.profile));
    }).catch(() => { if (active) { setLoadFailed(true); setMessage('Could not load business assumptions. Retry by refreshing before saving.'); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function save() {
    const parsed = businessProfileSchema.safeParse(profile);
    if (!parsed.success) { setMessage(parsed.error.issues.map(i => i.message).join('; ')); return; }
    setBusy(true); setMessage('');
    try { const r = await fetch('/api/service-catalog/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data) }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setMessage('Business assumptions saved. New jobs can use these defaults.'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to save.'); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border bg-white p-6">
    <h2 className="text-xl font-semibold">Markets and services</h2>
    <p className="text-sm text-gray-600">Optional business setup. Choose what you offer and review your costs; each job remains editable. Specialty markets retain the existing builder.</p>
    {loading ? <p>Loading business profile…</p> : <>
      <fieldset className="flex flex-wrap gap-4"><legend className="mb-2 font-medium">Markets served</legend>{segmentSchema.options.map(m => <label key={m}><input type="checkbox" checked={profile.markets.includes(m)} onChange={e => setProfile({ ...profile, markets: e.target.checked ? [...profile.markets, m] : profile.markets.filter(v => v !== m) })} /> {m.replaceAll('_', ' ')}</label>)}</fieldset>
      <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-2 font-medium">Release 1 services offered</legend>{CATALOG.map(s => <label key={s.id}><input type="checkbox" checked={profile.services.includes(s.id)} onChange={e => setProfile({ ...profile, services: e.target.checked ? [...profile.services, s.id] : profile.services.filter(v => v !== s.id) })} /> {s.label}</label>)}</fieldset>
      <CostFields costs={profile.costs} onChange={costs => setProfile({ ...profile, costs })} />
      <label className="block text-sm">Equipment available (comma separated)<Input value={profile.equipment.join(', ')} onChange={e => setProfile({ ...profile, equipment: e.target.value ? e.target.value.split(',').map(v => v.trim()) : [] })} /></label>
      <Button disabled={busy || loadFailed} onClick={save}>{busy ? 'Saving…' : 'Save business assumptions'}</Button>
    </>}
    <p role="status" className="text-sm">{message}</p>
  </section>;
}
