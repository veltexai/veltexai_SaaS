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
