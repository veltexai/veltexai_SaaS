import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTION_REF,
  SPIKE_ATTEMPT_CEILING,
  claimNext,
  cleanup,
  createStore,
  deliver,
  enqueue,
  fail,
  pendingRows,
  retryDelayMs,
  runLeaseContractScenario,
  runRetryCeilingSequence,
} from './outbox-claimer.mjs';

test('production ref remains refused by name', () => {
  assert.equal(PRODUCTION_REF, 'iwoaaljitifloolszxlu');
});

test('claim order follows available_at then event_sequence', () => {
  const store = createStore();
  const now = 5_000;
  enqueue(store, {
    id: 'late', organization_id: 'org', event_id: 'e2', event_type: 't',
    aggregate_type: 'a', aggregate_id: '2', payload: {},
  }, now);
  const first = enqueue(store, {
    id: 'early', organization_id: 'org', event_id: 'e1', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  first.available_at = now - 10;
  assert.equal(claimNext(store, now, 'A').row.id, 'early');
  cleanup(store);
});

test('same worker cannot reclaim an unexpired lease', () => {
  const store = createStore();
  const now = 1;
  enqueue(store, {
    id: 'one', organization_id: 'org', event_id: 'e', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  const claim = claimNext(store, now, 'A');
  assert.equal(claimNext(store, now, 'A'), null);
  assert.equal(claimNext(store, now, 'B'), null);
  assert.equal(pendingRows(store, now).length, 0);
  assert.match(claim.token, /^lease-/);
  cleanup(store);
});

test('stale success and stale failure are rejected after reclaim', () => {
  const store = createStore();
  let now = 1;
  enqueue(store, {
    id: 'one', organization_id: 'org', event_id: 'e', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  const stale = claimNext(store, now, 'A');
  now = stale.lease_until + 1;
  const fresh = claimNext(store, now, 'B');
  assert.notEqual(fresh.token, stale.token);
  assert.throws(() => deliver(store, stale, 'c', 'a'.repeat(64), now), (error) => error.code === 'stale_lease');
  assert.equal(fresh.row.delivered_at, null);
  assert.throws(() => fail(store, stale, 'nope', now), (error) => error.code === 'stale_lease');
  assert.equal(fresh.row.last_error, null);
  cleanup(store);
});

test('inbox conflict does not mark outbox delivered', () => {
  const store = createStore();
  const now = 1;
  enqueue(store, {
    id: 'one', organization_id: 'org', event_id: 'e', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  store.inbox.set('c:e', {
    consumer: 'c', event_id: 'e', organization_id: 'org',
    payload_sha256: 'b'.repeat(64), received_at: now,
  });
  const claim = claimNext(store, now, 'A');
  assert.throws(() => deliver(store, claim, 'c', 'a'.repeat(64), now), (error) => error.code === '23505');
  assert.equal(claim.row.delivered_at, null);
  cleanup(store);
});

test('injected inbox fault rolls back both mutations', () => {
  const store = createStore();
  const now = 1;
  enqueue(store, {
    id: 'one', organization_id: 'org', event_id: 'e', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  const claim = claimNext(store, now, 'A');
  assert.throws(
    () => deliver(store, claim, 'c', 'a'.repeat(64), now, { injectFaultAfterInbox: true }),
    (error) => error.code === 'injected_fault',
  );
  assert.equal(store.inbox.size, 0);
  assert.equal(claim.row.delivered_at, null);
  assert.equal(deliver(store, claim, 'c', 'a'.repeat(64), now), 'delivered');
  assert.equal(store.inbox.size, 1);
  assert.equal(claim.row.delivered_at, now);
  cleanup(store);
});

test('four failed attempts schedule 100/200/400 then DLQ', () => {
  const store = createStore();
  const now = 10;
  enqueue(store, {
    id: 'retry', organization_id: 'org', event_id: 'e', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  const result = runRetryCeilingSequence(store, now, 'A', 'retry');
  assert.equal(SPIKE_ATTEMPT_CEILING, 4);
  assert.deepEqual(result.observed_retry_delays_ms, [100, 200, 400]);
  assert.equal(result.lastStatus, 'dead_letter');
  assert.equal(store.outbox[0].attempts, 4);
  assert.ok(store.outbox[0].dead_lettered_at != null);
  cleanup(store);
});

test('lease contract covers claim, stale completion, DLQ and cleanup', () => {
  const evidence = runLeaseContractScenario();
  assert.equal(evidence.runtime_choice, 'OPEN');
  assert.equal(evidence.attempt_ceiling, 4);
  assert.deepEqual(evidence.retry_delays_ms, [100, 200, 400]);
  assert.equal(evidence.inbox_size, 2);
  assert.equal(evidence.residue_after_cleanup, 0);
  for (const item of [
    'same-worker double-claim denial',
    'stale-success denial',
    'stale-failure denial',
    'atomic inbox+outbox completion',
    'duplicate inbox conflict',
    'terminal DLQ after attempt ceiling',
  ]) {
    assert.ok(evidence.proven_locally.includes(item), item);
  }
});

test('last_error without dead_lettered_at remains reclaimable', () => {
  const store = createStore();
  const now = 1;
  const row = enqueue(store, {
    id: 'err', organization_id: 'org', event_id: 'e', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  row.last_error = 'stale';
  assert.equal(pendingRows(store, now)[0].id, 'err');
  const claimed = claimNext(store, now, 'A');
  assert.equal(fail(store, claimed, 'again', now), 'retry');
  assert.equal(claimed.row.dead_lettered_at, null);
  assert.equal(claimed.row.available_at, now + retryDelayMs(1));
  cleanup(store);
});
