#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

const execFileAsync=promisify(execFile);
const root=resolve(import.meta.dirname,'../..');
const migrationDir=resolve(root,'supabase/migrations');
const pgBin=process.env.PG_BIN||dirname(execFileSync('/usr/bin/which',['initdb'],{encoding:'utf8'}).trim());
const work=mkdtempSync(resolve(tmpdir(),'veltex-r3-5-accept-'));
const data=resolve(work,'data');
const port=Number(process.env.R3_5_ACCEPT_PGPORT||57200+(process.pid%300));
const baseArgs=['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-h',work,'-p',String(port),'-d','veltex_r35_accept'];
const run=(file,args)=>execFileSync(file,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const psql=(args)=>run(resolve(pgBin,'psql'),[...baseArgs,...args]);
const psqlText=(text,name='proof.sql')=>{const path=resolve(work,name);writeFileSync(path,text);return psql(['-f',path]);};
let started=false;

try{
  run(resolve(pgBin,'initdb'),['-D',data,'-A','trust','-U',process.env.USER||'postgres']);
  run(resolve(pgBin,'pg_ctl'),['-D',data,'-o',`-p ${port} -k ${work} -c listen_addresses=''`,'-l',resolve(work,'postgres.log'),'start']);
  started=true;
  run(resolve(pgBin,'createdb'),['-h',work,'-p',String(port),'veltex_r35_accept']);
  psql(['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
  const migrations=readdirSync(migrationDir).filter(file=>file.endsWith('.sql')).sort();
  assert.equal(migrations.length,77);
  for(const migration of migrations) psql(['-f',resolve(migrationDir,migration)]);
  psql(['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/10_fixtures.sql')]);

  const matrixPath=resolve(root,'quality/r3-4-1-package-set/sql/adversarial-role-matrix.sql');
  const packageMatrix=readFileSync(matrixPath,'utf8');
  const committedSetup=packageMatrix.replace(
    /select 'R3_4_1_ADVERSARIAL_ROLE_MATRIX_PASS';\s*rollback;\s*$/,
    "select 'R3_4_1_ADVERSARIAL_ROLE_MATRIX_PASS';\ncommit;\n",
  );
  assert.notEqual(committedSetup,packageMatrix,'failed to create committed disposable C0.3 fixture');
  assert.match(psqlText(committedSetup,'fixture.sql'),/R3_4_1_ADVERSARIAL_ROLE_MATRIX_PASS/);

  const context=JSON.parse(psql(['-c',`select jsonb_build_object(
    'org',(select active_organization_id from public.profiles where id='11111111-1111-4111-8111-111111111111'),
    'version',(select id from public.crm_proposal_versions where proposal_id='93000000-0000-4000-8000-000000000004' and schema_version='crm_proposal_version.v2'),
    'associations',(select jsonb_agg(id order by display_position) from public.crm_proposal_version_packages where proposal_version_id=(select id from public.crm_proposal_versions where proposal_id='93000000-0000-4000-8000-000000000004' and schema_version='crm_proposal_version.v2'))
  )::text`]).trim());
  assert.equal(context.associations.length,2);

  // Create a second immutable v2/association only inside the disposable proof
  // database so the command can be challenged with a real, well-formed
  // cross-version association rather than only a random UUID.
  psqlText(`
set session_replication_role=replica;
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
  contact_phone,service_location,facility_size,service_type,service_frequency,
  generated_content,service_scope,crm_opportunity_id,crm_customer_id,crm_property_id)
select 'a3000000-0000-4000-8000-000000000003',organization_id,user_id,
  title||' foreign',client_name,client_email,contact_phone,service_location,
  facility_size,service_type,service_frequency,generated_content,service_scope,
  crm_opportunity_id,crm_customer_id,crm_property_id
from public.proposals where id='93000000-0000-4000-8000-000000000004';
insert into public.crm_proposal_versions(
 id,organization_id,proposal_id,opportunity_id,property_id,work_package_id,
 estimate_run_id,version_number,request_key,content_snapshot,rendered_content,
 display_amount_minor,currency,pricing_basis,content_sha256,rendered_sha256,
 estimate_input_sha256,estimate_output_sha256,schema_version,created_by,
 created_at,package_count,package_set_sha256)
select 'a3000000-0000-4000-8000-000000000001',organization_id,
 'a3000000-0000-4000-8000-000000000003',
 opportunity_id,property_id,null,null,version_number+100,'c03-foreign-version',
 content_snapshot,rendered_content,display_amount_minor,currency,null,
 content_sha256,rendered_sha256,estimate_input_sha256,estimate_output_sha256,
 schema_version,created_by,created_at,package_count,package_set_sha256
from public.crm_proposal_versions where id='${context.version}';
insert into public.crm_proposal_version_packages(
 id,organization_id,proposal_version_id,opportunity_id,property_id,
 work_package_id,estimate_run_id,display_position,customer_visible_title,
 customer_visible_scope,amount_minor,currency,pricing_basis,
 estimate_input_sha256,estimate_output_sha256,scope_sha256,
 association_sha256,created_at)
select 'a3000000-0000-4000-8000-000000000002',organization_id,
 'a3000000-0000-4000-8000-000000000001',opportunity_id,property_id,
 work_package_id,estimate_run_id,display_position,customer_visible_title,
 customer_visible_scope,amount_minor,currency,pricing_basis,
 estimate_input_sha256,estimate_output_sha256,scope_sha256,
 association_sha256,created_at
from public.crm_proposal_version_packages where id='${context.associations[0]}';
set session_replication_role=origin;
`,'cross-version-fixture.sql');

  const fullSetOutput=psqlText(`
begin;
set local role service_role;
do $$
declare org uuid:='${context.org}'; version_id uuid:='${context.version}'; issued record; result jsonb; replay jsonb; err text;
  ids uuid[]:=array['${context.associations[0]}'::uuid,'${context.associations[1]}'::uuid];
begin
  select * into issued from public.command_crm_issue_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,'accept_proposal',repeat('1',64),1,null,1,'c03-full-token-0001',repeat('1',64));
  perform public.exchange_crm_customer_action_token_internal(repeat('1',64),1,repeat('a',64));
  result:=public.command_crm_accept_proposal_version_internal(repeat('a',64),ids,'Full Set Signer','FULL.SET@example.test','c03-full-accept-0001');
  if result->>'selectedSubtotalMinor'<>'32500' or result->>'fullOfferedTotalMinor'<>'32500' or result->>'replayed'<>'false' then raise exception 'full-set acceptance projection failed'; end if;
  replay:=public.command_crm_accept_proposal_version_internal(repeat('a',64),ids,'Full Set Signer','full.set@example.test','c03-full-accept-0001');
  if replay->>'replayed'<>'true' or replay->>'receiptId'<>result->>'receiptId' then raise exception 'exact acceptance replay failed'; end if;
  begin
    perform public.command_crm_accept_proposal_version_internal(repeat('a',64),ids,'Changed Signer','full.set@example.test','c03-full-accept-0001');
    raise exception 'changed acceptance replay accepted';
  exception when unique_violation then get stacked diagnostics err=message_text; if err<>'proposal acceptance conflict' then raise; end if; end;
  if (select count(*) from public.crm_site_work_packages where id=any(array['93000000-0000-4000-8000-000000000005'::uuid,'93000000-0000-4000-8000-000000000006'::uuid]) and status='accepted')<>2 then raise exception 'full-set packages not accepted'; end if;
end $$;
select 'C0_3_FULL_SET_PASS';
rollback;
`,'full-set.sql');
  assert.match(fullSetOutput,/C0_3_FULL_SET_PASS/);

  const expectUnavailable=({label,digit,session,purpose='accept_proposal',designated='null',setup='',ids=`array['${context.associations[0]}'::uuid]`})=>{
    const output=psqlText(`
begin;
set local role service_role;
select * from public.command_crm_issue_customer_action_token_internal(
 '11111111-1111-4111-8111-111111111111','${context.org}','${context.version}','${purpose}',repeat('${digit}',64),1,${designated},1,'c03-${label}-token',repeat('${digit}',64));
select public.exchange_crm_customer_action_token_internal(repeat('${digit}',64),1,repeat('${session}',64));
reset role;
${setup}
set local role service_role;
do $$ declare err text; begin
  begin
    perform public.command_crm_accept_proposal_version_internal(repeat('${session}',64),${ids},'Negative Signer','negative@example.test','c03-${label}-accept');
    raise exception 'negative ${label} accepted';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal acceptance unavailable' then raise; end if;
  end;
end $$;
rollback;
select 'C0_3_${label.toUpperCase().replaceAll('-','_')}_PASS';
`,`${label}.sql`);
    assert.match(output,new RegExp(`C0_3_${label.toUpperCase().replaceAll('-','_')}_PASS`));
  };

  expectUnavailable({label:'wrong-purpose',digit:'4',session:'d',purpose:'respond_proposal'});
  expectUnavailable({label:'revoked',digit:'5',session:'e',setup:`
insert into public.crm_customer_action_token_revocations(organization_id,token_id,reason,revoked_by)
select organization_id,id,'negative proof','11111111-1111-4111-8111-111111111111'
from public.crm_customer_action_tokens where token_hmac_sha256=repeat('5',64);`});
  expectUnavailable({label:'expired-token',digit:'6',session:'f',setup:`
set local session_replication_role=replica;
update public.crm_customer_action_tokens set issued_at=now()-interval '2 days',expires_at=now()-interval '1 day'
where token_hmac_sha256=repeat('6',64);
set local session_replication_role=origin;`});
  expectUnavailable({label:'expired-session',digit:'7',session:'1',setup:`
set local session_replication_role=replica;
update public.crm_customer_action_sessions set created_at=now()-interval '20 minutes',expires_at=now()-interval '5 minutes'
where session_hmac_sha256=repeat('1',64);
set local session_replication_role=origin;`});
  expectUnavailable({label:'designated',digit:'8',session:'2',designated:"repeat('d',64)"});
  expectUnavailable({label:'disabled',digit:'9',session:'3',setup:`
insert into public.crm_proposal_action_eligibility_events(organization_id,proposal_version_id,opportunity_id,state,reason,created_by,created_at)
values('${context.org}','${context.version}','93000000-0000-4000-8000-000000000003','disabled','negative proof','11111111-1111-4111-8111-111111111111',clock_timestamp()+interval '1 second');`});
  expectUnavailable({label:'unknown-association',digit:'a',session:'4',ids:`array['${context.associations[0]}'::uuid,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid]`});
  expectUnavailable({label:'cross-version-association',digit:'e',session:'8',ids:`array['${context.associations[0]}'::uuid,'a3000000-0000-4000-8000-000000000002'::uuid]`});
  expectUnavailable({label:'superseded-version',digit:'f',session:'9',setup:`
set local session_replication_role=replica;
insert into public.crm_proposal_versions(
 id,organization_id,proposal_id,opportunity_id,property_id,work_package_id,
 estimate_run_id,version_number,request_key,content_snapshot,rendered_content,
 display_amount_minor,currency,pricing_basis,content_sha256,rendered_sha256,
 estimate_input_sha256,estimate_output_sha256,schema_version,created_by,
 created_at,package_count,package_set_sha256)
select 'a4000000-0000-4000-8000-000000000001',organization_id,proposal_id,
 opportunity_id,property_id,null,null,version_number+200,'c03-superseding-version',
 content_snapshot,rendered_content,display_amount_minor,currency,null,
 content_sha256,rendered_sha256,estimate_input_sha256,estimate_output_sha256,
 schema_version,created_by,clock_timestamp()+interval '1 second',package_count,
 package_set_sha256
from public.crm_proposal_versions where id='${context.version}';
set local session_replication_role=origin;`});
  expectUnavailable({label:'stale-package',digit:'b',session:'5',setup:`
update public.crm_site_work_packages set status='declined' where id='93000000-0000-4000-8000-000000000005';`});
  expectUnavailable({label:'soft-deleted-opportunity',digit:'c',session:'6',setup:`
update public.crm_opportunities set deleted_at=now() where id='93000000-0000-4000-8000-000000000003';`});
  expectUnavailable({label:'terminal-opportunity',digit:'d',session:'7',setup:`
set local session_replication_role=replica;
update public.crm_opportunities set stage_id=(select id from public.crm_pipeline_stages where organization_id='${context.org}' and pipeline_id=(select pipeline_id from public.crm_opportunities where id='93000000-0000-4000-8000-000000000003') and category='lost' order by position,id limit 1) where id='93000000-0000-4000-8000-000000000003';
set local session_replication_role=origin;`});

  const receiptBindingOutput=psqlText(`
begin;
set local role service_role;
do $$ declare err text; begin
  begin
    update public.crm_opportunities set
      stage_id=(select id from public.crm_pipeline_stages where organization_id='${context.org}' and pipeline_id=crm_opportunities.pipeline_id and category='won' order by position,id limit 1),
      acceptance_method='customer_acceptance',manual_win_reason=null
    where id='93000000-0000-4000-8000-000000000003';
    raise exception 'unbound customer acceptance transition succeeded';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'customer acceptance requires a receipt-bound transition' then raise; end if;
  end;
end $$;
rollback;
select 'C0_3_RECEIPT_BINDING_NEGATIVE_PASS';
`,'receipt-binding-negative.sql');
  assert.match(receiptBindingOutput,/C0_3_RECEIPT_BINDING_NEGATIVE_PASS/);

  const seed=(digit,session,key)=>psqlText(`
begin; set local role service_role;
select * from public.command_crm_issue_customer_action_token_internal(
 '11111111-1111-4111-8111-111111111111','${context.org}','${context.version}','accept_proposal',repeat('${digit}',64),1,null,1,'${key}',repeat('${digit}',64));
select public.exchange_crm_customer_action_token_internal(repeat('${digit}',64),1,repeat('${session}',64));
commit;`);
  seed('f','9','c03-revoke-race-token');
  const revokeToken=psql(['-c',`select id from public.crm_customer_action_tokens where token_hmac_sha256=repeat('f',64)`]).trim();
  const revokeBlocker=execFileAsync(resolve(pgBin,'psql'),[...baseArgs,'-c',`
set application_name='c03-revoke-blocker'; begin; set local role service_role;
select * from public.command_crm_revoke_customer_action_token_internal(
 '11111111-1111-4111-8111-111111111111','${context.org}','${context.version}',
 '${revokeToken}','overlap revocation proof','c03-revoke-race-request',repeat('f',64));
select pg_sleep(2); commit;`],{encoding:'utf8'});
  await new Promise(resolveDelay=>setTimeout(resolveDelay,150));
  const racedAccept=execFileAsync(resolve(pgBin,'psql'),[...baseArgs,'-c',
    `set application_name='c03-revocation-racer'; set role service_role;
select public.command_crm_accept_proposal_version_internal(repeat('9',64),array['${context.associations[0]}'::uuid],
 'Revocation Race','revoke-race@example.test','c03-revoke-race-accept')::text;`],{encoding:'utf8'});
  let revocationOverlap=false;
  for(let attempt=0;attempt<30 && !revocationOverlap;attempt++){
    revocationOverlap=Number(psql(['-c',`select count(*) from pg_stat_activity where application_name='c03-revocation-racer' and wait_event_type='Lock'`]).trim())===1;
    if(!revocationOverlap) await new Promise(resolveDelay=>setTimeout(resolveDelay,50));
  }
  assert.equal(revocationOverlap,true,'acceptance must visibly wait on the token-set lock while revocation is uncommitted');
  await revokeBlocker;
  const racedAcceptResult=await Promise.allSettled([racedAccept]);
  assert.equal(racedAcceptResult[0].status,'rejected','acceptance must fail after the overlapping revocation commits');
  assert.match(String(racedAcceptResult[0].reason?.stderr||racedAcceptResult[0].reason),/proposal acceptance unavailable/);
  psqlText(`insert into public.crm_proposal_action_eligibility_events(
    organization_id,proposal_version_id,opportunity_id,state,reason,created_by)
  values('${context.org}','${context.version}','93000000-0000-4000-8000-000000000003',
    'enabled','restore after disposable overlap proof','11111111-1111-4111-8111-111111111111');
  select 'C0_3_REVOCATION_OVERLAP_PASS';`,'revocation-overlap-restore.sql');
  seed('2','b','c03-race-token-0001');
  seed('3','c','c03-race-token-0002');

  const rollbackOutput=psqlText(`
alter table public.organization_event_outbox add constraint c03_forced_late_failure check(event_type<>'proposal.acceptance_received');
set role service_role;
do $$ declare err text; begin
  begin
    perform public.command_crm_accept_proposal_version_internal(repeat('b',64),array['${context.associations[0]}'::uuid],
      'Rollback Signer','rollback@example.test','c03-rollback-accept-0001');
    raise exception 'forced late failure did not fail';
  exception when check_violation then get stacked diagnostics err=message_text; end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.crm_proposal_acceptance_receipts)
     or exists(select 1 from public.crm_site_work_packages where status='accepted')
     or exists(select 1 from public.crm_pipeline_stages s join public.crm_opportunities o on o.stage_id=s.id where o.id='93000000-0000-4000-8000-000000000003' and s.category='won') then
    raise exception 'forced late failure left partial acceptance state';
  end if;
end $$;
alter table public.organization_event_outbox drop constraint c03_forced_late_failure;
select 'C0_3_LATE_ROLLBACK_PASS';
`,'rollback.sql');
  assert.match(rollbackOutput,/C0_3_LATE_ROLLBACK_PASS/);

  const call=(session,key,appName='c03-replay')=>`set application_name='${appName}'; set role service_role; select public.command_crm_accept_proposal_version_internal(repeat('${session}',64),array['${context.associations[0]}'::uuid],'Race Signer','race@example.test','${key}')::text;`;
  const blocker=execFileAsync(resolve(pgBin,'psql'),[...baseArgs,'-c',`set application_name='c03-blocker'; begin; select pg_advisory_xact_lock(hashtextextended('veltex-c0-accept:${context.version}',0)); select pg_sleep(2); commit;`],{encoding:'utf8'});
  await new Promise(resolveDelay=>setTimeout(resolveDelay,150));
  const racers=[
    execFileAsync(resolve(pgBin,'psql'),[...baseArgs,'-c',call('b','c03-race-accept-0001','c03-racer-1')],{encoding:'utf8'}),
    execFileAsync(resolve(pgBin,'psql'),[...baseArgs,'-c',call('c','c03-race-accept-0002','c03-racer-2')],{encoding:'utf8'}),
  ];
  let overlap=false;
  for(let attempt=0;attempt<30 && !overlap;attempt++){
    const waiting=Number(psql(['-c',`select count(*) from pg_stat_activity where application_name in ('c03-racer-1','c03-racer-2') and wait_event_type='Lock'`]).trim());
    overlap=waiting===2;
    if(!overlap) await new Promise(resolveDelay=>setTimeout(resolveDelay,50));
  }
  assert.equal(overlap,true,'both acceptance sessions must visibly overlap on the version advisory lock');
  await blocker;
  const race=await Promise.allSettled(racers);
  const winners=race.map((item,index)=>({item,index})).filter(({item})=>item.status==='fulfilled');
  assert.equal(winners.length,1,'exactly one concurrent acceptance must commit');
  const losers=race.filter(item=>item.status==='rejected');
  assert.equal(losers.length,1);
  assert.match(String(losers[0].reason?.stderr||losers[0].reason),/proposal acceptance unavailable/);
  const winner=winners[0].index===0?{session:'b',key:'c03-race-accept-0001'}:{session:'c',key:'c03-race-accept-0002'};
  assert.match(winners[0].item.value.stdout,/"replayed": false/);

  const finalProof=JSON.parse(psql(['-c',`select jsonb_build_object(
    'receipts',(select count(*) from public.crm_proposal_acceptance_receipts),
    'accepted_packages',(select count(*) from public.crm_site_work_packages where id in ('93000000-0000-4000-8000-000000000005','93000000-0000-4000-8000-000000000006') and status='accepted'),
    'preserved_packages',(select count(*) from public.crm_site_work_packages where id in ('93000000-0000-4000-8000-000000000005','93000000-0000-4000-8000-000000000006') and status='estimated'),
    'won',(select s.category='won' from public.crm_opportunities o join public.crm_pipeline_stages s on s.organization_id=o.organization_id and s.id=o.stage_id where o.id='93000000-0000-4000-8000-000000000003'),
    'history',(select count(*) from public.crm_opportunity_stage_history where opportunity_id='93000000-0000-4000-8000-000000000003' and reason_code like 'customer_acceptance:%'),
    'outbox',(select count(*) from public.organization_event_outbox where event_type='proposal.acceptance_received'),
    'outbox_identifier_only',(select payload ?& array['receipt_id','proposal_version_id','opportunity_id'] and not(payload ?| array['name','email','consent','token','session']) from public.organization_event_outbox where event_type='proposal.acceptance_received'),
    'association_correspondence',(select r.selected_association_sha256s=array_agg(a.association_sha256 order by a.display_position)
      and r.selected_work_package_ids=array_agg(a.work_package_id order by a.display_position)
      from public.crm_proposal_acceptance_receipts r join public.crm_proposal_version_packages a
        on a.organization_id=r.organization_id and a.proposal_version_id=r.proposal_version_id and a.id=any(r.selected_association_ids)
      group by r.id),
    'receipt_hash_correspondence',(select r.receipt_sha256=public.crm_estimate_sha256(jsonb_build_object(
      'organization_id',r.organization_id,'proposal_version_id',r.proposal_version_id,'opportunity_id',r.opportunity_id,
      'token_id',r.token_id,'session_id',r.session_id,'request_sha256',r.request_sha256,
      'signer_entered_name',r.signer_entered_name,'signer_entered_email_normalized',r.signer_entered_email_normalized,
      'consent_version',r.consent_version,'consent_text',r.consent_text,'selected_association_ids',to_jsonb(r.selected_association_ids),
      'selected_association_sha256s',to_jsonb(r.selected_association_sha256s),'selected_work_package_ids',to_jsonb(r.selected_work_package_ids),
      'full_offered_total_minor',r.full_offered_total_minor,'selected_subtotal_minor',r.selected_subtotal_minor,'currency',r.currency,
      'package_set_sha256',r.package_set_sha256,'content_sha256',r.content_sha256,'rendered_sha256',r.rendered_sha256,
      'accepted_at_utc',to_char(r.accepted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')))
      from public.crm_proposal_acceptance_receipts r),
    'unrevoked_accept_tokens',(select count(*) from public.crm_customer_action_tokens t where t.proposal_version_id='${context.version}' and t.purpose='accept_proposal' and not exists(select 1 from public.crm_customer_action_token_revocations r where r.organization_id=t.organization_id and r.token_id=t.id))
  )::text`]).trim());
  assert.deepEqual(finalProof,{receipts:1,accepted_packages:1,preserved_packages:1,won:true,history:1,outbox:1,
    outbox_identifier_only:true,association_correspondence:true,receipt_hash_correspondence:true,unrevoked_accept_tokens:0});

  const replay=JSON.parse(psql(['-c',call(winner.session,winner.key)]).trim());
  assert.equal(replay.replayed,true);
  assert.equal(replay.selectedSubtotalMinor,12500);
  assert.equal(replay.fullOfferedTotalMinor,32500);

  const refreshedRoom=JSON.parse(psql(['-c',`set role service_role;
    select public.read_crm_customer_proposal_room_internal(repeat('${winner.session}',64))::text;`]).trim());
  assert.equal(refreshedRoom.acceptanceEnabled,false);
  assert.deepEqual(refreshedRoom.allowedActions,[]);
  assert.equal(refreshedRoom.receipt.receiptId,replay.receiptId);
  assert.equal(refreshedRoom.receipt.selectedSubtotalMinor,12500);
  assert.equal(refreshedRoom.receipt.fullOfferedTotalMinor,32500);
  assert.equal(JSON.stringify(refreshedRoom).includes('Race Signer'),false,
    'customer refresh projection must not expose signer-entered name');
  assert.equal(JSON.stringify(refreshedRoom).includes('race@example.test'),false,
    'customer refresh projection must not expose signer-entered email');

  const summaryFor=(user)=>JSON.parse(psql(['-c',`set role authenticated;
    with identity as (select set_config('request.jwt.claim.sub','${user}',true) value)
    select public.read_crm_acceptance_summaries('${context.org}')::text from identity;`]).trim());
  const ownerSummary=summaryFor('11111111-1111-4111-8111-111111111111');
  assert.equal(ownerSummary.length,1);
  assert.equal(ownerSummary[0].selected_subtotal_minor,12500);
  assert.equal(ownerSummary[0].full_offered_total_minor,32500);
  assert.equal(JSON.stringify(ownerSummary).includes('Race Signer'),false);
  assert.equal(JSON.stringify(ownerSummary).includes('race@example.test'),false);
  const viewerSummary=summaryFor('95555555-5555-4555-8555-555555555555');
  assert.equal(viewerSummary.length,1);
  assert.equal(viewerSummary[0].selected_subtotal_minor,undefined);
  assert.equal(viewerSummary[0].full_offered_total_minor,undefined);
  assert.equal(viewerSummary[0].currency,undefined);
  assert.equal(typeof viewerSummary[0].receipt_sha256,'string');
  assert.equal(summaryFor('94444444-4444-4444-8444-444444444444').length,1,
    'assigned estimator must see the acceptance summary');
  assert.deepEqual(summaryFor('96666666-6666-4666-8666-666666666666'),[],
    'unassigned estimator must receive no acceptance oracle');

  const immutableOutput=psqlText(`do $$ begin
    begin update public.crm_proposal_acceptance_receipts set signer_entered_name='Changed'; raise exception 'receipt update accepted'; exception when insufficient_privilege then null; end;
    begin delete from public.crm_proposal_acceptance_receipts; raise exception 'receipt delete accepted'; exception when insufficient_privilege then null; end;
    begin truncate public.crm_proposal_acceptance_receipts; raise exception 'receipt truncate accepted'; exception when insufficient_privilege then null; end;
  end $$; select 'C0_3_IMMUTABLE_PASS';`,'immutable.sql');
  assert.match(immutableOutput,/C0_3_IMMUTABLE_PASS/);
  console.log('R3-5 C0.3/C0.4 acceptance and projection adversarial PostgreSQL PASS');
}finally{
  if(started){try{run(resolve(pgBin,'pg_ctl'),['-D',data,'stop','-m','fast']);}catch{}}
  rmSync(work,{recursive:true,force:true});
}
