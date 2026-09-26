/**
 * Local disposable U8 outbox claimer spike.
 * Models the committed R2 outbox/inbox contract in memory.
 * Does not install or enable pg_cron, pgmq, QStash, Inngest, or any hosted service.
 */

export const PRODUCTION_REF = 'iwoaaljitifloolszxlu';
export const SPIKE_ATTEMPT_CEILING = 4;
export const SPIKE_VISIBILITY_MS = 1_000;
export const SPIKE_BASE_RETRY_MS = 100;

export function createStore() {
  return {
    nextSequence: 1,
    nextLeaseSerial: 1,
    outbox: [],
    inbox: new Map(),
    locks: new Map(),
  };
}

function issueToken(store) {
  return `lease-${store.nextLeaseSerial++}`;
}

export function enqueue(store, input, now) {
  const row = {
    id: input.id,
    organization_id: input.organization_id,
    event_type: input.event_type,
    event_id: input.event_id,
    aggregate_type: input.aggregate_type,
    aggregate_id: input.aggregate_id,
    payload: { ...input.payload },
    occurred_at: now,
    available_at: now,
    delivered_at: null,
    attempts: 0,
    last_error: null,
    event_sequence: store.nextSequence++,
    dead_lettered_at: null,
    claim_token: null,
  };
  if (store.outbox.some((item) => item.organization_id === row.organization_id && item.event_id === row.event_id)) {
    const error = new Error('unique_violation');
    error.code = '23505';
    throw error;
  }
  store.outbox.push(row);
  return row;
}

export function retryDelayMs(attempts) {
  return SPIKE_BASE_RETRY_MS * 2 ** Math.max(attempts - 1, 0);
}

export function pendingRows(store, now) {
  return store.outbox
    .filter((row) => {
      if (row.delivered_at != null || row.dead_lettered_at != null) return false;
      if (row.available_at > now) return false;
      const lock = store.locks.get(row.id);
      if (lock && lock.until > now) return false;
      return true;
    })
    .sort((a, b) => a.available_at - b.available_at || a.event_sequence - b.event_sequence);
}

export function claimNext(store, now, workerId, visibilityMs = SPIKE_VISIBILITY_MS) {
  const [row] = pendingRows(store, now);
  if (!row) return null;
  const token = issueToken(store);
  row.attempts += 1;
  row.available_at = now + visibilityMs;
  row.claim_token = token;
  store.locks.set(row.id, { workerId, token, until: now + visibilityMs });
  return Object.freeze({
    row,
    workerId,
    token,
    lease_until: now + visibilityMs,
  });
}

function requireCurrentLease(store, claim, now) {
  if (!claim || typeof claim.token !== 'string' || !claim.workerId || !claim.row) {
    const error = new Error('stale_lease');
    error.code = 'stale_lease';
    throw error;
  }
  const lock = store.locks.get(claim.row.id);
  if (!lock || lock.until <= now || lock.workerId !== claim.workerId || lock.token !== claim.token) {
    const error = new Error('stale_lease');
    error.code = 'stale_lease';
    throw error;
  }
}

export function deliver(store, claim, consumer, payloadSha256, now, options = {}) {
  requireCurrentLease(store, claim, now);
  const row = claim.row;
  const key = `${consumer}:${row.event_id}`;
  const snapshot = {
    inbox: store.inbox.has(key) ? { ...store.inbox.get(key) } : null,
    delivered_at: row.delivered_at,
    last_error: row.last_error,
    lock: store.locks.has(row.id) ? { ...store.locks.get(row.id) } : null,
  };
  try {
    const existing = store.inbox.get(key);
    if (existing && existing.payload_sha256 !== payloadSha256) {
      const error = new Error('unique_violation');
      error.code = '23505';
      throw error;
    }
    if (!existing) {
      store.inbox.set(key, {
        consumer,
        event_id: row.event_id,
        organization_id: row.organization_id,
        payload_sha256: payloadSha256,
        received_at: now,
      });
    }
    if (options.injectFaultAfterInbox) {
      const error = new Error('injected_inbox_outbox_fault');
      error.code = 'injected_fault';
      throw error;
    }
    row.delivered_at = now;
    row.last_error = null;
    store.locks.delete(row.id);
    return existing ? 'duplicate_suppressed' : 'delivered';
  } catch (error) {
    if (snapshot.inbox == null) store.inbox.delete(key);
    else store.inbox.set(key, snapshot.inbox);
    row.delivered_at = snapshot.delivered_at;
    row.last_error = snapshot.last_error;
    if (snapshot.lock) store.locks.set(row.id, snapshot.lock);
    else store.locks.delete(row.id);
    throw error;
  }
}

export function fail(store, claim, errorClass, now, ceiling = SPIKE_ATTEMPT_CEILING) {
  requireCurrentLease(store, claim, now);
  const row = claim.row;
  row.last_error = errorClass;
  store.locks.delete(row.id);
  if (row.attempts >= ceiling) {
    row.dead_lettered_at = now;
    return 'dead_letter';
  }
  row.available_at = now + retryDelayMs(row.attempts);
  return 'retry';
}

export function observability(row) {
  return {
    id: row.id,
    event_id: row.event_id,
    event_type: row.event_type,
    event_sequence: row.event_sequence,
    attempts: row.attempts,
    last_error: row.last_error,
    delivered_at: row.delivered_at,
    dead_lettered_at: row.dead_lettered_at,
    available_at: row.available_at,
    claim_token: row.claim_token,
  };
}

export function runRetryCeilingSequence(store, startNow, workerId, eventId) {
  let now = startNow;
  const observed = [];
  let lastStatus = null;
  for (let attempt = 1; attempt <= SPIKE_ATTEMPT_CEILING; attempt += 1) {
    const claim = claimNext(store, now, workerId);
    if (!claim || claim.row.id !== eventId) {
      throw new Error(`retry sequence missed ${eventId} on attempt ${attempt}`);
    }
    lastStatus = fail(store, claim, 'injected_timeout', now);
    if (attempt < SPIKE_ATTEMPT_CEILING) {
      if (lastStatus !== 'retry') throw new Error(`attempt ${attempt} did not schedule retry`);
      observed.push(claim.row.available_at - now);
      now = claim.row.available_at;
    } else if (lastStatus !== 'dead_letter' || claim.row.dead_lettered_at == null) {
      throw new Error('fourth failed attempt did not terminalize in DLQ');
    }
  }
  if (observed.length !== 3 || observed[0] !== 100 || observed[1] !== 200 || observed[2] !== 400) {
    throw new Error(`observed retry schedule ${observed.join(',')} != 100,200,400`);
  }
  return { now, observed_retry_delays_ms: observed, lastStatus };
}

export function cleanup(store) {
  store.outbox.length = 0;
  store.inbox.clear();
  store.locks.clear();
  store.nextSequence = 1;
  store.nextLeaseSerial = 1;
}

export function runLeaseContractScenario() {
  const store = createStore();
  const org = 'org-a';
  const consumer = 'u8-local-spike';
  let now = 1_000;
  enqueue(store, {
    id: 'evt-1', organization_id: org, event_id: 'event-1', event_type: 'proposal.insert',
    aggregate_type: 'proposals', aggregate_id: 'p1', payload: { record_id: 'p1' },
  }, now);
  enqueue(store, {
    id: 'evt-2', organization_id: org, event_id: 'event-2', event_type: 'proposal.insert',
    aggregate_type: 'proposals', aggregate_id: 'p2', payload: { record_id: 'p2' },
  }, now);

  const first = claimNext(store, now, 'A');
  const second = claimNext(store, now, 'A');
  if (first.row.id !== 'evt-1' || second.row.id !== 'evt-2') {
    throw new Error('same-worker double-claim did not move to the next unlocked row');
  }
  if (first.token === second.token) throw new Error('claim tokens were reused');
  if (claimNext(store, now, 'A') != null) throw new Error('same worker reclaimed an unexpired lease');
  if (pendingRows(store, now).length !== 0) throw new Error('unexpired leases were visible as pending');

  now = first.lease_until + 1;
  const reclaimed = claimNext(store, now, 'B');
  if (reclaimed.row.id !== 'evt-1' || reclaimed.token === first.token) {
    throw new Error('expiry did not issue a new lease token');
  }
  try {
    deliver(store, first, consumer, 'a'.repeat(64), now);
    throw new Error('stale success was accepted');
  } catch (error) {
    if (error.code !== 'stale_lease') throw error;
  }
  if (reclaimed.row.delivered_at != null) throw new Error('stale success mutated outbox');
  try {
    fail(store, first, 'stale_failure', now);
    throw new Error('stale failure was accepted');
  } catch (error) {
    if (error.code !== 'stale_lease') throw error;
  }
  if (reclaimed.row.last_error === 'stale_failure') throw new Error('stale failure mutated outbox');

  store.inbox.set(`${consumer}:event-1`, {
    consumer,
    event_id: 'event-1',
    organization_id: org,
    payload_sha256: 'b'.repeat(64),
    received_at: now,
  });
  try {
    deliver(store, reclaimed, consumer, 'a'.repeat(64), now);
    throw new Error('duplicate inbox conflict was accepted');
  } catch (error) {
    if (error.code !== '23505') throw error;
  }
  if (reclaimed.row.delivered_at != null) {
    throw new Error('inbox conflict marked outbox delivered');
  }

  store.inbox.delete(`${consumer}:event-1`);
  try {
    deliver(store, reclaimed, consumer, 'a'.repeat(64), now, { injectFaultAfterInbox: true });
    throw new Error('injected inbox/outbox fault did not fire');
  } catch (error) {
    if (error.code !== 'injected_fault') throw error;
  }
  if (store.inbox.has(`${consumer}:event-1`) || reclaimed.row.delivered_at != null) {
    throw new Error('injected fault persisted inbox or outbox mutation');
  }
  const delivered = deliver(store, reclaimed, consumer, 'a'.repeat(64), now);
  if (delivered !== 'delivered' || reclaimed.row.delivered_at !== now) {
    throw new Error('atomic inbox+outbox completion failed');
  }
  if (!store.inbox.has(`${consumer}:event-1`)) throw new Error('inbox row missing after deliver');
  try {
    deliver(store, reclaimed, consumer, 'a'.repeat(64), now + 1);
    throw new Error('consumed lease was accepted as a replay');
  } catch (error) {
    if (error.code !== 'stale_lease') throw error;
  }

  const leftover = claimNext(store, now, 'A');
  if (leftover.row.id !== 'evt-2') throw new Error('expired second row was not reclaimable');
  deliver(store, leftover, consumer, 'a'.repeat(64), now);
  enqueue(store, {
    id: 'evt-3', organization_id: org, event_id: 'event-3', event_type: 'proposal.insert',
    aggregate_type: 'proposals', aggregate_id: 'p3', payload: { record_id: 'p3' },
  }, now);
  const retry = runRetryCeilingSequence(store, now, 'A', 'evt-3');
  now = retry.now;
  if (pendingRows(store, now + 1).some((row) => row.id === 'evt-3')) {
    throw new Error('terminal DLQ row was reclaimable');
  }

  const evidence = {
    attempt_ceiling: SPIKE_ATTEMPT_CEILING,
    retry_delays_ms: retry.observed_retry_delays_ms,
    rows: store.outbox.map(observability),
    inbox_size: store.inbox.size,
    residue_after_cleanup: null,
    proven_locally: [
      'same-worker double-claim denial',
      'expiry/reclaim with a new lease token',
      'stale-success denial',
      'stale-failure denial',
      'atomic inbox+outbox completion',
      'duplicate inbox conflict',
      'retry ceiling',
      'terminal DLQ after attempt ceiling',
    ],
    not_proven: [
      'hosted pg_cron or pgmq wake',
      'Supabase scheduled-function latency',
      'real HMAC webhook delivery',
    ],
    runtime_choice: 'OPEN',
  };
  cleanup(store);
  if (store.outbox.length !== 0 || store.inbox.size !== 0 || store.locks.size !== 0) {
    throw new Error('cleanup left residue');
  }
  evidence.residue_after_cleanup = store.outbox.length + store.inbox.size + store.locks.size;
  return evidence;
}

export function runFailureInjectedScenario() {
  return runLeaseContractScenario();
}
