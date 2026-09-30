-- R2 SQL Editor U1 membership-RLS benchmark
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- SQL Editor variant. The psql runners remain the hosted execution path.
-- No secrets. Fixtures use .example.test addresses.
-- Identity is the recorded isolated-preview fingerprint, not a pasted ref.
-- Production project iwoaaljitifloolszxlu is named only as defense in depth.

-- Isolated-preview identity after the R2 candidate is applied.
-- Legacy non-fixture rows must still match the recorded baseline digest.
-- A pasted ref is not evidence of database identity.
do $$
declare
  profile_count bigint;
  proposal_count bigint;
  proposal_digest text;
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null then
    raise exception 'R2 fingerprint failed: candidate is not applied';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925006000'
  ) then
    raise exception 'R2 fingerprint failed: migration version is absent';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 57
     or (select count(*) from supabase_migrations.schema_migrations where version in (
       '001','002','003','004','005','006','009','010','011','012','013','014','015','016',
       '017','018','019','020','021','022','023','024','025','026','027','028','029','030',
       '031','032','033','034','035','036','037','038','039','040','041','20250901194222',
       '20260908000000','20260913000000','20260922000000','20260922010000',
       '20260924000000','20260924010000','20260924010500','20260924011000',
       '20260924012000','20260924013000','20260925000000','20260925001000'
     )) <> 52
     or (select count(*) from supabase_migrations.schema_migrations where version in (
       '20260925002000','20260925003000','20260925004000','20260925005000','20260925006000'
     )) <> 5 then
    raise exception 'R2 fingerprint failed: migration history is not the exact 52 prerequisites plus five R2 versions';
  end if;
  select count(*) into profile_count
  from public.profiles
  where id::text not like '91000000-%'
    and id::text not like '92000000-%'
    and id::text not like '93000000-%';
  select count(*) into proposal_count
  from public.proposals
  where id::text not like '91000000-%'
    and id::text not like '92000000-%'
    and id::text not like '93000000-%';
  select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    into proposal_digest
    from public.proposals
    where id::text not like '91000000-%'
      and id::text not like '92000000-%'
      and id::text not like '93000000-%';
  if profile_count <> 0 or proposal_count <> 0 then
    raise exception 'R2 fingerprint failed: legacy profile/proposal counts do not match isolated-preview baseline';
  end if;
  if proposal_digest is distinct from 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' then
    raise exception 'R2 fingerprint failed: legacy proposal-content digest does not match isolated-preview baseline';
  end if;
end $$;
-- U1 membership-RLS benchmark pack.
-- Status: PREPARED / NOT EXECUTED.
-- Isolated preview only. Entire script is one transaction that rolls back.
-- Fixture prefix 93000000 avoids the hosted matrix (9100…) and last-owner (9200…) UUIDs.
-- Invitations remain fail-closed: only signup-bootstrap owner memberships are seeded.

begin;

do $$ begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_event_outbox') is null
     or to_regclass('public.organization_memberships') is null then
    raise exception 'R2 candidate is not applied';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925006000'
  ) then
    raise exception 'R2 migration version is absent';
  end if;
end $$;

create temp table u1_baseline as
select
  (select count(*) from public.profiles) profile_count,
  (select count(*) from public.proposals) proposal_count,
  (select count(*) from public.organization_event_outbox) outbox_count,
  (select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id), ''), 'sha256'), 'hex')
     from public.proposals) proposal_digest;

insert into auth.users(id, email) values
  ('93000000-0000-4000-8000-000000000011', 'r2-u1-owner-a@example.test'),
  ('93000000-0000-4000-8000-000000000015', 'r2-u1-owner-b@example.test');

do $$
declare uid uuid;
begin
  for uid in
    select id from auth.users where email like 'r2-u1-%@example.test'
  loop
    if (select count(*) from public.organization_memberships where user_id = uid and role = 'owner') <> 1 then
      raise exception 'U1 signup bootstrap failed for %', uid;
    end if;
  end loop;
end $$;

select set_config('r2.u1.org_a', (
  select active_organization_id::text from public.profiles
  where id = '93000000-0000-4000-8000-000000000011'
), true);
select set_config('r2.u1.org_b', (
  select active_organization_id::text from public.profiles
  where id = '93000000-0000-4000-8000-000000000015'
), true);

create temp table u1_evidence (
  query_key text primary key,
  role_used text not null,
  row_count bigint,
  planning_ms numeric,
  execution_ms numeric,
  shared_hit bigint,
  shared_read bigint,
  uses_membership_index boolean,
  uses_proposals_org_index boolean,
  uses_outbox_pending_index boolean,
  seq_scan_memberships boolean,
  plan jsonb not null
);

grant select, insert on u1_evidence to authenticated, service_role;

create or replace function pg_temp.u1_walk_nodes(node jsonb)
returns setof jsonb language sql as $$
  select node
  union all
  select pg_temp.u1_walk_nodes(child)
  from jsonb_array_elements(coalesce(node->'Plans', '[]'::jsonb)) as child
$$;

grant execute on function pg_temp.u1_walk_nodes(jsonb) to authenticated, service_role;

create or replace function pg_temp.u1_capture(query_key text, role_used text, sql_text text)
returns void language plpgsql as $$
declare
  plan_json jsonb;
  root jsonb;
  nodes jsonb;
  row_count bigint;
begin
  execute sql_text into row_count;
  execute 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' || sql_text into plan_json;
  root := plan_json -> 0;
  select coalesce(jsonb_agg(n), '[]'::jsonb)
    into nodes
    from pg_temp.u1_walk_nodes(root -> 'Plan') n;
  insert into u1_evidence (
    query_key, role_used, row_count, planning_ms, execution_ms,
    shared_hit, shared_read, uses_membership_index, uses_proposals_org_index,
    uses_outbox_pending_index, seq_scan_memberships, plan
  ) values (
    query_key,
    role_used,
    row_count,
    (root ->> 'Planning Time')::numeric,
    (root ->> 'Execution Time')::numeric,
    coalesce((
      select sum(coalesce((n ->> 'Shared Hit Blocks')::bigint, 0))
      from jsonb_array_elements(nodes) n
    ), 0),
    coalesce((
      select sum(coalesce((n ->> 'Shared Read Blocks')::bigint, 0))
      from jsonb_array_elements(nodes) n
    ), 0),
    exists (
      select 1 from jsonb_array_elements(nodes) n
      where coalesce(n ->> 'Index Name', '') in (
          'organization_memberships_pkey',
          'organization_memberships_user_idx'
        )
    ),
    exists (
      select 1 from jsonb_array_elements(nodes) n
      where coalesce(n ->> 'Index Name', '') = 'proposals_organization_idx'
    ),
    exists (
      select 1 from jsonb_array_elements(nodes) n
      where coalesce(n ->> 'Index Name', '') in (
          'organization_event_outbox_delivery_order_idx',
          'organization_event_outbox_pending_idx',
          'organization_event_outbox_event_sequence_idx'
        )
    ),
    exists (
      select 1 from jsonb_array_elements(nodes) n
      where n ->> 'Relation Name' = 'organization_memberships'
        and n ->> 'Node Type' = 'Seq Scan'
    ),
    plan_json
  );
end $$;

grant execute on function pg_temp.u1_capture(text, text, text) to authenticated, service_role;

set local role service_role;

insert into public.additional_service_catalog (
  sku, label, unit_type, rate, min_qty, default_frequency,
  frequency_options, amortize_to_monthly, default_qty_source, active
) values (
  'u1-rls-benchmark-flat', 'U1 benchmark flat', 'flat', 1, 0, 'one_time',
  array['one_time']::text[], false, 'manual', true
);

insert into public.proposals (
  id, organization_id, user_id, title, client_name, client_email, contact_phone,
  service_location, facility_size, service_type, service_frequency, generated_content
)
select
  ('93000000-0000-4000-8000-000000001' || lpad(g::text, 3, '0'))::uuid,
  current_setting('r2.u1.org_a')::uuid,
  '93000000-0000-4000-8000-000000000011',
  'U1 A ' || g,
  'Synthetic U1 A',
  'client-u1-a@example.test',
  '555-0111',
  'Synthetic U1 A',
  1000,
  'residential',
  'one-time',
  'U1-CONTENT-A'
from generate_series(1, 64) as g;

insert into public.proposals (
  id, organization_id, user_id, title, client_name, client_email, contact_phone,
  service_location, facility_size, service_type, service_frequency, generated_content
)
select
  ('93000000-0000-4000-8000-000000002' || lpad(g::text, 3, '0'))::uuid,
  current_setting('r2.u1.org_b')::uuid,
  '93000000-0000-4000-8000-000000000015',
  'U1 B ' || g,
  'Synthetic U1 B',
  'client-u1-b@example.test',
  '555-0115',
  'Synthetic U1 B',
  1000,
  'residential',
  'one-time',
  'U1-CONTENT-B'
from generate_series(1, 8) as g;

insert into public.proposal_additional_services (
  proposal_id, sku, label, unit_type, rate, qty, min_qty, frequency, created_by
) values (
  '93000000-0000-4000-8000-000000001001',
  'u1-rls-benchmark-flat',
  'U1 benchmark flat',
  'flat',
  1,
  1,
  0,
  'one_time',
  '93000000-0000-4000-8000-000000000011'
);

insert into public.pdf_exports (
  proposal_id, user_id, file_size
) values (
  '93000000-0000-4000-8000-000000001001',
  '93000000-0000-4000-8000-000000000011',
  128
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '93000000-0000-4000-8000-000000000011', true);

select pg_temp.u1_capture(
  'q1_membership_lookup',
  'authenticated-owner-a',
  format(
    'select count(*) from public.organization_memberships m
     where m.organization_id = %L::uuid
       and m.user_id = auth.uid()',
    current_setting('r2.u1.org_a')
  )
);

select pg_temp.u1_capture(
  'q2_org_scoped_proposals_rls',
  'authenticated-owner-a',
  format(
    'select count(*) from public.proposals p
     where p.organization_id = %L::uuid',
    current_setting('r2.u1.org_a')
  )
);

select pg_temp.u1_capture(
  'q4_export_addon_paths_rls',
  'authenticated-owner-a',
  format(
    $q$select count(*)
       from public.proposals p
       left join public.proposal_additional_services a on a.proposal_id = p.id
       left join public.pdf_exports e on e.proposal_id = p.id
       where p.organization_id = %L::uuid$q$,
    current_setting('r2.u1.org_a')
  )
);

select pg_temp.u1_capture(
  'q4a_addon_visibility_rls',
  'authenticated-owner-a',
  $q$select count(*) from public.proposal_additional_services
     where proposal_id = '93000000-0000-4000-8000-000000001001'::uuid$q$
);

select pg_temp.u1_capture(
  'q5_pdf_export_visibility_rls',
  'authenticated-owner-a',
  $q$select count(*) from public.pdf_exports
     where proposal_id = '93000000-0000-4000-8000-000000001001'::uuid$q$
);

do $$
declare leaked bigint;
begin
  if not public.is_organization_member(current_setting('r2.u1.org_a')::uuid) then
    raise exception 'owner A membership lookup failed';
  end if;
  if public.is_organization_member(current_setting('r2.u1.org_b')::uuid) then
    raise exception 'owner A membership leaked into org B';
  end if;
  select count(*) into leaked from public.proposals
    where organization_id = current_setting('r2.u1.org_b')::uuid;
  if leaked <> 0 then
    raise exception 'owner A read % org B proposals', leaked;
  end if;
  begin
    perform 1 from public.organization_event_outbox limit 1;
    raise exception 'authenticated role read outbox';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role service_role;

select pg_temp.u1_capture(
  'q3_org_scoped_proposals_bypass',
  'service_role',
  format(
    'select count(*) from public.proposals p
     where p.organization_id = %L::uuid',
    current_setting('r2.u1.org_a')
  )
);

select pg_temp.u1_capture(
  'q6_pending_outbox_order',
  'service_role',
  $q$select count(*) from (
       select id from public.organization_event_outbox
       where delivered_at is null and available_at <= now()
       order by available_at, event_sequence
       limit 50
     ) pending$q$
);

do $$
begin
  if (select row_count from u1_evidence where query_key = 'q1_membership_lookup') <> 1 then
    raise exception 'membership lookup did not return one owner row';
  end if;
  if (select row_count from u1_evidence where query_key = 'q2_org_scoped_proposals_rls') <> 64 then
    raise exception 'owner A did not see the 64 org A proposals';
  end if;
  if (select row_count from u1_evidence where query_key = 'q3_org_scoped_proposals_bypass') <> 64 then
    raise exception 'service_role bypass count mismatch';
  end if;
  if (select row_count from u1_evidence where query_key = 'q4_export_addon_paths_rls') < 64 then
    raise exception 'export/add-on path under-counted org A rows';
  end if;
  if (select row_count from u1_evidence where query_key = 'q4a_addon_visibility_rls') <> 1 then
    raise exception 'owner A could not see the seeded add-on row';
  end if;
  if (select row_count from u1_evidence where query_key = 'q5_pdf_export_visibility_rls') <> 1 then
    raise exception 'owner A could not see the seeded PDF export row';
  end if;
  if (select row_count from u1_evidence where query_key = 'q6_pending_outbox_order') < 1 then
    raise exception 'pending outbox produced no claimable rows';
  end if;

  -- Plan choice is recorded, not failed: PostgreSQL may correctly prefer a
  -- sequential scan for these small deterministic fixtures. The benchmark must
  -- not invent a representative-volume threshold from a 72-proposal fixture.
end $$;

select
  query_key,
  role_used,
  row_count,
  planning_ms,
  execution_ms,
  shared_hit,
  shared_read,
  uses_membership_index,
  uses_proposals_org_index,
  uses_outbox_pending_index,
  seq_scan_memberships
from u1_evidence
order by query_key;

select
  'sql_editor_u1_benchmark' as evidence_key,
  q2.execution_ms as rls_execution_ms,
  q3.execution_ms as bypass_execution_ms,
  round(q2.execution_ms - q3.execution_ms, 3) as rls_overhead_ms
from u1_evidence q2
join u1_evidence q3 on q3.query_key = 'q3_org_scoped_proposals_bypass'
where q2.query_key = 'q2_org_scoped_proposals_rls';

reset role;
table u1_baseline;

rollback;

do $$ begin
  if exists (select 1 from auth.users where email like 'r2-u1-%@example.test')
     or exists (select 1 from public.proposals where id::text like '93000000-0000-4000-8000-00000000%')
     or exists (select 1 from public.additional_service_catalog where sku = 'u1-rls-benchmark-flat') then
    raise exception 'U1 rollback left synthetic residue';
  end if;
end $$;
