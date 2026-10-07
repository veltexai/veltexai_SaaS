#!/usr/bin/env bash
# Two independent v2 publishers race on the same ordered package set and the
# same optimistic tokens. Exactly one transaction may commit.
set -euo pipefail
: "${R3_4_1_PGDATA:?Dedicated R3-4.1 harness cluster required}"
[ "$(basename "$R3_4_1_PGDATA")" = data ]
case "$(basename "$(dirname "$R3_4_1_PGDATA")")" in
  veltex-r3-4-1-foundation-*) ;;
  *) echo 'Refusing non-R3-4.1 harness directory' >&2; exit 2;;
esac
q(){ psql -X -q -At -v ON_ERROR_STOP=1 -d "${PGDATABASE:?}" -c "$1"; }
[ "$(q 'show data_directory')" = "$R3_4_1_PGDATA" ] || { echo 'Connected database is not the requested disposable harness' >&2; exit 2; }
ORG=$(q "select active_organization_id from public.profiles where id='11111111-1111-4111-8111-111111111111'")

q "insert into public.crm_customers(id,organization_id,customer_type,name,created_by)
values('94000000-0000-4000-8000-000000000001','$ORG','household','Package race customer','11111111-1111-4111-8111-111111111111');
insert into public.crm_properties(id,organization_id,customer_id,name,address_line_1,created_by)
values('94000000-0000-4000-8000-000000000002','$ORG','94000000-0000-4000-8000-000000000001','Package race property','1 Race Way','11111111-1111-4111-8111-111111111111');
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,
 idempotency_key,name,owner_user_id,segment,source,created_by)
select '94000000-0000-4000-8000-000000000003','$ORG','94000000-0000-4000-8000-000000000001',p.id,s.id,
 '94000000-0000-4000-8000-000000000002','r341-race-opportunity','Package race opportunity',
 '11111111-1111-4111-8111-111111111111','residential','manual','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s on s.organization_id=p.organization_id and s.pipeline_id=p.id
where p.organization_id='$ORG' and p.template_key='residential_turnover_v1' and s.category='new' order by s.position limit 1;
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,contact_phone,service_location,
 facility_size,service_type,service_frequency,generated_content,service_scope,crm_opportunity_id,crm_customer_id,crm_property_id)
values('94000000-0000-4000-8000-000000000004','$ORG','11111111-1111-4111-8111-111111111111',
 'Package race proposal','Race Customer','race@example.test','555-0141','1 Race Way',1000,'residential','weekly',
 'Race working copy','{\"areas_included\":[\"Kitchen\"]}'::jsonb,'94000000-0000-4000-8000-000000000003',
 '94000000-0000-4000-8000-000000000001','94000000-0000-4000-8000-000000000002');
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,proposal_id,idempotency_key,created_by)
values
 ('94000000-0000-4000-8000-000000000005','$ORG','94000000-0000-4000-8000-000000000003','94000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000004','r341-race-package-a','11111111-1111-4111-8111-111111111111'),
 ('94000000-0000-4000-8000-000000000006','$ORG','94000000-0000-4000-8000-000000000003','94000000-0000-4000-8000-000000000002','94000000-0000-4000-8000-000000000004','r341-race-package-b','11111111-1111-4111-8111-111111111111');"

INPUT='{"catalogVersion":"2026-09-22.2","segment":"residential","jobType":"recurring_standard","frequency":"weekly"}'
for SPEC in '5|race-estimate-a|12500|125' '6|race-estimate-b|20000|200'; do
  IFS='|' read -r SUFFIX KEY AMOUNT PRICE <<<"$SPEC"
  PACKAGE="94000000-0000-4000-8000-00000000000${SUFFIX}"
  TOKEN=$(q "select updated_at from public.crm_site_work_packages where id='$PACKAGE'")
  OUTPUT="{\"version\":\"2026-09-22.2\",\"unit\":\"per_visit\",\"low\":{\"suggestedPrice\":100},\"base\":{\"suggestedPrice\":$PRICE},\"high\":{\"suggestedPrice\":250}}"
  q "set role service_role; select * from public.command_crm_estimate_run_internal(
   '11111111-1111-4111-8111-111111111111','$ORG','94000000-0000-4000-8000-000000000003','$PACKAGE',
   '94000000-0000-4000-8000-000000000002','$KEY','service_catalog','2026-09-22.2',
   '$INPUT'::jsonb,'$OUTPUT'::jsonb,'base',$AMOUNT,'USD','per_visit','$TOKEN');" >/dev/null
done
TOKEN_A=$(q "select updated_at from public.crm_site_work_packages where id='94000000-0000-4000-8000-000000000005'")
TOKEN_B=$(q "select updated_at from public.crm_site_work_packages where id='94000000-0000-4000-8000-000000000006'")

run_publish(){
  local key="$1"
  q "begin; set local role service_role;
  select * from public.command_crm_publish_proposal_package_set_internal(
   '11111111-1111-4111-8111-111111111111','$ORG','94000000-0000-4000-8000-000000000004',
   '94000000-0000-4000-8000-000000000003','94000000-0000-4000-8000-000000000002',
   array['94000000-0000-4000-8000-000000000005'::uuid,'94000000-0000-4000-8000-000000000006'::uuid],
   array['$TOKEN_A'::timestamptz,'$TOKEN_B'::timestamptz],'$key');
  select pg_sleep(2); commit;" >/dev/null
}

set +e
run_publish r341-race-publish-a 2>"$R3_4_1_PGDATA/r341-race-a.err" & A=$!
run_publish r341-race-publish-b 2>"$R3_4_1_PGDATA/r341-race-b.err" & B=$!
sleep 0.5
OVERLAP=$(q "select count(*) from pg_stat_activity where pid<>pg_backend_pid()
  and wait_event_type='Lock' and query like '%command_crm_publish_proposal_package_set_internal%'")
[ "$OVERLAP" -ge 1 ] || { echo 'R3-4.1 concurrency sessions did not overlap on a database lock' >&2; exit 1; }
wait "$A"; SA=$?
wait "$B"; SB=$?
set -e
if ! { [ "$SA" -eq 0 ] && [ "$SB" -ne 0 ]; } && ! { [ "$SB" -eq 0 ] && [ "$SA" -ne 0 ]; }; then
  echo "R3-4.1 concurrency failed: statuses $SA/$SB" >&2; exit 1
fi
LOSER_LOG="$R3_4_1_PGDATA/r341-race-a.err"; [ "$SB" -ne 0 ] && LOSER_LOG="$R3_4_1_PGDATA/r341-race-b.err"
grep -q 'site work package changed' "$LOSER_LOG" || { echo 'R3-4.1 loser did not use 40001 stale-token path' >&2; exit 1; }
RESULT=$(q "select
 (select count(*) from public.crm_proposal_versions where proposal_id='94000000-0000-4000-8000-000000000004')||'|'||
 (select count(*) from public.crm_proposal_version_packages where proposal_version_id in
   (select id from public.crm_proposal_versions where proposal_id='94000000-0000-4000-8000-000000000004'))||'|'||
 (select count(*) from public.crm_site_work_packages where id in ('94000000-0000-4000-8000-000000000005','94000000-0000-4000-8000-000000000006') and proposal_version_id is not null)||'|'||
 (select count(*) from public.crm_proposal_version_commands where organization_id='$ORG')||'|'||
 (select count(*) from public.organization_audit_log where action='crm_proposal_versions.insert' and entity_id in
   (select id::text from public.crm_proposal_versions where proposal_id='94000000-0000-4000-8000-000000000004'))||'|'||
 (select count(*) from public.organization_event_outbox where event_type='proposal.version_prepared' and aggregate_id in
   (select id::text from public.crm_proposal_versions where proposal_id='94000000-0000-4000-8000-000000000004'))")
[ "$RESULT" = '1|2|2|1|1|1' ] || { echo "R3-4.1 concurrency state mismatch: $RESULT" >&2; exit 1; }
echo "R3_4_1_CONCURRENCY_PASS ($SA/$SB)"
