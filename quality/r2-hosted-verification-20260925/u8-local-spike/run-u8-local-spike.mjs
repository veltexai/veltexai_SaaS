#!/usr/bin/env node
import { runFailureInjectedScenario } from './outbox-claimer.mjs';

const evidence = runFailureInjectedScenario();
console.log(JSON.stringify({
  status: 'LOCAL SPIKE EXECUTED / HOSTED NOT EXECUTED',
  runtime_choice: evidence.runtime_choice,
  attempt_ceiling: evidence.attempt_ceiling,
  retry_delays_ms: evidence.retry_delays_ms,
  proven_locally: evidence.proven_locally,
  not_proven: evidence.not_proven,
  residue_after_cleanup: evidence.residue_after_cleanup,
}, null, 2));
