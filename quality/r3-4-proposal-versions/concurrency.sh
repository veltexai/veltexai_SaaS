#!/usr/bin/env bash
# Two independent publishers race on one proposal/package token. Exactly one
# commit is allowed; the loser must see the changed optimistic token (40001).
set -euo pipefail
source "$(cd "$(dirname "$0")/../service-catalog-round4/db-harness" && pwd)/guard_local.sh"
DB="${DB:-veltex_harness}"
q(){ psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }
ORG=$(q "select active_organization_id from public.profiles where id='11111111-1111-4111-8111-111111111111'")

q "begin;
insert into public.crm_customers(id,organization_id,customer_type,name,created_by)
values('84000000-0000-4000-8000-000000000001','$ORG','household','Version race customer','11111111-1111-4111-8111-111111111111');
insert into public.crm_properties(id,organization_id,customer_id,name,created_by)
values('84000000-0000-4000-8000-000000000002','$ORG','84000000-0000-4000-8000-000000000001','Version race property','11111111-1111-4111-8111-111111111111');
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,idempotency_key,name,owner_user_id,segment,source,created_by)
select '84000000-0000-4000-8000-000000000003','$ORG','84000000-0000-4000-8000-000000000001',p.id,s.id,
 '84000000-0000-4000-8000-000000000002','version-race-opportunity','Version race opportunity',
 '11111111-1111-4111-8111-111111111111','residential','manual','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s on s.organization_id=p.organization_id and s.pipeline_id=p.id
where p.organization_id='$ORG' and p.template_key='residential_turnover_v1' and s.category='new' order by s.position limit 1;
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,contact_phone,service_location,
 facility_size,service_type,service_frequency,generated_content,crm_opportunity_id,crm_customer_id,crm_property_id)
values('84000000-0000-4000-8000-000000000004','$ORG','11111111-1111-4111-8111-111111111111',
 'Version race proposal','Race Customer','race@example.test','555-0140','1 Race Way',1000,'residential','weekly',
 'Race working copy','84000000-0000-4000-8000-000000000003','84000000-0000-4000-8000-000000000001',
 '84000000-0000-4000-8000-000000000002');
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,proposal_id,idempotency_key,created_by)
values('84000000-0000-4000-8000-000000000005','$ORG','84000000-0000-4000-8000-000000000003',
 '84000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000004','version-race-package',
 '11111111-1111-4111-8111-111111111111');
commit;"

PACKAGE_TOKEN=$(q "select updated_at from public.crm_site_work_packages where id='84000000-0000-4000-8000-000000000005'")
INPUT='{"catalogVersion":"2026-09-22.2","segment":"residential","jobType":"recurring_standard","frequency":"weekly"}'
OUTPUT='{"version":"2026-09-22.2","unit":"per_visit","low":{"suggestedPrice":100},"base":{"suggestedPrice":125},"high":{"suggestedPrice":150}}'
q "set role service_role;
select * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111','$ORG',
 '84000000-0000-4000-8000-000000000003','84000000-0000-4000-8000-000000000005',
 '84000000-0000-4000-8000-000000000002','version-race-estimate','service_catalog','2026-09-22.2',
 '${INPUT}'::jsonb,'${OUTPUT}'::jsonb,'base',12500,'USD','per_visit','$PACKAGE_TOKEN');" >/dev/null
ESTIMATE=$(q "select id from public.crm_estimate_runs where request_key='version-race-estimate'")
VERSION_TOKEN=$(q "select updated_at from public.crm_site_work_packages where id='84000000-0000-4000-8000-000000000005'")
SNAPSHOT=$(q "select jsonb_build_object(
 'schemaVersion','crm_proposal_version.v1','title','Version race proposal',
 'organization',jsonb_build_object('displayName','Race Cleaning'),
 'customer',jsonb_build_object('name','Race Customer'),
 'serviceLocation',jsonb_build_object('address','1 Race Way'),
 'service',jsonb_build_object('type','residential','frequency','weekly'),
 'scopeLines',jsonb_build_array('Clean agreed areas'),
 'pricing',jsonb_build_object('amountMinor',12500,'currency','USD','basis','per_visit'),
 'template',jsonb_build_object('id','classic','rendererVersion','v1'),
 'provenance',jsonb_build_object('proposalId','84000000-0000-4000-8000-000000000004',
  'opportunityId','84000000-0000-4000-8000-000000000003',
  'propertyId','84000000-0000-4000-8000-000000000002',
  'workPackageId','84000000-0000-4000-8000-000000000005','estimateRunId','$ESTIMATE'))::text")

run_publish(){
  local key="$1" rendered="$2"
  q "set role service_role;
  select * from public.command_crm_publish_proposal_version_internal(
   '11111111-1111-4111-8111-111111111111','$ORG','84000000-0000-4000-8000-000000000004',
   '84000000-0000-4000-8000-000000000003','84000000-0000-4000-8000-000000000005',
   '84000000-0000-4000-8000-000000000002','$ESTIMATE','$key','crm_proposal_version.v1',
   '${SNAPSHOT}'::jsonb,'$rendered','$VERSION_TOKEN');" >/dev/null
}

set +e
run_publish version-race-a 'Race rendered A' & A=$!
run_publish version-race-b 'Race rendered B' & B=$!
wait "$A"; SA=$?
wait "$B"; SB=$?
set -e
if ! { [ "$SA" -eq 0 ] && [ "$SB" -ne 0 ]; } && ! { [ "$SB" -eq 0 ] && [ "$SA" -ne 0 ]; }; then
  echo "R3-4 concurrency failed: statuses $SA/$SB" >&2
  exit 1
fi

RESULT=$(q "select
 (select count(*) from public.crm_proposal_versions where proposal_id='84000000-0000-4000-8000-000000000004')||'|'||
 (select count(distinct version_number) from public.crm_proposal_versions where proposal_id='84000000-0000-4000-8000-000000000004')||'|'||
 (select coalesce(max(version_number),0) from public.crm_proposal_versions where proposal_id='84000000-0000-4000-8000-000000000004')||'|'||
 (select count(*) from public.crm_proposal_version_commands where organization_id='$ORG')||'|'||
 (select count(*) from public.crm_site_work_packages p join public.crm_proposal_versions v
   on v.organization_id=p.organization_id and v.work_package_id=p.id and v.id=p.proposal_version_id
   where p.id='84000000-0000-4000-8000-000000000005' and p.status='estimated')||'|'||
 (select count(*) from public.organization_event_outbox where event_type='proposal.version_prepared'
   and aggregate_id in (select id::text from public.crm_proposal_versions where proposal_id='84000000-0000-4000-8000-000000000004'))")
[ "$RESULT" = '1|1|1|1|1|1' ] || { echo "R3-4 concurrency state mismatch: $RESULT" >&2; exit 1; }
echo "R3_4_CONCURRENCY_PASS ($SA/$SB)"
