#!/usr/bin/env bash
# Two different estimate commands race on one package token. Exactly one may
# commit; the other must observe the changed token and abort with 40001.
set -euo pipefail
source "$(cd "$(dirname "$0")/../service-catalog-round4/db-harness" && pwd)/guard_local.sh"
DB="${DB:-veltex_harness}"
q(){ psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }
ORG=$(q "select active_organization_id from public.profiles where id='11111111-1111-4111-8111-111111111111'")
q "begin;
alter table public.organization_memberships disable trigger guard_organization_membership_changes;
insert into public.crm_customers(id,organization_id,customer_type,name,created_by)
values('74000000-0000-4000-8000-000000000001','$ORG','household','Concurrency customer','11111111-1111-4111-8111-111111111111');
insert into public.crm_properties(id,organization_id,customer_id,name,created_by)
values('74000000-0000-4000-8000-000000000002','$ORG','74000000-0000-4000-8000-000000000001','Concurrency property','11111111-1111-4111-8111-111111111111');
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,idempotency_key,name,owner_user_id,segment,source,created_by)
select '74000000-0000-4000-8000-000000000003','$ORG','74000000-0000-4000-8000-000000000001',p.id,s.id,
 '74000000-0000-4000-8000-000000000002','estimate-concurrency-opportunity','Concurrency opportunity',
 '11111111-1111-4111-8111-111111111111','residential','manual','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s on s.organization_id=p.organization_id and s.pipeline_id=p.id
where p.organization_id='$ORG' and p.template_key='residential_turnover_v1' and s.category='new' order by s.position limit 1;
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,idempotency_key,created_by)
values('74000000-0000-4000-8000-000000000004','$ORG','74000000-0000-4000-8000-000000000003',
 '74000000-0000-4000-8000-000000000002','estimate-concurrency-package','11111111-1111-4111-8111-111111111111');
alter table public.organization_memberships enable trigger guard_organization_membership_changes;
commit;"
TOKEN=$(q "select updated_at from public.crm_site_work_packages where id='74000000-0000-4000-8000-000000000004'")
INPUT='{"catalogVersion":"2026-09-22.2","jobType":"recurring_standard","frequency":"weekly"}'
OUTPUT='{"version":"2026-09-22.2","unit":"per_visit","low":{"suggestedPrice":100},"base":{"suggestedPrice":125},"high":{"suggestedPrice":150}}'
run_command(){
  local key="$1" scenario="$2" amount="$3"
  q "set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
  select * from public.command_crm_estimate_run('$ORG','74000000-0000-4000-8000-000000000003',
   '74000000-0000-4000-8000-000000000004','74000000-0000-4000-8000-000000000002','$key',
   'service_catalog','2026-09-22.2','${INPUT}'::jsonb,'${OUTPUT}'::jsonb,'$scenario',$amount,'USD','per_visit','$TOKEN');" >/dev/null
}
set +e
run_command estimate-race-low low 10000 & A=$!
run_command estimate-race-high high 15000 & B=$!
wait "$A"; SA=$?; wait "$B"; SB=$?
set -e
if ! { [ "$SA" -eq 0 ] && [ "$SB" -ne 0 ]; } && ! { [ "$SB" -eq 0 ] && [ "$SA" -ne 0 ]; }; then
  echo "R3-3 concurrency failed: statuses $SA/$SB" >&2; exit 1
fi
RESULT=$(q "select count(*)||'|'||count(distinct id)||'|'||(select count(*) from public.crm_site_work_packages
  where id='74000000-0000-4000-8000-000000000004' and status='estimated' and estimate_run_id is not null)
  from public.crm_estimate_runs where opportunity_id='74000000-0000-4000-8000-000000000003'")
[ "$RESULT" = '1|1|1' ] || { echo "R3-3 concurrency state mismatch: $RESULT" >&2; exit 1; }
echo "R3_3_CONCURRENCY_PASS ($SA/$SB)"
