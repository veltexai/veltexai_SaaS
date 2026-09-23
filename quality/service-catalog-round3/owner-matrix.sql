-- Disposable LOCAL clone only; run with psql -v ON_ERROR_STOP=1 and synthetic
-- owner_id, other_id, proposal_id, tracking_token supplied as psql variables.
-- Requires a synthetic proposal owned by owner_id and a matching enabled token.
-- Rolls back every change. This is a test plan until its execution log exists.
begin;
select set_config('catalog.test.owner', :'owner_id', true),
       set_config('catalog.test.other', :'other_id', true),
       set_config('catalog.test.proposal', :'proposal_id', true),
       set_config('catalog.test.token', :'tracking_token', true);
do $$ begin
 if current_setting('catalog.test.owner')=current_setting('catalog.test.other') then raise exception 'Need two different users'; end if;
 if not exists (select 1 from public.proposals where id=current_setting('catalog.test.proposal')::uuid and user_id=current_setting('catalog.test.owner')::uuid) then raise exception 'Missing owner fixture'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('catalog.test.owner'), true);
do $$ begin
 if not exists (select 1 from public.proposals where id=current_setting('catalog.test.proposal')::uuid) then raise exception 'Owner cannot read fixture'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('catalog.test.other'), true);
do $$ declare changed integer; begin
 if exists (select service_specific_data from public.proposals where id=current_setting('catalog.test.proposal')::uuid) then raise exception 'Cross-owner proposal leak'; end if;
 if exists (select 1 from public.proposal_tracking where proposal_id=current_setting('catalog.test.proposal')::uuid) then raise exception 'Cross-owner tracking leak'; end if;
 if exists (select 1 from public.proposal_views where proposal_id=current_setting('catalog.test.proposal')::uuid) then raise exception 'Cross-owner history leak'; end if;
 update public.proposals set title='UNAUTHORIZED' where id=current_setting('catalog.test.proposal')::uuid;
 get diagnostics changed = row_count;
 if changed <> 0 then raise exception 'Cross-owner update allowed'; end if;
end $$;
set local role anon;
do $$ declare projection jsonb; begin
 begin
   perform service_specific_data from public.proposals where id=current_setting('catalog.test.proposal')::uuid;
   raise exception 'Anonymous raw select was granted';
 exception when insufficient_privilege then null; end;
 projection := public.read_tracked_proposal(current_setting('catalog.test.token'));
 if projection is null then raise exception 'Valid token did not resolve'; end if;
 if (projection->'proposal') ?| array['service_specific_data','client_email','user_id'] then raise exception 'Private keys leaked'; end if;
 if public.record_tracked_view('unknown-synthetic-token') then raise exception 'Unknown token updated'; end if;
 if not public.record_tracked_view(current_setting('catalog.test.token')) then raise exception 'Enabled view failed'; end if;
 perform public.record_tracking_metric(current_setting('catalog.test.token'),'time',86400);
 perform public.record_tracking_metric(current_setting('catalog.test.token'),'time',86400);
end $$;
reset role;
do $$ begin
 if not exists (select 1 from public.proposal_views where proposal_id=current_setting('catalog.test.proposal')::uuid) then raise exception 'No owner view history'; end if;
 if exists (select 1 from public.proposal_tracking where tracking_id=current_setting('catalog.test.token') and time_spent_seconds>86400) then raise exception 'Repeated metric inflated beyond cap'; end if;
end $$;
update public.proposal_tracking set track_opens=false where tracking_id=current_setting('catalog.test.token');
set local role anon;
do $$ begin
 if public.record_tracked_view(current_setting('catalog.test.token')) or public.record_tracking_metric(current_setting('catalog.test.token'),'time',10) then raise exception 'Disabled tracking updated'; end if;
end $$;
rollback;
