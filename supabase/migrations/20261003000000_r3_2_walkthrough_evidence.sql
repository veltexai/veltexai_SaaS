begin;

alter table public.crm_walkthroughs
  add column if not exists evidence_notes text,
  add column if not exists evidence_completed_at timestamptz,
  add column if not exists evidence_recorded_by uuid references public.profiles(id) on delete set null;

alter table public.crm_walkthroughs
  drop constraint if exists crm_walkthroughs_status_check,
  add constraint crm_walkthroughs_status_check
    check (status in ('scheduled','rescheduled','cancelled','no_show','completed')),
  add constraint crm_walkthroughs_evidence_notes_check
    check (evidence_notes is null or length(evidence_notes) between 1 and 5000),
  add constraint crm_walkthroughs_evidence_completion_check
    check ((status='completed')=(evidence_completed_at is not null));

create table public.crm_walkthrough_evidence_commands(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  walkthrough_id uuid not null,
  command_key text not null check(length(command_key) between 8 and 200),
  expected_updated_at timestamptz not null,
  evidence_notes text not null check(length(evidence_notes) between 1 and 5000),
  mark_complete boolean not null,
  resulting_updated_at timestamptz not null,
  resulting_completed_at timestamptz,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(organization_id,command_key),
  foreign key(organization_id,walkthrough_id)
    references public.crm_walkthroughs(organization_id,id) on delete cascade,
  check(mark_complete=(resulting_completed_at is not null))
);
alter table public.crm_walkthrough_evidence_commands enable row level security;
revoke all on public.crm_walkthrough_evidence_commands from public,anon,authenticated;
grant all on public.crm_walkthrough_evidence_commands to service_role;

create function public.command_crm_walkthrough_evidence(
  p_organization uuid,p_opportunity uuid,p_walkthrough uuid,p_request_key text,
  p_expected_updated_at timestamptz,p_evidence_notes text,p_mark_complete boolean
)
returns table(walkthrough_id uuid,evidence_notes text,evidence_completed_at timestamptz,
  updated_at timestamptz,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_row public.crm_walkthroughs%rowtype;
  existing public.crm_walkthrough_evidence_commands%rowtype;
  changed_at timestamptz; completed_at_value timestamptz;
begin
  if auth.uid() is null or p_mark_complete is null or length(p_request_key) not between 8 and 200
     or length(trim(coalesce(p_evidence_notes,''))) not between 1 and 5000 then
    raise exception 'walkthrough evidence unavailable' using errcode='42501';
  end if;
  select w.* into current_row from public.crm_walkthroughs w
    where w.organization_id=p_organization and w.id=p_walkthrough
      and w.opportunity_id=p_opportunity for update;
  if current_row.id is null
     or not coalesce((public.can_manage_organization(p_organization)
       or (public.organization_role(p_organization)='estimator'
         and current_row.estimator_user_id=auth.uid()
         and public.can_access_crm_opportunity(current_row.opportunity_id))),false) then
    raise exception 'walkthrough evidence unavailable' using errcode='42501';
  end if;
  select c.* into existing from public.crm_walkthrough_evidence_commands c
    where c.organization_id=p_organization and c.command_key=p_request_key;
  if existing.id is not null then
    if existing.walkthrough_id is distinct from p_walkthrough
       or existing.expected_updated_at is distinct from p_expected_updated_at
       or existing.evidence_notes is distinct from trim(p_evidence_notes)
       or existing.mark_complete is distinct from p_mark_complete then
      raise exception 'walkthrough evidence key already used' using errcode='23514';
    end if;
    return query select existing.walkthrough_id,existing.evidence_notes,
      existing.resulting_completed_at,existing.resulting_updated_at,true;
    return;
  end if;
  if current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'walkthrough changed since it was loaded' using errcode='40001';
  end if;
  if current_row.status not in ('scheduled','rescheduled') then
    raise exception 'walkthrough evidence is already final' using errcode='23514';
  end if;
  changed_at:=clock_timestamp();
  completed_at_value:=case when p_mark_complete then changed_at else null end;
  update public.crm_walkthroughs set
    evidence_notes=trim(p_evidence_notes),
    evidence_completed_at=completed_at_value,
    evidence_recorded_by=auth.uid(),
    status=case when p_mark_complete then 'completed' else status end,
    updated_by=auth.uid(),updated_at=changed_at
  where organization_id=p_organization and id=p_walkthrough;
  insert into public.crm_walkthrough_evidence_commands(
    organization_id,walkthrough_id,command_key,expected_updated_at,evidence_notes,
    mark_complete,resulting_updated_at,resulting_completed_at,actor_user_id
  ) values(
    p_organization,p_walkthrough,p_request_key,p_expected_updated_at,trim(p_evidence_notes),
    p_mark_complete,changed_at,completed_at_value,auth.uid()
  );
  return query select p_walkthrough,trim(p_evidence_notes),completed_at_value,changed_at,false;
end;
$$;
revoke all on function public.command_crm_walkthrough_evidence(
  uuid,uuid,uuid,text,timestamptz,text,boolean
) from public,anon;
grant execute on function public.command_crm_walkthrough_evidence(
  uuid,uuid,uuid,text,timestamptz,text,boolean
) to authenticated,service_role;

drop function public.read_crm_walkthroughs(uuid);
create function public.read_crm_walkthroughs(p_organization uuid)
returns table(id uuid,opportunity_id uuid,property_id uuid,estimator_user_id uuid,
  site_contact_id uuid,status text,window_start timestamptz,window_end timestamptz,
  timezone text,updated_at timestamptz,evidence_notes text,evidence_completed_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
  select w.id,w.opportunity_id,w.property_id,w.estimator_user_id,w.site_contact_id,
    w.status,w.window_start,w.window_end,w.timezone,w.updated_at,
    w.evidence_notes,w.evidence_completed_at
  from public.crm_walkthroughs w
  where w.organization_id=p_organization
    and w.status in ('scheduled','rescheduled','completed')
    and (public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator'
        and w.estimator_user_id=auth.uid()
        and public.can_access_crm_opportunity(w.opportunity_id)))
  order by w.window_start,w.id;
$$;
revoke all on function public.read_crm_walkthroughs(uuid) from public,anon;
grant execute on function public.read_crm_walkthroughs(uuid) to authenticated,service_role;

create function public.record_crm_walkthrough_evidence_event()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
begin
  if new.evidence_notes is distinct from old.evidence_notes then
    insert into public.organization_event_outbox(
      organization_id,event_type,aggregate_type,aggregate_id,payload
    ) values(new.organization_id,
      case when new.status='completed' and old.status<>'completed'
        then 'walkthrough.completed' else 'walkthrough.evidence_saved' end,
      'crm_walkthroughs',new.id::text,jsonb_build_object('record_id',new.id::text));
  end if;
  return new;
end;
$$;
revoke all on function public.record_crm_walkthrough_evidence_event()
  from public,anon,authenticated,service_role;
create trigger crm_walkthrough_evidence_outbox
  after update of evidence_notes,evidence_completed_at on public.crm_walkthroughs
  for each row execute function public.record_crm_walkthrough_evidence_event();

commit;
