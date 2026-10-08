'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type Package = {
  associationId: string;
  displayPosition: number;
  title: string;
  scope: string[];
  amountMinor: number;
  currency: string;
  pricingBasis: 'per_visit' | 'per_turn' | 'one_time';
};

type Receipt = {
  receiptId: string;
  proposalVersionId: string;
  acceptedAt: string;
  selectedAssociationIds: string[];
  selectedSubtotalMinor: number;
  fullOfferedTotalMinor: number;
  currency: string;
  consentVersion?: string;
  receiptSha256: string;
  replayed?: boolean;
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
  consent: { version: 'veltex-c0-acceptance-v1'; text: string };
  acceptanceEnabled: boolean;
  receipt: Receipt | null;
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
  const [responseNotice, setResponseNotice] = useState('');
  const [acceptanceNotice, setAcceptanceNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestKey = useRef<string | null>(null);
  const requestFingerprint = useRef<string | null>(null);
  const acceptanceRequestKey = useRef<string | null>(null);
  const acceptanceFingerprint = useRef<string | null>(null);
  const [selectedAssociationIds, setSelectedAssociationIds] = useState<string[]>([]);
  const [signerEnteredName, setSignerEnteredName] = useState('');
  const [signerEnteredEmail, setSignerEnteredEmail] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [reviewingAcceptance, setReviewingAcceptance] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let fragment = '';
      try {
        fragment = window.sessionStorage.getItem('veltex:c0:proposal-fragment') ?? '';
        window.sessionStorage.removeItem('veltex:c0:proposal-fragment');
      } catch { /* fail closed to an existing session cookie */ }
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
  const selectedPackages = useMemo(() => room?.packages.filter((item) =>
    selectedAssociationIds.includes(item.associationId)) ?? [], [room, selectedAssociationIds]);
  const receiptPackages = useMemo(() => !room?.receipt ? [] : room.packages.filter((item) =>
    room.receipt?.selectedAssociationIds.includes(item.associationId)), [room]);
  const selectedSubtotalMinor = useMemo(() => selectedPackages.reduce((total, item) =>
    total + item.amountMinor, 0), [selectedPackages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canRespond || !message.trim() || submitting) return;
    const payload = { kind, message: message.trim(), displayName: displayName.trim() || null };
    const fingerprint = JSON.stringify(payload);
    if (!requestKey.current || requestFingerprint.current !== fingerprint) {
      requestKey.current = crypto.randomUUID();
      requestFingerprint.current = fingerprint;
    }
    setSubmitting(true); setResponseNotice('Sending your response…');
    try {
      const response = await fetch('/api/public/proposal-room/responses', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': requestKey.current },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('response');
      setMessage('');
      requestKey.current = null;
      requestFingerprint.current = null;
      setResponseNotice(kind === 'declined' ? 'Your decline was recorded.' : 'Your response was sent.');
    } catch {
      setResponseNotice('We could not send that response. Your text is still here so you can try again.');
    } finally { setSubmitting(false); }
  }

  async function submitAcceptance() {
    if (!room?.acceptanceEnabled || accepting || !consentChecked
        || selectedAssociationIds.length === 0 || !signerEnteredName.trim()
        || !signerEnteredEmail.trim()) return;
    const orderedIds = room.packages.filter((item) => selectedAssociationIds.includes(item.associationId))
      .map((item) => item.associationId);
    const payload = { selectedAssociationIds: orderedIds,
      signerEnteredName: signerEnteredName.trim(), signerEnteredEmail: signerEnteredEmail.trim() };
    const fingerprint = JSON.stringify(payload);
    if (!acceptanceRequestKey.current || acceptanceFingerprint.current !== fingerprint) {
      acceptanceRequestKey.current = crypto.randomUUID();
      acceptanceFingerprint.current = fingerprint;
    }
    setAccepting(true); setAcceptanceNotice('Recording your proposal acceptance…');
    try {
      const response = await fetch('/api/public/proposal-room/acceptance', {
        method: 'POST', headers: { 'content-type': 'application/json',
          'idempotency-key': acceptanceRequestKey.current }, body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('acceptance');
      const result = await response.json() as { data: Receipt };
      setRoom((current) => current ? { ...current, acceptanceEnabled: false,
        allowedActions: [], receipt: { ...result.data,
          consentVersion: current.consent.version } } : current);
      setAcceptanceNotice(result.data.replayed
        ? 'Your existing acceptance receipt is shown below.'
        : 'Your proposal acceptance was recorded.');
      setReviewingAcceptance(false);
    } catch {
      setAcceptanceNotice('We could not confirm acceptance. Your selections are still here; try again safely.');
    } finally { setAccepting(false); }
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
          {item.scope.map((line, index) => <li key={`${index}:${line}`}>{line}</li>)}
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
        <p aria-live="polite" className="text-sm text-slate-700">{responseNotice}</p>
      </form>
    </section>}

    <section className="border-t border-slate-200 py-6 print:border-0" aria-labelledby="accept-heading">
      <h2 id="accept-heading" className="text-xl font-semibold text-slate-950">Accept proposal</h2>
      {room.receipt ? <article className="mt-4 break-words rounded-xl border border-emerald-300 bg-emerald-50 p-4" aria-label="Proposal acceptance receipt">
        <h3 className="font-semibold text-emerald-950">Acceptance receipt</h3>
        <dl className="mt-3 grid gap-2 text-sm text-emerald-950 sm:grid-cols-2">
          <div><dt className="font-medium">Accepted</dt><dd>{new Date(room.receipt.acceptedAt).toLocaleString()}</dd></div>
          <div><dt className="font-medium">Proposal version</dt><dd>{room.versionNumber}</dd></div>
          <div><dt className="font-medium">Selected packages</dt><dd>{room.receipt.selectedAssociationIds.length}</dd></div>
          <div className="sm:col-span-2"><dt className="font-medium">Accepted package details</dt><dd>
            <ul className="mt-1 space-y-1">{receiptPackages.map((item) => <li key={item.associationId}>
              {item.title} — {money(item.amountMinor,item.currency)} · {basis(item.pricingBasis)}
            </li>)}</ul>
          </dd></div>
          <div><dt className="font-medium">Selected subtotal</dt><dd>{money(room.receipt.selectedSubtotalMinor,room.receipt.currency)}</dd></div>
          <div><dt className="font-medium">Full offered total</dt><dd>{money(room.receipt.fullOfferedTotalMinor,room.receipt.currency)}</dd></div>
          <div><dt className="font-medium">Consent version</dt><dd>{room.receipt.consentVersion ?? room.consent.version}</dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className="font-medium">Receipt reference</dt><dd className="break-all font-mono text-xs">{room.receipt.receiptId}</dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className="font-medium">Receipt SHA-256</dt><dd className="break-all font-mono text-xs">{room.receipt.receiptSha256}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-emerald-900">This records proposal/package acceptance only. It is not an electronic signature, identity verification, payment, scheduling, or service-delivery confirmation.</p>
        <button type="button" onClick={() => window.print()} className="mt-4 min-h-11 rounded-lg border border-emerald-800 bg-white px-4 py-2 font-medium text-emerald-950 print:hidden">Print receipt</button>
      </article> : room.acceptanceEnabled ? <div className="mt-4 space-y-4">
        {!reviewingAcceptance ? <>
          <fieldset className="space-y-3"><legend className="font-medium text-slate-900">Select packages to accept</legend>
            <p className="text-sm text-slate-600">Nothing is selected automatically. Select at least one package.</p>
            {room.packages.map((item) => <label key={item.associationId} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-slate-300 p-3">
              <input type="checkbox" className="mt-1" checked={selectedAssociationIds.includes(item.associationId)}
                onChange={(event) => { setReviewingAcceptance(false); setSelectedAssociationIds((current) => event.target.checked
                  ? [...current,item.associationId] : current.filter((id) => id!==item.associationId)); }} />
              <span className="min-w-0 flex-1"><span className="font-medium text-slate-950">{item.title}</span>
                <span className="block text-sm text-slate-600">{money(item.amountMinor,item.currency)} · {basis(item.pricingBasis)}</span></span>
            </label>)}
          </fieldset>
          <div className="rounded-lg bg-slate-50 p-3 text-sm"><p>Selected subtotal: <strong>{money(selectedSubtotalMinor,room.currency)}</strong></p>
            <p>Full offered total: <strong>{money(room.fullOfferedTotalMinor,room.currency)}</strong></p></div>
          <label className="block text-sm font-medium text-slate-800">Name you enter
            <input value={signerEnteredName} maxLength={160} autoComplete="name" onChange={(event) => { setSignerEnteredName(event.target.value); setReviewingAcceptance(false); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
          <label className="block text-sm font-medium text-slate-800">Email you enter
            <input value={signerEnteredEmail} maxLength={320} type="email" autoComplete="email" onChange={(event) => { setSignerEnteredEmail(event.target.value); setReviewingAcceptance(false); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3" /></label>
          <p className="text-xs text-slate-600">The name and email are entered by you. Veltex does not verify your identity, and this is not an electronic-signature process.</p>
          <label className="flex min-h-11 items-start gap-3 rounded-lg border border-slate-300 p-3 text-sm text-slate-800">
            <input type="checkbox" className="mt-1" checked={consentChecked} onChange={(event) => { setConsentChecked(event.target.checked); setReviewingAcceptance(false); }} />
            <span>{room.consent.text}</span>
          </label>
          <button type="button" disabled={!consentChecked || selectedAssociationIds.length===0 || !signerEnteredName.trim() || !signerEnteredEmail.trim()}
            onClick={() => setReviewingAcceptance(true)} className="min-h-11 w-full rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">Review acceptance</button>
        </> : <div className="rounded-xl border border-slate-300 p-4" aria-labelledby="final-review-heading">
          <h3 id="final-review-heading" className="font-semibold text-slate-950">Final review</h3>
          <p className="mt-2 text-sm text-slate-700">You are accepting {selectedPackages.length} selected package{selectedPackages.length===1?'':'s'} for {money(selectedSubtotalMinor,room.currency)} from a full offered total of {money(room.fullOfferedTotalMinor,room.currency)}.</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">{selectedPackages.map((item) => <li key={item.associationId}>
            {item.title} — {money(item.amountMinor,item.currency)} · {basis(item.pricingBasis)}
          </li>)}</ul>
          <p className="mt-2 text-sm text-slate-700">This records proposal/package acceptance only. It does not create an electronic signature, verify identity, take payment, schedule work, or confirm service delivery.</p>
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => setReviewingAcceptance(false)} className="min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-medium">Back</button>
            <button type="button" disabled={accepting} onClick={() => void submitAcceptance()} className="min-h-11 rounded-lg bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50">{accepting?'Recording…':'Accept selected packages'}</button></div>
        </div>}
      </div> : <><p className="mt-2 text-sm text-slate-700">Online acceptance is not enabled for this review. {room.allowedActions.length > 0 ? 'You can respond above.' : 'Contact the sender if you need help or want to request changes.'}</p>
        <button disabled className="mt-4 min-h-11 rounded-lg bg-slate-300 px-4 py-2 font-medium text-slate-600">Accept proposal — unavailable</button></>}
      <p aria-live="polite" className="mt-3 text-sm text-slate-700">{acceptanceNotice}</p>
    </section>
  </main>;
}
