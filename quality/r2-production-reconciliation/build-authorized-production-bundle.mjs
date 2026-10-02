#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const rawArgs = process.argv.slice(2);
const rollbackProof = rawArgs.includes('--rollback-proof');
const positionalArgs = rawArgs.filter((value) => value !== '--rollback-proof');
const [manifestPath, reviewedFingerprintPath, finalFingerprintPath, authorizationPath, outputPath, postflightContractArg] = positionalArgs.map((value) => value ? resolve(value) : value);
if (!manifestPath || !reviewedFingerprintPath || !finalFingerprintPath || !authorizationPath || !outputPath) {
  throw new Error('usage: build-authorized-production-bundle.mjs <manifest> <reviewed-fingerprint> <final-fingerprint> <authorization> <output>');
}

const sha = (value) => createHash('sha256').update(value).digest('hex');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const manifestBytes = readFileSync(manifestPath);
const reviewedBytes = readFileSync(reviewedFingerprintPath);
const finalBytes = readFileSync(finalFingerprintPath);
const authorizationBytes = readFileSync(authorizationPath);
const postflightContractPath = postflightContractArg ?? resolve(here, 'production-postflight-contract-20261001.json');
const postflightContractBytes = readFileSync(postflightContractPath);
const manifest = JSON.parse(manifestBytes);
const reviewed = JSON.parse(reviewedBytes);
const final = JSON.parse(finalBytes);
const authorization = JSON.parse(authorizationBytes);
const postflightContract = JSON.parse(postflightContractBytes);
const expectedStateBytes = readFileSync(resolve(here, 'expected-state/expected-state.v1.json'));
const expectedState = JSON.parse(expectedStateBytes);
const invariantExpressionBytes = readFileSync(resolve(here, 'expected-state/data-invariants-expression.sql'));
const invariantExpression = invariantExpressionBytes.toString('utf8').trim();
const effectivePrivilegesExpressionBytes = readFileSync(resolve(here, 'expected-state/effective-privileges-expression.sql'));
const effectivePrivilegesExpression = effectivePrivilegesExpressionBytes.toString('utf8').trim();
const catalogSourceBytes = readFileSync(resolve(here, 'expected-state/catalog.sql'));
const catalogSource = catalogSourceBytes.toString('utf8');
const generatorBytes = readFileSync(fileURLToPath(import.meta.url));

if (manifest.contract_version !== 2 || manifest.target !== 'production iwoaaljitifloolszxlu' || manifest.armed !== false || manifest.productionAuthorized !== false) {
  throw new Error('unarmed manifest contract mismatch');
}
if (manifest.fingerprint_sha256 !== sha(reviewedBytes)) throw new Error('manifest does not bind reviewed fingerprint');
if (authorization.status !== 'APPROVED' || authorization.scope !== 'R2 production release sequence' || authorization.project_ref !== 'iwoaaljitifloolszxlu') {
  throw new Error('production authorization contract mismatch');
}
if (authorization.manifest_sha256 !== sha(manifestBytes) || authorization.reviewed_fingerprint_sha256 !== sha(reviewedBytes) || authorization.final_fingerprint_sha256 !== sha(finalBytes)) {
  throw new Error('production authorization does not bind both fingerprints');
}
if (authorization.postflight_contract_sha256 !== sha(postflightContractBytes)
    || authorization.rollback_artifact_sha256 !== postflightContract.rollback_artifact_sha256
    || authorization.rollback_evidence_sha256 !== postflightContract.rollback_evidence_sha256) {
  throw new Error('production authorization does not bind rollback evidence and postflight contract');
}
if (!authorization.approved_by || !authorization.approved_at || authorization.gates !== 'G0-G4 VERIFIED') {
  throw new Error('production authorization metadata incomplete');
}

function comparableFingerprint(value) {
  const copy = structuredClone(value);
  delete copy.captured_at;
  delete copy.capture_sha256;
  if (copy.classification) delete copy.classification.classified_at;
  return copy;
}
if (JSON.stringify(comparableFingerprint(reviewed)) !== JSON.stringify(comparableFingerprint(final))) {
  throw new Error('final production fingerprint drifted from reviewed state');
}
if (final.classification?.expected_state_sha256 !== sha(expectedStateBytes)) throw new Error('final fingerprint does not bind current expected state');

const exactKeys = (value, keys) => JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const hex64 = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const postflightKeys = ['rollback_proof','history_count','history_sha256','catalog_count','catalog_sha256','effective_privileges_sha256','content_digests_sha256','data_invariants_sha256'];
if (!exactKeys(postflightContract, ['contract_version','target','rollback_artifact_sha256','rollback_evidence_sha256','postflight'])
    || postflightContract.contract_version !== 1
    || postflightContract.target !== 'production iwoaaljitifloolszxlu'
    || !hex64(postflightContract.rollback_artifact_sha256)
    || !hex64(postflightContract.rollback_evidence_sha256)
    || !exactKeys(postflightContract.postflight, postflightKeys)
    || postflightContract.postflight.rollback_proof !== true
    || postflightContract.postflight.history_count !== 64
    || postflightContract.postflight.catalog_count !== 2527
    || !postflightKeys.filter((key) => key.endsWith('_sha256')).every((key) => hex64(postflightContract.postflight[key]))) {
  throw new Error('postflight contract shape or values are invalid');
}

const reviewedSources = readJson(resolve(here, 'reviewed-source-sha256.json'));
if (manifest.steps.length !== 35 || JSON.stringify(Object.keys(reviewedSources)) !== JSON.stringify(manifest.steps.map((step) => step.file))) {
  throw new Error('manifest is not the exact reviewed 35-step source set');
}

const applyModes = new Set(['apply', 'apply-replayable-partial', 'apply-normalize-equivalent-drift']);
const reconcileModes = new Set(['reconcile-history', 'reconcile-absent-equivalent']);
function sourceBody(step) {
  const path = resolve(root, 'supabase/migrations', step.file);
  const source = readFileSync(path, 'utf8');
  const digest = sha(source);
  if (digest !== step.source_sha256 || digest !== reviewedSources[step.file]) throw new Error(`source drift: ${step.file}`);
  if (reconcileModes.has(step.mode)) return '';
  if (!applyModes.has(step.mode)) throw new Error(`unsupported production mode: ${step.mode}`);
  const beginMatches = source.match(/^\s*begin(?: transaction)?;\s*$/gim) ?? [];
  const commitMatches = source.match(/^\s*commit;\s*$/gim) ?? [];
  if (beginMatches.length !== commitMatches.length || beginMatches.length > 1) throw new Error(`unexpected transaction controls: ${step.file}`);
  if (beginMatches.length === 0) return source.trim();
  if (!/^\s*begin(?: transaction)?;\s*$/im.test(source) || !/^\s*commit;\s*$/im.test(source.trimEnd().split('\n').at(-1))) {
    throw new Error(`transaction controls are not exact outer wrappers: ${step.file}`);
  }
  return source.replace(/^\s*begin(?: transaction)?;\s*/im, '').replace(/\s*commit;\s*$/i, '').trim();
}

const initialVersions = final.migration_history?.versions;
if (!Array.isArray(initialVersions) || final.migration_history.count !== 29 || new Set(initialVersions).size !== 29) throw new Error('final fingerprint history is not the exact 29-version baseline');
if (manifest.steps.some((step) => initialVersions.includes(step.version))) throw new Error('planned history already exists');
const finalVersions = [...initialVersions, ...manifest.steps.map((step) => step.version)].sort();
if (new Set(finalVersions).size !== 64) throw new Error('final history is not exactly 64 unique versions');
const sqlArray = (values) => `array[${values.map((value) => `'${value.replaceAll("'", "''")}'`).join(',')}]::text[]`;
const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const migrationName = (file) => file.replace(/^\d+_/, '').replace(/\.sql$/, '');
const catalogMarker = '-- CATALOG_TERMINAL_QUERY';
const catalogMarkerIndex = catalogSource.indexOf(catalogMarker);
if (catalogMarkerIndex < 0) throw new Error('catalog terminal marker missing');
const liveCatalogQuery = `${catalogSource.slice(0, catalogMarkerIndex)}select atom->>'kind' kind,atom->>'identity' identity,atom->>'value_sha256' value_sha256 from hashed cross join uniqueness where uniqueness.ok=1`;
const expectedCatalogValues = final.catalog_atoms.map((atom) => `(${sqlLiteral(atom.kind)},${sqlLiteral(atom.identity)},${sqlLiteral(atom.value_sha256)})`).join(',\n');
const contentDigestExpression = `jsonb_build_object(
  'profiles_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.profiles x) q),
  'proposals_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposals x) q),
  'tracking_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposal_tracking x) q),
  'branding_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.user_branding_settings x) q),
  'subscriptions_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.subscriptions x) q),
  'usage_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.usage x) q),
  'addon_catalog_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.additional_service_catalog x) q),
  'proposal_addons_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposal_additional_services x) q),
  'proposal_templates_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposal_templates x) q),
  'tier_access_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.template_tier_access x) q),
  'template_preferences_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.user_template_preferences x) q)
)`;
const postflightEvidenceStatement = `${catalogSource.slice(0, catalogMarkerIndex)}select jsonb_build_object(
  'rollback_proof',true,
  'history_count',(select count(*)::int from supabase_migrations.schema_migrations),
  'history_sha256',(select encode(digest(convert_to(coalesce(string_agg(version,E'\\n' order by version collate "C"),''),'UTF8'),'sha256'),'hex') from supabase_migrations.schema_migrations),
  'catalog_count',count(*)::int,
  'catalog_sha256',encode(digest(convert_to(coalesce(string_agg(jsonb_build_array(atom->>'kind',atom->>'identity',atom->>'value_sha256')::text,E'\\n' order by atom->>'kind' collate "C",atom->>'identity' collate "C"),''),'UTF8'),'sha256'),'hex'),
  'effective_privileges_sha256',encode(digest(convert_to((${effectivePrivilegesExpression})::text,'UTF8'),'sha256'),'hex'),
  'content_digests_sha256',encode(digest(convert_to((${contentDigestExpression})::text,'UTF8'),'sha256'),'hex'),
  'data_invariants_sha256',encode(digest(convert_to((${invariantExpression})::text,'UTF8'),'sha256'),'hex')
) into rollback_evidence from hashed cross join uniqueness where uniqueness.ok=1`;

const stepSql = manifest.steps.map((step, index) => {
  const body = sourceBody(step);
  const apply = body ? `\n${body}\n` : '\n-- Reviewed terminal equivalence: history reconciliation only.\n';
  return `-- STEP ${index + 1}/35 ${step.file}\n-- MODE ${step.mode}; SOURCE SHA-256 ${step.source_sha256}\ndo $$ begin
  if exists (select 1 from supabase_migrations.schema_migrations where version='${step.version}') then
    raise exception 'R2 release refused: history appeared early for ${step.version}';
  end if;
end $$;${apply}
insert into supabase_migrations.schema_migrations (version, statements, name)
values ('${step.version}', array[]::text[], '${migrationName(step.file)}');`;
}).join('\n\n');

const artifactBinding = {
  contract_version: 1,
  target: 'production iwoaaljitifloolszxlu',
  productionAuthorized: true,
  armed: true,
  manifest_sha256: sha(manifestBytes),
  reviewed_fingerprint_sha256: sha(reviewedBytes),
  final_fingerprint_sha256: sha(finalBytes),
  authorization_sha256: sha(authorizationBytes),
  postflight_contract_sha256: sha(postflightContractBytes),
  rollback_artifact_sha256: postflightContract.rollback_artifact_sha256,
  rollback_evidence_sha256: postflightContract.rollback_evidence_sha256,
  generator_sha256: sha(generatorBytes),
  expected_state_sha256: sha(expectedStateBytes),
  data_invariants_expression_sha256: sha(invariantExpressionBytes),
  effective_privileges_expression_sha256: sha(effectivePrivilegesExpressionBytes),
  catalog_expression_sha256: sha(catalogSourceBytes),
  rollback_proof: rollbackProof,
  steps: manifest.steps.map(({ file, version, source_sha256, mode }) => ({ file, version, source_sha256, mode })),
};
const bindingBase64 = Buffer.from(JSON.stringify(artifactBinding)).toString('base64');
const frozen = manifest.frozen_counts;
const terminalSql = rollbackProof
  ? `-- Raise hashes-only postflight evidence as a deliberate error. The error aborts\n-- the transaction; the explicit ROLLBACK below is a defensive unreachable boundary.\ndo $rollback_proof$\ndeclare rollback_evidence jsonb;\nbegin\n${postflightEvidenceStatement};\n  raise exception using errcode='P0001',message='R2_ROLLBACK_PROOF:'||rollback_evidence::text;\nend\n$rollback_proof$;\nrollback;`
  : `-- Recompute and require the exact independently reviewed rollback-proof postflight before commit.
do $commit_postflight$
declare rollback_evidence jsonb;
begin
${postflightEvidenceStatement};
  if rollback_evidence is distinct from $authorized_postflight$${JSON.stringify(postflightContract.postflight)}$authorized_postflight$::jsonb then
    raise exception 'R2 release postcondition failed: exhaustive postflight differs from rollback proof';
  end if;
end
$commit_postflight$;
commit;\n\nselect 'R2_PRODUCTION_RELEASE_COMMITTED'::text evidence_key,\n  (select count(*) from supabase_migrations.schema_migrations)::bigint migration_history_count,\n  (select count(*) from public.organizations)::bigint organization_count,\n  (select count(*) from public.organization_memberships)::bigint membership_count;`;
const sql = `-- GENERATED, HASH-BOUND R2 PRODUCTION ${rollbackProof ? 'ROLLBACK-PROOF' : 'EXECUTION'} ARTIFACT. DO NOT EDIT.
-- Target: iwoaaljitifloolszxlu only. Confirm dashboard project before execution.
-- Binding SHA-256: ${sha(bindingBase64)}
-- One transaction; every exception rolls back schema, data, ACL and history changes.
begin;
set local lock_timeout = '15s';
set local statement_timeout = '30min';
select pg_advisory_xact_lock(hashtextextended('veltex-r2-production-release',0));

-- Block application writes and concurrent migration/history writes before the
-- exact live-state comparison. Ordinary SELECT traffic remains available.
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $$
declare relation_name text;
begin
  for relation_name in
    select format('%I.%I',n.nspname,c.relname)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
      and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
    order by c.relname collate "C"
  loop
    execute 'lock table '||relation_name||' in share row exclusive mode';
  end loop;
end $$;

create temporary table r2_authorized_catalog(kind text not null,identity text not null,value_sha256 text not null,primary key(kind,identity)) on commit drop;
insert into r2_authorized_catalog(kind,identity,value_sha256) values
${expectedCatalogValues};
create temporary table r2_live_catalog on commit drop as
${liveCatalogQuery};

do $$
begin
  if exists (select kind,identity,value_sha256 from r2_authorized_catalog except select kind,identity,value_sha256 from r2_live_catalog)
     or exists (select kind,identity,value_sha256 from r2_live_catalog except select kind,identity,value_sha256 from r2_authorized_catalog) then
    raise exception 'R2 release refused: exact live catalog differs from authorized fingerprint';
  end if;
  if (${effectivePrivilegesExpression}) is distinct from $authorized_privileges$${JSON.stringify(final.effective_privileges)}$authorized_privileges$::jsonb then
    raise exception 'R2 release refused: effective privileges differ from authorized fingerprint';
  end if;
  if (${contentDigestExpression}) is distinct from $authorized_digests$${JSON.stringify(manifest.frozen_content_digests)}$authorized_digests$::jsonb then
    raise exception 'R2 release refused: protected content digests differ from authorized fingerprint';
  end if;
  if (${invariantExpression}) is distinct from $authorized_invariants$${JSON.stringify(final.data_invariants)}$authorized_invariants$::jsonb then
    raise exception 'R2 release refused: protected data invariants differ from authorized fingerprint';
  end if;
end $$;

do $$
begin
  if current_user <> 'postgres' then raise exception 'R2 release refused: current_user must be postgres'; end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 29
     or (select count(distinct version) from supabase_migrations.schema_migrations) <> 29
     or (select coalesce(array_agg(version order by version),array[]::text[]) from supabase_migrations.schema_migrations) <> ${sqlArray(initialVersions.sort())} then
    raise exception 'R2 release refused: migration history drifted';
  end if;
  if (select count(*) from public.profiles) <> ${frozen.profiles}
     or (select count(*) from public.proposals) <> ${frozen.proposals}
     or (select count(*) from public.subscriptions) <> ${frozen.subscriptions}
     or (select count(*) from public.proposal_tracking) <> ${frozen.proposal_tracking}
     or (select count(*) from public.user_branding_settings) <> ${frozen.user_branding_settings}
     or (select count(*) from public.company_profiles) <> ${frozen.company_profiles} then
    raise exception 'R2 release refused: frozen row counts drifted';
  end if;
  if exists (select 1 from public.proposals p left join public.profiles pr on pr.id=p.user_id where pr.id is null)
     or exists (select 1 from public.proposal_tracking t left join public.proposals p on p.id=t.proposal_id where p.id is null) then
    raise exception 'R2 release refused: frozen orphan boundary drifted';
  end if;
end $$;

${stepSql}

do $$
declare v text;
declare client_maintain_remains boolean := false;
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 64
     or (select count(distinct version) from supabase_migrations.schema_migrations) <> 64
     or (select coalesce(array_agg(version order by version),array[]::text[]) from supabase_migrations.schema_migrations) <> ${sqlArray(finalVersions)} then
    raise exception 'R2 release postcondition failed: history is not exact';
  end if;
  if (select count(*) from public.profiles) <> ${frozen.profiles}
     or (select count(*) from public.proposals) <> ${frozen.proposals}
     or (select count(*) from public.subscriptions) <> ${frozen.subscriptions}
     or (select count(*) from public.proposal_tracking) <> ${frozen.proposal_tracking}
     or (select count(*) from public.user_branding_settings) <> ${frozen.user_branding_settings} then
    raise exception 'R2 release postcondition failed: protected row counts changed';
  end if;
  if to_regclass('public.organizations') is null or to_regclass('public.organization_memberships') is null
     or to_regclass('public.organization_audit_log') is null or to_regclass('public.business_service_profiles') is null
     or to_regclass('public.pricing_source_versions') is null then
    raise exception 'R2 release postcondition failed: required tables missing';
  end if;
  if exists (select 1 from public.profiles p where p.active_organization_id is null
     or not exists (select 1 from public.organization_memberships m where m.user_id=p.id and m.organization_id=p.active_organization_id)) then
    raise exception 'R2 release postcondition failed: organization backfill mismatch';
  end if;
  if to_regprocedure('public.revoke_tracked_proposal_link(uuid,uuid,text)') is null
     or to_regprocedure('public.read_tracked_proposal_print(text)') is null
     or has_function_privilege('anon','public.revoke_tracked_proposal_link(uuid,uuid,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.revoke_tracked_proposal_link(uuid,uuid,text)','EXECUTE') then
    raise exception 'R2 release postcondition failed: tracked-link boundary mismatch';
  end if;
  foreach v in array array['_r0_get_user_current_usage_impl(uuid)','_r0_can_user_create_proposal_impl(uuid)','_r0_get_user_usage_info_impl(uuid)','_r0_increment_user_usage_impl(uuid)','_r0_can_user_access_template_impl(uuid,uuid)','_r0_user_has_active_access_impl(uuid)','_r0_get_user_accessible_templates_impl(uuid)'] loop
    if has_function_privilege('service_role',('public.'||v)::regprocedure,'EXECUTE') then
      raise exception 'R2 release postcondition failed: private routine exposed to service_role: %',v;
    end if;
  end loop;
  if current_setting('server_version_num')::int >= 170000 then
    execute $maintain$select exists (
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      cross join (values('anon'),('authenticated')) r(role_name)
      where n.nspname='public' and c.relkind in ('r','p','v','m','f')
        and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
        and has_table_privilege(r.role_name,c.oid,'MAINTAIN'))$maintain$ into client_maintain_remains;
  end if;
  if client_maintain_remains then
    raise exception 'R2 release postcondition failed: client MAINTAIN remains';
  end if;
  if (${invariantExpression}) is distinct from $expected_invariants$${JSON.stringify(expectedState.prerequisite_checkpoint.data_invariants)}$expected_invariants$::jsonb then
    raise exception 'R2 release postcondition failed: protected data invariants differ';
  end if;
end $$;

${terminalSql}

-- ARTIFACT_BINDING_BASE64:${bindingBase64}
`;

writeFileSync(outputPath, sql, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify({
  output: outputPath,
  bytes: Buffer.byteLength(sql),
  sha256: sha(sql),
  steps: manifest.steps.length,
  applySteps: manifest.steps.filter((step) => applyModes.has(step.mode)).length,
  reconciliationSteps: manifest.steps.filter((step) => reconcileModes.has(step.mode)).length,
  authorization: basename(authorizationPath),
  rollbackProof,
}, null, 2));
