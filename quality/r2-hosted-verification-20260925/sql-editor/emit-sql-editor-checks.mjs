#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sqlRoot = resolve(here, '../sql');
const fingerprint = readFileSync(resolve(here, '_post_r2_fingerprint.fragment.sql'), 'utf8').trim();

const gsetSettings = {
  direct_org: 'r2.test.direct_org',
  empty_org: 'r2.test.empty_org',
  org_a: 'r2.test.org_a',
  org_b: 'r2.test.org_b',
  u1_org_a: 'r2.u1.org_a',
  u1_org_b: 'r2.u1.org_b',
};

function header(title) {
  return `-- ${title}
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- SQL Editor variant. The psql runners remain the hosted execution path.
-- No secrets. Fixtures use .example.test addresses.
-- Identity is the recorded isolated-preview fingerprint, not a pasted ref.
-- Production project iwoaaljitifloolszxlu is named only as defense in depth.

${fingerprint}
`;
}

function stripPsql(source) {
  return source
    .replace(/^\\set ON_ERROR_STOP on\n/gm, '')
    .replace(/^\\echo .*\n?/gm, '');
}

function convertGsetSelects(sql) {
  return sql.replace(
    /select\s+active_organization_id\s+as\s+(\w+)\s+from\s+public\.profiles\s+where\s+id\s*=\s*'([^']+)'\s*\\gset/gi,
    (_, alias, id) => {
      const setting = gsetSettings[alias];
      if (!setting) throw new Error(`unknown gset alias ${alias}`);
      return `select set_config('${setting}', (
  select active_organization_id::text from public.profiles
  where id = '${id}'
), true);`;
    },
  );
}

function dropRedundantPsqlAssignments(sql) {
  return sql
    .replace(/select set_config\('r2\.test\.direct_org', :'direct_org', true\);\n/g, '')
    .replace(/select set_config\('r2\.test\.empty_org', :'empty_org', true\);\n/g, '')
    .replace(
      /select set_config\('r2\.test\.org_a', :'org_a', true\),\n\s*set_config\('r2\.test\.org_b', :'org_b', true\);\n/g,
      '',
    )
    .replace(
      /select set_config\('r2\.u1\.org_a', :'u1_org_a', true\),\n\s*set_config\('r2\.u1\.org_b', :'u1_org_b', true\);\n/g,
      '',
    );
}

function replacePsqlVars(sql) {
  return sql
    .replaceAll(":'org_a'", "current_setting('r2.test.org_a')::uuid")
    .replaceAll(":'org_b'", "current_setting('r2.test.org_b')::uuid");
}

function assertNoPsql(sql, label) {
  if (/^\\/m.test(sql) || /\\gset|\\set |\\echo/.test(sql) || /:'[A-Za-z0-9_]+'/.test(sql)) {
    throw new Error(`${label} conversion left a psql metacommand`);
  }
}

function convertMatrix(source) {
  let sql = replacePsqlVars(dropRedundantPsqlAssignments(convertGsetSelects(stripPsql(source))));
  assertNoPsql(sql, 'matrix');
  sql = sql.replace(
    /\nrollback;\s*$/,
    `

select
  'sql_editor_hosted_matrix' as evidence_key,
  'PASS' as verdict,
  'owner_plus_uninvited_role_denial' as matrix_scope,
  (
    select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    from public.proposals
    where id::text not like '91000000-%'
      and id::text not like '92000000-%'
      and id::text not like '93000000-%'
  ) as baseline_proposal_digest;

rollback;
`,
  );
  if (!/begin;/i.test(sql) || !/rollback;/i.test(sql) || /commit;/i.test(sql)) {
    throw new Error('matrix must remain one rolled-back transaction');
  }
  return header('R2 SQL Editor hosted matrix (two-tenant owner plus uninvited-role denial)') + sql;
}

function convertU1(source) {
  let sql = dropRedundantPsqlAssignments(convertGsetSelects(stripPsql(source)));
  assertNoPsql(sql, 'U1');
  sql = sql.replace(
    /select\n  q2\.execution_ms as rls_execution_ms,/,
    `select
  'sql_editor_u1_benchmark' as evidence_key,
  q2.execution_ms as rls_execution_ms,`,
  );
  if (!/begin;/i.test(sql) || !/rollback;/i.test(sql) || /commit;/i.test(sql)) {
    throw new Error('U1 must remain one rolled-back transaction');
  }
  return header('R2 SQL Editor U1 membership-RLS benchmark') + sql;
}

const matrix = convertMatrix(readFileSync(resolve(sqlRoot, 'r2-hosted-matrix.sql'), 'utf8'));
const u1 = convertU1(readFileSync(resolve(sqlRoot, 'u1-membership-rls-benchmark.sql'), 'utf8'));
const matrixPath = resolve(here, '02-hosted-matrix.sql');
const u1Path = resolve(here, '04-u1-benchmark.sql');

if (process.argv.includes('--check')) {
  if (readFileSync(matrixPath, 'utf8') !== matrix) {
    throw new Error('02-hosted-matrix.sql is out of parity with emit-sql-editor-checks.mjs');
  }
  if (readFileSync(u1Path, 'utf8') !== u1) {
    throw new Error('04-u1-benchmark.sql is out of parity with emit-sql-editor-checks.mjs');
  }
  console.log('sql-editor generator parity PASS');
} else {
  writeFileSync(matrixPath, matrix);
  writeFileSync(u1Path, u1);
  console.log('wrote sql-editor/02-hosted-matrix.sql and sql-editor/04-u1-benchmark.sql');
}
