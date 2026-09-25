import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const validator = join(process.cwd(), 'quality/location-pricing/validate-operator-results.mjs');
const evidence = join(process.cwd(), 'quality/location-pricing/operator-results.csv');

it('keeps genuine but incomplete evidence pending and fails closed', () => {
  const result = spawnSync(process.execPath, [validator, evidence], { encoding: 'utf8' });
  expect(result.status).toBe(2);
  expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({ status: 'BLOCKED', pendingRows: 1, acceptedRows: 0 }));
  const [head, line] = readFileSync(evidence, 'utf8').trim().split(/\r?\n/);
  const headings = head.split(',');
  const record = Object.fromEntries(headings.map((key, index) => [key, line.split(',')[index]]));
  expect(record).toEqual(expect.objectContaining({
    job_square_feet: '1064', actual_labor_hours: '22', crew_size: '2',
    elapsed_hours_low: '10', elapsed_hours_high: '12', veltex_target: '1155',
    operator_bid: '1095', absolute_deviation_percent: '5.48', review_status: 'pending',
  }));
});

it('counts move-in/out and Airbnb work as turnover evidence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'veltex-location-validation-'));
  const fixture = join(directory, 'operator-results.csv');
  const header = readFileSync(evidence, 'utf8').split(/\r?\n/)[0];
  const row = (operator: string, service: string, condition: string, deviation: number) =>
    `${operator},US-WA,WA,${service},${condition},1000,300,270,300,330,${deviation},false,false,8,180,true,completed,false,fixture,accepted`;
  writeFileSync(fixture, [header,
    row('res-1', 'standard', 'low', 10),
    row('res-2', 'first_deep', 'normal', 12),
    row('res-3', 'recurring_standard', 'high', 14),
    row('turn-1', 'move_in_out', 'normal', 11),
    row('turn-2', 'airbnb_turnover', 'high', 13),
  ].join('\n'));
  const result = spawnSync(process.execPath, [validator, fixture], { encoding: 'utf8' });
  rmSync(directory, { recursive: true, force: true });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({ status: 'PASS', residentialOperators: 3, turnoverOperators: 2 }));
});
