#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

const here=dirname(new URL(import.meta.url).pathname);
const input=resolve(process.argv[2]??'');
const output=resolve(process.argv[3]??'/private/tmp/veltex-r2-preview-compatibility.json');
const productionPostflight=process.argv.includes('--production-postflight');
if(!input)throw new Error('isolated-preview capture required');
if(!output.startsWith('/private/tmp/'))throw new Error('output must remain under /private/tmp');
const captureBytes=readFileSync(input); const contractBytes=readFileSync(resolve(here,'expected-state.v1.json'));
const capture=JSON.parse(captureBytes); const contract=JSON.parse(contractBytes);
const expectedIdentity=productionPostflight
  ? {project_ref:'iwoaaljitifloolszxlu',environment:'production'}
  : {project_ref:'ynzkwctwlssjcsjmahey',environment:'isolated-preview'};
if(capture.project_ref!==expectedIdentity.project_ref||capture.environment!==expectedIdentity.environment||capture.read_only!==true)throw new Error('wrong hosted capture identity');
if(capture.contract_version!==3||capture.canonicalization_version!==2)throw new Error('unsupported capture contract/canonicalization version');
if(!/^(16|17)\./.test(capture.postgres_version??''))throw new Error('unsupported PostgreSQL major');
const binding=capture.contract_binding;
const expectedBinding={catalog_sha256:contract.catalog_sha256,data_invariants_sha256:contract.data_invariants_sha256,migrations_sha256:contract.migrations_sha256,capture_generator_sha256:createHash('sha256').update(readFileSync(resolve(here,'build-read-only-production-capture.mjs'))).digest('hex'),effective_privileges_expression_sha256:createHash('sha256').update(readFileSync(resolve(here,'effective-privileges-expression.sql'))).digest('hex'),expected_effective_privileges_sha256:createHash('sha256').update(readFileSync(resolve(here,'expected-effective-privileges.v1.json'))).digest('hex')};
const bindingKeys=Object.keys(expectedBinding).sort();
if(!binding||typeof binding!=='object'||Array.isArray(binding)||JSON.stringify(Object.keys(binding).sort())!==JSON.stringify(bindingKeys)||bindingKeys.some(k=>!/^[0-9a-f]{64}$/.test(binding[k]??'')||binding[k]!==expectedBinding[k]))throw new Error('capture source/contract binding mismatch');
if(JSON.stringify(capture.data_invariants)!==JSON.stringify(contract.prerequisite_checkpoint.data_invariants))throw new Error('data invariant mismatch');
if(!Array.isArray(capture.catalog_atoms)||capture.catalog_atoms.some(a=>!a.kind||!a.identity||!/^[0-9a-f]{64}$/.test(a.value_sha256??'')))throw new Error('invalid catalog atom hash');
const key=a=>`${a.kind}:${a.identity}`;
const actual=new Map(capture.catalog_atoms.map(a=>[key(a),a]));
if(actual.size!==capture.catalog_atoms.length)throw new Error('duplicate capture atoms');
const expected=new Map(contract.atoms.map(a=>[key(a),a]));
const securityAclKeys=new Set(contract.production_steps.flatMap(step=>step.diff.evidence.map(e=>e.atom)).filter(k=>k.startsWith('acl:')));
const semanticKeys=new Set([...expected.keys()].filter(k=>!k.startsWith('acl:')&&!k.startsWith('extension:')));
const semanticMismatch=[...semanticKeys].filter(k=>actual.get(k)?.value_sha256!==expected.get(k)?.value_sha256);
const unexpectedSemantic=[...actual.keys()].filter(k=>!k.startsWith('acl:')&&!k.startsWith('extension:')&&!expected.has(k));
// A missing expected grant is a strictly more restrictive hosted state.  Keep it
// visible, but only fail direct ACL comparison for a changed/present atom.  The
// exhaustive effective privilege matrix below remains the authority for grants.
const restrictiveDirectAcl=[...securityAclKeys].filter(k=>expected.has(k)&&!actual.has(k)).sort();
const securityMismatch=[...securityAclKeys].filter(k=>actual.has(k)&&actual.get(k)?.value_sha256!==expected.get(k)?.value_sha256);
const pgcrypto=capture.platform_capabilities?.pgcrypto;
const pgcryptoCompatible=pgcrypto?.installed===true&&['public','extensions'].includes(pgcrypto.schema)&&pgcrypto.version==='1.3'&&pgcrypto.digest_extension_owned===true&&pgcrypto.digest_callable===true;
const platformAclVariance=[...new Set([...actual.keys(),...expected.keys()])].filter(k=>k.startsWith('acl:')&&!securityAclKeys.has(k)&&(actual.get(k)?.value_sha256??null)!==(expected.get(k)?.value_sha256??null)).sort();
const unexpectedDirectAcl=[...actual.keys()].filter(k=>k.startsWith('acl:')&&!securityAclKeys.has(k)&&!expected.has(k)&&/:(anon|authenticated|service_role):/.test(k)&&!k.endsWith(':MAINTAIN')).sort();
const history=capture.migration_history?.versions??[];
// The read-only capture deliberately emits schema_migrations in lexical order;
// compare the exact vector in that same canonical representation.
const fullHistory=contract.production_order.map(f=>f.split('_',1)[0]).sort();
const reconciliationStep=contract.production_steps.find(step=>step.file.startsWith('20260925011000_'));
const reconciliationVersion=reconciliationStep.file.split('_',1)[0];
const repairVersion='20260925012000';
const compatibilityVersion='20260925013000';
const previewHistory=fullHistory.filter(version=>version!==reconciliationVersion&&version!==repairVersion&&version!==compatibilityVersion);
const reconciliationEffectsComplete=reconciliationStep.diff.evidence.every(e=>(actual.get(e.atom)?.value_sha256??null)===e.after_sha256);
const reconciliationHistoryAbsent=!history.includes(reconciliationVersion);
const exactFullHistory=capture.migration_history?.count===fullHistory.length&&JSON.stringify(history)===JSON.stringify(fullHistory);
const exactPreviewHistory=capture.migration_history?.count===previewHistory.length&&JSON.stringify(history)===JSON.stringify(previewHistory);
const effectHistoryState=reconciliationEffectsComplete&&reconciliationHistoryAbsent&&exactPreviewHistory?'effect-complete/history-absent':exactFullHistory?'complete':'invalid';
const expectedPrivileges=JSON.parse(readFileSync(resolve(here,'expected-effective-privileges.v1.json'),'utf8'));
const privilegeKey=x=>`${x.role}|${x.kind}|${x.object}|${x.privilege}`;
const expectedPrivilegeMap=new Map(expectedPrivileges.map(x=>[privilegeKey(x),x]));
const actualPrivilegeRows=Array.isArray(capture.effective_privileges)?capture.effective_privileges:[];
const actualPrivilegeMap=new Map(actualPrivilegeRows.map(x=>[privilegeKey(x),x]));
const requiredRuntimeAllows=[
  ...['get_user_current_usage(user_uuid uuid)','can_user_create_proposal(user_uuid uuid)','get_user_usage_info(user_uuid uuid)','increment_user_usage(user_uuid uuid)','can_user_access_template(user_uuid uuid, template_uuid uuid)','user_has_active_access(user_uuid uuid)','get_user_accessible_templates(user_uuid uuid)'].map(object=>`authenticated|function|${object}|EXECUTE`),
  'service_role|relation|proposals|SELECT',
  'service_role|relation|additional_service_catalog|SELECT',
  'service_role|relation|additional_service_catalog|INSERT',
  'authenticated|relation|proposal_tracking|SELECT',
  ...['read_tracked_proposal(token text)','read_tracked_proposal_print(token text)','record_tracked_view(token text)','record_tracked_download(token text)','record_tracking_click(token text, clicked_element_type text, clicked_element_text text, clicked_element_id text)','record_tracking_metric(token text, metric text, value integer)','tracked_proposal_has_paid_access(token text)'].map(object=>`anon|function|${object}|EXECUTE`)
];
if(requiredRuntimeAllows.some(k=>expectedPrivilegeMap.get(k)?.allowed!==true))throw new Error('required runtime allow is absent from reviewed expected matrix');
const privilegeShapeExact=actualPrivilegeMap.size===actualPrivilegeRows.length&&actualPrivilegeMap.size===expectedPrivilegeMap.size&&[...expectedPrivilegeMap.keys()].every(k=>actualPrivilegeMap.has(k));
const effectivePrivilegeMismatches=[...expectedPrivilegeMap].flatMap(([k,want])=>{
  const got=actualPrivilegeMap.get(k);
  if(!got||got.allowed===want.allowed||(want.role==='service_role'&&want.privilege==='MAINTAIN'))return [];
  return [{key:k,expected:want.allowed,actual:got.allowed,unsafe:want.allowed===false&&got.allowed===true}];
});
const unsafeEffectiveAllows=effectivePrivilegeMismatches.filter(x=>x.unsafe);
const restrictiveEffectivePrivileges=effectivePrivilegeMismatches.filter(x=>!x.unsafe);
const missingRequiredRuntimeAllows=requiredRuntimeAllows.filter(k=>actualPrivilegeMap.get(k)?.allowed!==true);
const maintainDenied=actualPrivilegeRows.filter(x=>['anon','authenticated'].includes(x.role)&&x.privilege==='MAINTAIN').every(x=>x.allowed===false);
const privateNames=['_r0_get_user_current_usage_impl(user_uuid uuid)','_r0_can_user_create_proposal_impl(user_uuid uuid)','_r0_get_user_usage_info_impl(user_uuid uuid)','_r0_increment_user_usage_impl(user_uuid uuid)','_r0_can_user_access_template_impl(user_uuid uuid, template_uuid uuid)','_r0_user_has_active_access_impl(user_uuid uuid)','_r0_get_user_accessible_templates_impl(user_uuid uuid)'];
const privateDenied=privateNames.every(name=>['anon','authenticated','service_role'].every(role=>(capture.effective_privileges??[]).some(x=>x.role===role&&x.kind==='function'&&x.object===name&&x.privilege==='EXECUTE'&&x.allowed===false)));
const effectivePrivilegeExact=privilegeShapeExact&&maintainDenied&&privateDenied&&unsafeEffectiveAllows.length===0&&missingRequiredRuntimeAllows.length===0;
const roleMembership=capture.platform_capabilities?.role_membership;
const clientRoles=new Set(['anon','authenticated','service_role']);
// pg_auth_members.roleid is the granted role and member is its recipient.
// Provider principals inheriting a client role do not grant clients privileges.
const roleMembershipSafe=Array.isArray(roleMembership)&&roleMembership.every(x=>!clientRoles.has(x.member));
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={contract_version:3,canonicalization_version:2,target:productionPostflight?'production-postflight':'isolated-preview',capture_sha256:sha(captureBytes),expected_state_sha256:sha(contractBytes),compatible:false,migration_acl_provenance:[...securityAclKeys].sort(),required_runtime_allows:requiredRuntimeAllows,application_semantics_exact:semanticMismatch.length===0&&unexpectedSemantic.length===0,direct_migration_acl_exact:securityMismatch.length===0,effective_privilege_exact:effectivePrivilegeExact,role_membership:capture.platform_capabilities?.role_membership??null,pgcrypto:{compatible:pgcryptoCompatible,schema:pgcrypto?.schema??null,version:pgcrypto?.version??null,callable:pgcrypto?.digest_callable??false},history_exact:exactFullHistory,effect_history_state:effectHistoryState,history_reconciliation_required:effectHistoryState==='effect-complete/history-absent',platform_acl_variance:platformAclVariance,more_restrictive_direct_acl:restrictiveDirectAcl,more_restrictive_effective_privileges:restrictiveEffectivePrivileges.filter(x=>!requiredRuntimeAllows.includes(x.key)),failures:{semanticMismatch,unexpectedSemantic,securityMismatch,effectivePrivileges:unsafeEffectiveAllows,requiredRuntimeAllows:missingRequiredRuntimeAllows,privilegeShape:privilegeShapeExact?[]:['effective privilege inventory keys are missing, duplicated, or unexpected']}};
report.role_membership_safe=roleMembershipSafe;
report.unexpected_direct_acl=unexpectedDirectAcl;
if(report.application_semantics_exact&&report.direct_migration_acl_exact&&unexpectedDirectAcl.length===0&&effectivePrivilegeExact&&roleMembershipSafe&&pgcryptoCompatible&&exactFullHistory)report.compatible=true;
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(output);
if(!report.compatible)process.exitCode=2;
