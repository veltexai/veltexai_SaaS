-- CI-grade assertions derived from the round-3 ad-hoc checks (sql/20_extra_checks_as_run.sql).
-- Synthetic fixtures only (sql/10_fixtures.sql). Every block raises on failure; run with
--   psql -v ON_ERROR_STOP=1 -f sql/30_assertions.sql
-- Every data-changing block is rolled back. Expected current state: after the two
-- catalog migrations (with R3-1/R3-2 fixed). Section H documents known pre-existing
-- definer exposure (R3-3) and is expected to FAIL until that is remediated; run it
-- separately with -v check_definers=1 once remediation lands.
\set ON_ERROR_STOP 1
\if :{?check_definers}
\else
\set check_definers 0
\endif

-- Fixture ids
\set owner '11111111-1111-4111-8111-111111111111'
\set other '22222222-2222-4222-8222-222222222222'
\set proposal '33333333-3333-4333-8333-333333333333'
\set token 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
\set legacy_token 'track_1790000000000_abc123xyz'

select set_config('h.owner', :'owner', false), set_config('h.other', :'other', false),
       set_config('h.proposal', :'proposal', false), set_config('h.token', :'token', false),
       set_config('h.legacy', :'legacy_token', false);

-- A. Schema/policy inventory
do $$ begin
  if exists (select 1 from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls))
    then raise exception 'A1 client role bypasses RLS'; end if;
  if (select count(*) from pg_policy where polname='catalog_owner_guard' and not polpermissive
      and polrelid in ('public.proposals'::regclass,'public.proposal_tracking'::regclass,'public.proposal_views'::regclass)) <> 3
    then raise exception 'A2 restrictive owner guard missing'; end if;
  if exists (select 1 from pg_policy where polrelid='public.proposal_tracking'::regclass and polname='Allow anonymous tracking updates')
    then raise exception 'A3 legacy PUBLIC USING(true) tracking policy still present'; end if;
  if exists (select 1 from pg_policy where polrelid='public.proposal_views'::regclass and polname='Allow anonymous proposal view tracking')
    then raise exception 'A4 anonymous view-insert policy still present'; end if;
  if has_table_privilege('anon','public.proposals','select') or has_table_privilege('anon','public.proposal_tracking','update')
     or has_table_privilege('anon','public.proposal_views','insert')
    then raise exception 'A5 anon retains raw table privilege'; end if;
  if exists (select 1 from information_schema.column_privileges where grantee in ('anon','PUBLIC')
             and table_schema='public' and table_name in ('proposals','proposal_tracking','proposal_views'))
    then raise exception 'A6 anon/PUBLIC retains a column privilege'; end if;
  if not exists (select 1 from public.service_catalog_versions where version='2026-09-22.1')
     or not exists (select 1 from public.service_catalog_versions where version='2026-09-22.2')
    then raise exception 'A7 catalog registry incomplete'; end if;
  if has_table_privilege('anon','public.system_settings','select')
     or has_table_privilege('authenticated','public.system_settings','select')
    then raise exception 'A8 client role can read system settings'; end if;
  if exists (select 1 from pg_policy where polrelid='public.system_settings'::regclass
             and pg_get_expr(polqual,polrelid) in ('true','(true)'))
    then raise exception 'A9 broad system settings read policy remains'; end if;
end $$;

-- B. Anonymous role: raw access denied
begin; set local role anon;
do $$ begin
  begin perform 1 from public.proposals; raise exception 'B1 anon selected proposals'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.proposal_tracking; raise exception 'B2 anon selected tracking'; exception when insufficient_privilege then null; end;
  begin update public.proposal_tracking set track_opens=false; raise exception 'B3 anon updated tracking'; exception when insufficient_privilege then null; end;
  begin insert into public.proposal_views(proposal_id,tracking_token) values (current_setting('h.proposal')::uuid,'b4'); raise exception 'B4 anon inserted view'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.proposal_views; raise exception 'B5 anon selected views'; exception when insufficient_privilege then null; end;
end $$;
rollback;

-- C. Token RPC: resolution and full-payload leak scan
begin; set local role anon;
do $$ declare j jsonb; begin
  if public.read_tracked_proposal('short') is not null then raise exception 'C1 short token resolved'; end if;
  if public.read_tracked_proposal('unknown-synthetic-token-000000') is not null then raise exception 'C2 unknown token resolved'; end if;
  if public.read_tracked_proposal(current_setting('h.legacy')) is null then raise exception 'C3 legacy track_ token did not resolve'; end if;
  j := public.read_tracked_proposal(current_setting('h.token'));
  if j is null then raise exception 'C4 valid token did not resolve'; end if;
  if (j->'proposal') ?| array['service_specific_data','client_email','user_id','contact_phone'] then raise exception 'C5 private key present'; end if;
  -- Sentinels planted by fixtures: access code, burdened wage, client email, cost snapshot keys.
  if j::text ~ '4821|Lockbox|31\.25|pat@example\.test|"cost"|estimateSnapshot|catalogJob|assumptions'
    then raise exception 'C6 sentinel leaked in RPC payload: %', j::text; end if;
end $$;
rollback;

-- D. Second authenticated user: no cross-owner reach
begin; set local role authenticated; select set_config('request.jwt.claim.sub', current_setting('h.other'), true);
do $$ declare n int; begin
  if exists (select 1 from public.proposals where id=current_setting('h.proposal')::uuid) then raise exception 'D1 cross-owner proposal read'; end if;
  if exists (select 1 from public.proposal_tracking where proposal_id=current_setting('h.proposal')::uuid) then raise exception 'D2 cross-owner tracking read'; end if;
  update public.proposal_tracking set track_opens=false; get diagnostics n=row_count;
  if n<>0 then raise exception 'D3 cross-owner tracking update (legacy USING(true) path) changed % rows', n; end if;
  update public.proposals set title='X' where id=current_setting('h.proposal')::uuid; get diagnostics n=row_count;
  if n<>0 then raise exception 'D4 cross-owner proposal update'; end if;
  delete from public.proposals where id=current_setting('h.proposal')::uuid; get diagnostics n=row_count;
  if n<>0 then raise exception 'D5 cross-owner proposal delete'; end if;
  begin
    insert into public.proposal_tracking(proposal_id,tracking_id,delivery_method,recipient_email,subject,message)
      values (current_setting('h.proposal')::uuid,'dddddddd-dddd-4ddd-8ddd-dddddddddddd','online','x@example.test','s','m');
    raise exception 'D6 cross-owner tracking insert allowed';
  exception when insufficient_privilege then null; end;
  begin insert into public.proposal_views(proposal_id,tracking_token) values (current_setting('h.proposal')::uuid,'d7'); raise exception 'D7 authenticated inserted view';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

-- E. Owner: positive paths and version guard
begin; set local role authenticated; select set_config('request.jwt.claim.sub', current_setting('h.owner'), true);
do $$ declare n int; begin
  update public.proposals set status='sent' where id=current_setting('h.proposal')::uuid; get diagnostics n=row_count;
  if n<>1 then raise exception 'E1 owner status update failed'; end if;
  if not exists (select 1 from public.proposal_tracking where proposal_id=current_setting('h.proposal')::uuid) then raise exception 'E2 owner cannot read own tracking'; end if;
  begin
    update public.proposals set service_specific_data=jsonb_set(service_specific_data,'{catalogJob,catalogVersion}','"2026-09-22.1"') where id=current_setting('h.proposal')::uuid;
    raise exception 'E3 catalog version change allowed';
  exception when raise_exception then
    if sqlerrm not like '%Catalog version changes require a new proposal%' then raise; end if;
  end;
end $$;
rollback;

-- F. Counters, history, caps, disabled tracking (sequential; see concurrency.sh for parallel)
begin;
do $$ declare pv int; tv int; vr int; begin
  select view_count into pv from public.proposals where id=current_setting('h.proposal')::uuid;
  select view_count into tv from public.proposal_tracking where tracking_id=current_setting('h.token');
  select count(*) into vr from public.proposal_views where proposal_id=current_setting('h.proposal')::uuid;
  perform set_config('h.pv', coalesce(pv,0)::text, true); perform set_config('h.tv', coalesce(tv,0)::text, true); perform set_config('h.vr', vr::text, true);
end $$;
set local role anon;
do $$ begin
  if public.record_tracked_view('unknown-synthetic-token-000000') then raise exception 'F1 unknown token counted'; end if;
  if not public.record_tracked_view(current_setting('h.token')) then raise exception 'F2 view not recorded'; end if;
  if not public.record_tracked_view(current_setting('h.token')) then raise exception 'F3 view not recorded'; end if;
  perform public.record_tracking_metric(current_setting('h.token'),'time',86400);
  perform public.record_tracking_metric(current_setting('h.token'),'time',86400);
  if public.record_tracking_metric(current_setting('h.token'),'bogus',1) then raise exception 'F4 invalid metric accepted'; end if;
  if public.record_tracked_download('unknown-synthetic-token-000000') then raise exception 'F4a unknown token downloaded'; end if;
  if public.record_tracking_click('unknown-synthetic-token-000000','button','Download','download') then raise exception 'F4b unknown token clicked'; end if;
  if public.tracked_proposal_has_paid_access('unknown-synthetic-token-000000') then raise exception 'F4c unknown token has paid access'; end if;
end $$;
reset role;
do $$ begin
  if (select view_count from public.proposals where id=current_setting('h.proposal')::uuid) <> current_setting('h.pv')::int+2 then raise exception 'F5 proposal counter not exactly +2'; end if;
  if (select view_count from public.proposal_tracking where tracking_id=current_setting('h.token')) <> current_setting('h.tv')::int+2 then raise exception 'F6 tracking counter not exactly +2'; end if;
  if (select count(*) from public.proposal_views where proposal_id=current_setting('h.proposal')::uuid) <> current_setting('h.vr')::int+2 then raise exception 'F7 history rows not exactly +2'; end if;
  if (select time_spent_seconds from public.proposal_tracking where tracking_id=current_setting('h.token')) > 86400 then raise exception 'F8 time cap exceeded'; end if;
end $$;
update public.proposal_tracking set track_opens=false where tracking_id=current_setting('h.token');
set local role anon;
do $$ begin
  if public.record_tracked_view(current_setting('h.token')) or public.record_tracking_metric(current_setting('h.token'),'time',10)
    then raise exception 'F9 disabled tracking still recorded'; end if;
end $$;
rollback;

-- G. Funnel constraint: new unknown event names rejected
begin;
do $$ begin
  begin insert into public.marketing_funnel_events(event_id,event_name) values ('g1-synthetic','not_a_real_event'); raise exception 'G1 unknown event accepted';
  exception when check_violation then null; end;
  insert into public.marketing_funnel_events(event_id,event_name) values ('g2-synthetic','catalog_previewed');
end $$;
rollback;

-- Round-4 additions: statistics obey caller RLS; service_role positive paths.
begin; set local role anon;
do $$ begin
 begin perform * from public.get_proposal_tracking_stats(current_setting('h.proposal')::uuid);
   raise exception 'G3 anonymous statistics access'; exception when insufficient_privilege then null; end;
end $$;
rollback;
begin; set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('h.other'), true);
do $$ begin
 if (select total_views from public.get_proposal_tracking_stats(current_setting('h.proposal')::uuid)) <> 0 then raise exception 'G4 cross-owner statistics leak'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('h.owner'), true);
do $$ declare stats record; begin
 perform public.record_tracked_view(current_setting('h.token'));
 select * into stats from public.get_proposal_tracking_stats(current_setting('h.proposal')::uuid);
 if stats.total_views<1 then raise exception 'G5 owner cannot see history'; end if;
 if stats.unique_viewers is not null or stats.average_duration is not null then raise exception 'G6 identity-free metrics must be unavailable'; end if;
end $$;
rollback;
begin; set local role service_role;
do $$ begin
 if not exists (select 1 from public.proposals where id=current_setting('h.proposal')::uuid) then raise exception 'G7 service role cannot read fixture'; end if;
 if not exists (select 1 from public.proposal_tracking where proposal_id=current_setting('h.proposal')::uuid) then raise exception 'G8 service role cannot read tracking'; end if;
 perform * from public.get_proposal_tracking_stats(current_setting('h.proposal')::uuid);
end $$;
rollback;

-- H. R3-3: SECURITY DEFINER functions executable by client roles must be an explicit allowlist.
\if :check_definers
do $$ declare bad text; begin
  select string_agg(p.oid::regprocedure::text, ', ' order by 1) into bad
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
    and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))
    and p.oid::regprocedure::text not in ('read_tracked_proposal(text)',
      'record_tracked_view(text)','record_tracking_metric(text,text,integer)',
      -- Token-bound public delivery functions resolve an unguessable token,
      -- reject short/unknown tokens and never accept a caller-supplied row id.
      'record_tracked_download(text)','record_tracking_click(text,text,text,text)',
      'tracked_proposal_has_paid_access(text)',
      -- These wrappers call r0_assert_self_or_service before reaching the
      -- ungranted legacy implementations.
      'get_user_current_usage(uuid)','can_user_create_proposal(uuid)',
      'get_user_usage_info(uuid)','increment_user_usage(uuid)',
      'can_user_access_template(uuid,uuid)','user_has_active_access(uuid)',
      'get_user_accessible_templates(uuid)','is_admin()'
    );
  if bad is not null then raise exception 'H1 client-executable definer functions not on allowlist: %', bad; end if;
end $$;
begin; set local role anon;
do $$ begin
  begin perform public.increment_user_usage(current_setting('h.owner')::uuid); raise exception 'H2 anon can increment another user''s usage';
  exception when insufficient_privilege then null; end;
  begin perform * from public.get_proposal_tracking_stats(current_setting('h.proposal')::uuid); raise exception 'H3 anon can read cross-owner tracking stats';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
begin; set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('h.other'), true);
do $$ begin
  begin perform public.get_user_current_usage(current_setting('h.owner')::uuid);
    raise exception 'H4 authenticated caller read another user usage';
  exception when insufficient_privilege then null; end;
  begin perform public.increment_user_usage(current_setting('h.owner')::uuid);
    raise exception 'H5 authenticated caller incremented another user usage';
  exception when insufficient_privilege then null; end;
  perform public.get_user_current_usage(current_setting('h.other')::uuid);
end $$;
rollback;
begin; set local role service_role;
do $$ begin
  perform public.get_user_current_usage(current_setting('h.owner')::uuid);
end $$;
rollback;
begin; set local role authenticated;
select set_config('request.jwt.claim.role','service_role',true);
select set_config('request.jwt.claim.sub', current_setting('h.other'), true);
do $$ begin
  begin perform public.get_user_current_usage(current_setting('h.owner')::uuid);
    raise exception 'H6 forged service-role claim bypassed actual session role';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
\endif

select 'ALL ASSERTIONS PASSED' as result;
