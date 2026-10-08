'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Package = {
  associationId: string;
  displayPosition: number;
  title: string;
  scope: string[];
  amountMinor: number;
  currency: string;
  pricingBasis: 'per_visit' | 'per_turn' | 'one_time';
};

type Room = {
  organization: { displayName: string };
  proposalVersionId: string;
  versionNumber: number;
  renderedContent: string;
  packages: Package[];
  fullOfferedTotalMinor: number;
  currency: string;
  allowedActions: Array<'question' | 'change_requested' | 'declined'>;
  acceptanceEnabled: false;
  expiresAt: string;
};

const unavailable = 'This proposal room is unavailable. Request a new link from the sender.';

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
}

function basis(value: Package['pricingBasis']) {
  return value === 'per_visit' ? 'per visit' : value === 'per_turn' ? 'per turnover' : 'one time';
}

export default function ProposalRoomPage() {
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [kind, setKind] = useState<'question' | 'change_requested' | 'declined'>('question');
  const [message, setMessage] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fragment = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1) : '';
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      try {
        if (fragment) {
          const exchange = await fetch('/api/public/proposal-room/session', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ token: fragment }), cache: 'no-store',
          });
          if (!exchange.ok) throw new Error('exchange');
        }
        const response = await fetch('/api/public/proposal-room', { cache: 'no-store' });
        if (!response.ok) throw new Error('room');
        const payload = await response.json();
        if (!cancelled) { setRoom(payload.data); setState('ready'); }
      } catch {
        if (!cancelled) setState('unavailable');
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const canRespond = useMemo(() => room?.allowedActions.includes(kind) ?? false, [room, kind]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canRespond || !message.trim() || submitting) return;
    setSubmitting(true); setNotice('Sending your response…');
    try {
      const response = await fetch('/api/public/proposal-room/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ kind, message, displayName: displayName.trim() || null }),
      });
      if (!response.ok) throw new Error('response');
      setMessage('');
      setNotice(kind === 'declined' ? 'Your decline was recorded.' : 'Your response was sent.');
    } catch {
      setNotice('We could not send that response. Your text is still here so you can try again.');
    } finally { setSubmitting(false); }
  }

  if (state === 'loading') return <main className="mx-auto min-h-screen max-w-3xl p-6" aria-busy="true">
    <p className="text-slate-600">Opening your proposal securely…</p>
  </main>;
  if (state === 'unavailable' || !room) return <main className="mx-auto min-h-screen max-w-3xl p-6">
    <h1 className="text-2xl font-semibold text-slate-950">Proposal unavailable</h1>
    <p className="mt-3 text-slate-700">{unavailable}</p>
  </main>;

  return <main className="mx-auto min-h-screen w-full max-w-3xl overflow-x-hidden px-4 py-6 sm:px-6">
    <header className="border-b border-slate-200 pb-5">
      <p className="text-sm font-medium text-slate-600">Proposal from {room.organization.displayName}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Proposal review</h1>
      <p className="mt-2 text-sm text-slate-600">Version {room.versionNumber} · Review expires {new Date(room.expiresAt).toLocaleString()}</p>
    </header>

    <section className="py-6" aria-labelledby="proposal-details">
      <h2 id="proposal-details" className="text-xl font-semibold text-slate-950">Proposal details</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{room.renderedContent}</p>
    </section>

    <section className="space-y-4 border-t border-slate-200 py-6" aria-labelledby="service-packages">
      <h2 id="service-packages" className="text-xl font-semibold text-slate-950">Service packages</h2>
      {room.packages.map((item) => <article key={item.associationId} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="font-semibold text-slate-950">{item.title}</h3>
          <p className="shrink-0 font-semibold text-slate-950">{money(item.amountMinor, item.currency)} <span className="font-normal text-slate-600">{basis(item.pricingBasis)}</span></p>
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {item.scope.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </article>)}
      <div className="flex items-center justify-between border-t border-slate-300 pt-4 text-lg font-semibold">
        <span>Full offered total</span><span>{money(room.fullOfferedTotalMinor, room.currency)}</span>
      </div>
    </section>

    {room.allowedActions.length > 0 && <section className="border-t border-slate-200 py-6" aria-labelledby="respond-heading">
      <h2 id="respond-heading" className="text-xl font-semibold text-slate-950">Respond to this proposal</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <fieldset>
          <legend className="text-sm font-medium text-slate-800">Response type</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {([['question','Ask a question'],['change_requested','Request changes'],['declined','Decline']] as const).map(([value,label]) =>
              <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                <input type="radio" name="response-kind" value={value} checked={kind===value} onChange={() => setKind(value)} /> {label}
              </label>)}
          </div>
        </fieldset>
        <label className="block text-sm font-medium text-slate-800">Your name <span className="font-normal text-slate-500">(optional)</span>
          <input value={displayName} maxLength={160} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" />
        </label>
        <label className="block text-sm font-medium text-slate-800">Message
          <textarea required value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-slate-300 p-3" />
        </label>
        <button disabled={submitting || !message.trim()} className="min-h-11 w-full rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{submitting ? 'Sending…' : 'Send response'}</button>
        <p aria-live="polite" className="text-sm text-slate-700">{notice}</p>
      </form>
    </section>}

    <section className="border-t border-slate-200 py-6" aria-labelledby="accept-heading">
      <h2 id="accept-heading" className="text-xl font-semibold text-slate-950">Accept proposal</h2>
      <p className="mt-2 text-sm text-slate-700">Online acceptance is not enabled for this review yet. You can ask a question, request changes, or decline above.</p>
      <button disabled className="mt-4 min-h-11 rounded-lg bg-slate-300 px-4 py-2 font-medium text-slate-600">Accept proposal — unavailable</button>
    </section>
  </main>;
}
