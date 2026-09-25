import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] ?? path.join(process.cwd(), 'quality/location-pricing/operator-results.csv');
const text = fs.readFileSync(input, 'utf8').trim();
const lines = text ? text.split(/\r?\n/) : [];
if (lines.length < 2) {
  console.error('BLOCKED: no real operator validation rows. Do not substitute synthetic evidence.');
  process.exit(2);
}

const headings = lines[0].split(',');
const records = lines.slice(1).filter(Boolean).map(line => {
  const values = line.split(',');
  return Object.fromEntries(headings.map((heading, index) => [heading, values[index] ?? '']));
});
const accepted = records.filter(record => record.review_status === 'accepted');
const residentialOperators = new Set(accepted.filter(record => record.service_type !== 'airbnb_turnover').map(record => record.operator_id));
const turnoverOperators = new Set(accepted.filter(record => record.service_type === 'airbnb_turnover').map(record => record.operator_id));
const deviations = accepted.map(record => Number(record.absolute_deviation_percent)).filter(Number.isFinite).sort((a, b) => a - b);
const median = deviations.length ? (deviations[Math.floor((deviations.length - 1) / 2)] + deviations[Math.ceil((deviations.length - 1) / 2)]) / 2 : Infinity;
const unsafe = accepted.some(record => record.unsafe_underestimate === 'true');
const missingScope = accepted.some(record => record.missing_standard_scope === 'true');
const conditions = new Set(accepted.map(record => record.job_condition));
const pass = residentialOperators.size >= 3 && turnoverOperators.size >= 2 && ['low', 'normal', 'high'].every(condition => conditions.has(condition)) && median <= 15 && !unsafe && !missingScope;

console.log(JSON.stringify({
  status: pass ? 'PASS' : 'BLOCKED',
  acceptedRows: accepted.length,
  residentialOperators: residentialOperators.size,
  turnoverOperators: turnoverOperators.size,
  conditionCoverage: [...conditions].sort(),
  medianAbsoluteDeviationPercent: Number.isFinite(median) ? median : null,
  unsafeUnderestimate: unsafe,
  missingStandardScope: missingScope,
}, null, 2));
process.exit(pass ? 0 : 2);

