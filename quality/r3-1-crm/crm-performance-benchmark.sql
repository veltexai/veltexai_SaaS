-- R3-1 rollback-only membership/RLS and CRM query benchmark.
-- Run only against the disposable service-catalog harness after migrations and fixtures.
\set ON_ERROR_STOP on
begin;

select active_organization_id as benchmark_org
from public.profiles where id='11111111-1111-4111-8111-111111111111' \gset

select id as benchmark_pipeline from public.crm_pipelines
where organization_id=:'benchmark_org'::uuid and segment='commercial' and is_default \gset
select id as benchmark_stage from public.crm_pipeline_stages
where organization_id=:'benchmark_org'::uuid and pipeline_id=:'benchmark_pipeline'::uuid
  and category='new' and not hidden order by position,id limit 1 \gset

insert into public.crm_customers(id,organization_id,name,customer_type,created_by,updated_by)
select ('94000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid, :'benchmark_org',
  'Benchmark customer '||g, 'commercial', '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
from generate_series(1,500) g;

insert into public.crm_properties(id,organization_id,customer_id,name,timezone,created_by,updated_by)
select ('95000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid, :'benchmark_org',
  ('94000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,
  'Benchmark property '||g, 'America/Los_Angeles',
  '11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'
from generate_series(1,500) g;

insert into public.crm_leads(id,organization_id,idempotency_key,source,status,contact_name,email,phone,created_by,updated_by)
select gen_random_uuid(), :'benchmark_org', 'benchmark-lead-'||g, 'manual', 'new', 'Benchmark lead '||g,
  'lead-'||g||'@example.test', '+1206555'||lpad(g::text,4,'0'),
  '11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'
from generate_series(1,2000) g;

insert into public.crm_opportunities(
  id,organization_id,pipeline_id,stage_id,customer_id,property_id,idempotency_key,name,
  owner_user_id,estimator_user_id,segment,source,created_by,updated_by)
select gen_random_uuid(), :'benchmark_org', :'benchmark_pipeline', :'benchmark_stage',
  ('94000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,
  ('95000000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,
  'benchmark-opportunity-'||g, 'Benchmark opportunity '||g,
  '11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',
  'commercial','manual','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'
from generate_series(1,500) g;

insert into public.crm_tasks(
  id,organization_id,opportunity_id,idempotency_key,title,status,due_at,timezone,assignee_user_id,
  created_by,updated_by)
select gen_random_uuid(), o.organization_id, o.id, 'benchmark-task-'||row_number() over(order by o.id),
  'Benchmark follow-up', 'open',
  now()+(row_number() over(order by o.id)||' minutes')::interval, 'America/Los_Angeles',
  o.estimator_user_id,o.created_by,o.updated_by
from public.crm_opportunities o where o.organization_id=:'benchmark_org';

insert into public.crm_walkthroughs(
  id,organization_id,opportunity_id,property_id,estimator_user_id,idempotency_key,timezone,
  window_start,window_end,status,created_by,updated_by)
select gen_random_uuid(),o.organization_id,o.id,o.property_id,o.estimator_user_id,
  'benchmark-walkthrough-'||row_number() over(order by o.id),'America/Los_Angeles',
  now()+(row_number() over(order by o.id)||' hours')::interval,
  now()+(row_number() over(order by o.id)||' hours')::interval+interval '30 minutes',
  'scheduled',o.created_by,o.updated_by
from public.crm_opportunities o where o.organization_id=:'benchmark_org' limit 250;

analyze public.organization_memberships;
analyze public.crm_leads;
analyze public.crm_opportunities;
analyze public.crm_opportunity_stage_history;
analyze public.crm_tasks;
analyze public.crm_walkthroughs;
analyze public.crm_lead_commands;

create temp table crm_benchmark_evidence(
  query_key text primary key,
  execution_ms numeric not null,
  shared_hit bigint not null,
  shared_read bigint not null,
  membership_index boolean not null,
  expected_index boolean not null,
  plan jsonb not null
);
grant select,insert on crm_benchmark_evidence to authenticated;

create or replace function pg_temp.crm_plan_nodes(node jsonb)
returns setof jsonb language sql as $$
  select node union all
  select pg_temp.crm_plan_nodes(child)
  from jsonb_array_elements(coalesce(node->'Plans','[]'::jsonb)) child
$$;

create or replace function pg_temp.capture_crm_plan(query_key text, sql_text text, expected_indexes text[])
returns void language plpgsql as $$
declare raw jsonb; root jsonb; nodes jsonb;
begin
  execute 'explain (analyze,buffers,format json) '||sql_text into raw;
  root:=raw->0;
  select coalesce(jsonb_agg(n),'[]'::jsonb) into nodes from pg_temp.crm_plan_nodes(root->'Plan') n;
  insert into crm_benchmark_evidence values(
    query_key,(root->>'Execution Time')::numeric,
    coalesce((select sum(coalesce((n->>'Shared Hit Blocks')::bigint,0)) from jsonb_array_elements(nodes)n),0),
    coalesce((select sum(coalesce((n->>'Shared Read Blocks')::bigint,0)) from jsonb_array_elements(nodes)n),0),
    exists(select 1 from jsonb_array_elements(nodes)n where n->>'Index Name' in
      ('organization_memberships_pkey','organization_memberships_user_idx')),
    exists(select 1 from jsonb_array_elements(nodes)n where n->>'Index Name'=any(expected_indexes)),raw);
end $$;
grant execute on function pg_temp.crm_plan_nodes(jsonb) to authenticated;
grant execute on function pg_temp.capture_crm_plan(text,text,text[]) to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select pg_temp.capture_crm_plan('board_rpc',format(
  'select public.read_crm_pipeline_board(%L::uuid)', :'benchmark_org'),
  array['crm_opportunities_org_stage_idx','crm_opportunities_org_assignment_idx']);
select pg_temp.capture_crm_plan('board_assignment_rls',format(
  $$select count(*) from public.crm_opportunities where organization_id=%L::uuid
    and (owner_user_id=auth.uid() or estimator_user_id=auth.uid())$$, :'benchmark_org'),
  array['crm_opportunities_org_assignment_idx','crm_opportunities_org_stage_idx']);
select pg_temp.capture_crm_plan('membership_lookup',format(
  $$select count(*) from public.organization_memberships where organization_id=%L::uuid and user_id=auth.uid()$$,
  :'benchmark_org'),array['organization_memberships_pkey','organization_memberships_user_idx']);
select pg_temp.capture_crm_plan('duplicate_email',format(
  $$select * from public.find_crm_duplicate_candidates(%L::uuid,'lead-1500@example.test',null)$$,
  :'benchmark_org'),array['crm_leads_org_email_idx','crm_contacts_org_email_idx']);
select pg_temp.capture_crm_plan('stage_history',format(
  $$select h.* from public.crm_opportunity_stage_history h join public.crm_opportunities o on o.id=h.opportunity_id
    where h.organization_id=%L::uuid order by h.occurred_at desc limit 100$$, :'benchmark_org'),
  array['crm_stage_history_opportunity_idx','crm_opportunities_org_stage_idx']);
select pg_temp.capture_crm_plan('open_tasks',format(
  $$select * from public.crm_tasks where organization_id=%L::uuid and status='open' order by due_at limit 100$$,
  :'benchmark_org'),array['crm_tasks_org_followup_idx']);
select pg_temp.capture_crm_plan('walkthrough_overlap',format(
  $$select count(*) from public.crm_walkthroughs where organization_id=%L::uuid
    and estimator_user_id='11111111-1111-4111-8111-111111111111'::uuid and status in ('scheduled','rescheduled')
    and window_start<now()+interval '2 hours' and window_end>now()+interval '1 hour'$$, :'benchmark_org'),
  array['crm_walkthroughs_estimator_window_idx']);
reset role;
select pg_temp.capture_crm_plan('receipt_lookup',format(
  $$select * from public.crm_lead_commands where organization_id=%L::uuid and command_key='benchmark-command'$$,
  :'benchmark_org'),array['crm_lead_commands_organization_id_command_key_key']);

do $$ begin
  if exists(select 1 from crm_benchmark_evidence where execution_ms>250) then
    raise exception 'CRM benchmark exceeded the local 250 ms diagnostic ceiling';
  end if;
end $$;

select query_key,execution_ms,shared_hit,shared_read,membership_index,expected_index
from crm_benchmark_evidence order by query_key;
rollback;
