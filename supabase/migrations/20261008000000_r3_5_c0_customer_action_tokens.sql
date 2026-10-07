begin;

-- R3-5 C0.1 private foundation. No anonymous function, public room or
-- acceptance mutation is introduced by this migration. Raw bearer values are
-- generated and HMACed by the server and never cross this database boundary.

create table public.crm_proposal_action_eligibility_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_version_id uuid not null,
  opportunity_id uuid not null,
  state text not null check(state in ('enabled','disabled')),
  reason text not null check(length(trim(reason)) between 1 and 240),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  foreign key(organization_id,proposal_version_id)
    references public.crm_proposal_versions(organization_id,id) on delete restrict,
  foreign key(organization_id,opportunity_id)
    references public.crm_opportunities(organization_id,id) on delete restrict,
  foreign key(organization_id,created_by)
    references public.organization_memberships(organization_id,user_id) on delete restrict
);
create index crm_proposal_action_eligibility_latest_idx
  on public.crm_proposal_action_eligibility_events(
    organization_id,proposal_version_id,created_at desc,id desc
  );

create table public.crm_customer_action_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_version_id uuid not null,
  opportunity_id uuid not null,
  purpose text not null check(purpose in (
    'review_proposal','respond_proposal','accept_proposal'
  )),
  token_hmac_sha256 text not null check(token_hmac_sha256 ~ '^[a-f0-9]{64}$'),
  key_version integer not null check(key_version>0),
  designated_approver_email_hmac_sha256 text
    check(designated_approver_email_hmac_sha256 is null
      or designated_approver_email_hmac_sha256 ~ '^[a-f0-9]{64}$'),
  issued_by uuid not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check(expires_at>issued_at and expires_at<=issued_at+interval '7 days'),
  unique(organization_id,id),
  unique(key_version,token_hmac_sha256),
  foreign key(organization_id,proposal_version_id)
    references public.crm_proposal_versions(organization_id,id) on delete restrict,
  foreign key(organization_id,opportunity_id)
    references public.crm_opportunities(organization_id,id) on delete restrict,
  foreign key(organization_id,issued_by)
    references public.organization_memberships(organization_id,user_id) on delete restrict
);
create index crm_customer_action_tokens_version_idx
  on public.crm_customer_action_tokens(
    organization_id,proposal_version_id,issued_at desc,id desc
  );
create index crm_customer_action_tokens_expiry_idx
  on public.crm_customer_action_tokens(expires_at,id);

create table public.crm_customer_action_token_revocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  token_id uuid not null,
  reason text not null check(length(trim(reason)) between 1 and 240),
  revoked_by uuid not null,
  revoked_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(organization_id,token_id),
  foreign key(organization_id,token_id)
    references public.crm_customer_action_tokens(organization_id,id) on delete restrict,
  foreign key(organization_id,revoked_by)
    references public.organization_memberships(organization_id,user_id) on delete restrict
);

create table public.crm_customer_action_token_commands (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid not null,
  command_kind text not null check(command_kind in ('issue','revoke')),
  request_key text not null check(length(request_key) between 8 and 200),
  request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
  token_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(organization_id,actor_user_id,command_kind,request_key),
  foreign key(organization_id,actor_user_id)
    references public.organization_memberships(organization_id,user_id) on delete restrict,
  foreign key(organization_id,token_id)
    references public.crm_customer_action_tokens(organization_id,id) on delete restrict
);

create table public.crm_customer_action_rate_buckets (
  token_id uuid not null,
  organization_id uuid not null,
  network_bucket_hmac_sha256 text,
  window_started_at timestamptz not null,
  attempt_count integer not null default 0 check(attempt_count between 0 and 1000),
  updated_at timestamptz not null default now(),
  primary key(token_id,window_started_at),
  foreign key(organization_id,token_id)
    references public.crm_customer_action_tokens(organization_id,id) on delete cascade,
  check(network_bucket_hmac_sha256 is null
    or network_bucket_hmac_sha256 ~ '^[a-f0-9]{64}$')
);

alter table public.crm_proposal_action_eligibility_events enable row level security;
alter table public.crm_customer_action_tokens enable row level security;
alter table public.crm_customer_action_token_revocations enable row level security;
alter table public.crm_customer_action_token_commands enable row level security;
alter table public.crm_customer_action_rate_buckets enable row level security;

revoke all on public.crm_proposal_action_eligibility_events,
  public.crm_customer_action_tokens,
  public.crm_customer_action_token_revocations,
  public.crm_customer_action_token_commands,
  public.crm_customer_action_rate_buckets
  from public,anon,authenticated,service_role;

create function public.guard_crm_customer_action_append_only()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
begin
  raise exception 'customer action records are append-only' using errcode='42501';
end;
$$;
revoke all on function public.guard_crm_customer_action_append_only()
  from public,anon,authenticated,service_role;

create trigger guard_crm_proposal_action_eligibility_append_only
  before update or delete on public.crm_proposal_action_eligibility_events
  for each row execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_proposal_action_eligibility_truncate
  before truncate on public.crm_proposal_action_eligibility_events
  for each statement execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_customer_action_tokens_append_only
  before update or delete on public.crm_customer_action_tokens
  for each row execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_customer_action_tokens_truncate
  before truncate on public.crm_customer_action_tokens
  for each statement execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_customer_action_revocations_append_only
  before update or delete on public.crm_customer_action_token_revocations
  for each row execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_customer_action_revocations_truncate
  before truncate on public.crm_customer_action_token_revocations
  for each statement execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_customer_action_commands_append_only
  before update or delete on public.crm_customer_action_token_commands
  for each row execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_customer_action_commands_truncate
  before truncate on public.crm_customer_action_token_commands
  for each statement execute function public.guard_crm_customer_action_append_only();

create function public.command_crm_issue_customer_action_token_internal(
  p_actor uuid,
  p_organization uuid,
  p_proposal_version uuid,
  p_purpose text,
  p_token_hmac_sha256 text,
  p_key_version integer,
  p_designated_approver_email_hmac_sha256 text,
  p_expires_in_days integer,
  p_request_key text,
  p_request_sha256 text
) returns table(
  token_id uuid,
  proposal_version_id uuid,
  purpose text,
  key_version integer,
  issued_at timestamptz,
  expires_at timestamptz,
  designated_approver_required boolean,
  replayed boolean,
  raw_token_recoverable boolean
) language plpgsql security definer
set search_path=pg_catalog,public as $$
declare
  actor_role text;
  version_row public.crm_proposal_versions%rowtype;
  opportunity_row public.crm_opportunities%rowtype;
  command_row public.crm_customer_action_token_commands%rowtype;
  created_token public.crm_customer_action_tokens%rowtype;
begin
  if p_actor is null or p_organization is null or p_proposal_version is null
     or p_purpose not in ('review_proposal','respond_proposal','accept_proposal')
     or p_token_hmac_sha256 !~ '^[a-f0-9]{64}$'
     or p_key_version<>1
     or (p_designated_approver_email_hmac_sha256 is not null
       and p_designated_approver_email_hmac_sha256 !~ '^[a-f0-9]{64}$')
     or p_expires_in_days is null or p_expires_in_days not in (1,3,7)
     or p_request_key is null or length(p_request_key) not between 8 and 200
     or p_request_sha256 is null or p_request_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'customer action token unavailable' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':',
    'veltex-r3-5-c0-token-set',p_organization::text,p_proposal_version::text),0));
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':',
    'veltex-r3-5-c0',p_organization::text,p_actor::text,'issue',p_request_key),0));

  select m.role into actor_role from public.organization_memberships m
    where m.organization_id=p_organization and m.user_id=p_actor;
  select v.* into version_row from public.crm_proposal_versions v
    where v.organization_id=p_organization and v.id=p_proposal_version;
  if version_row.id is not null then
    select o.* into opportunity_row from public.crm_opportunities o
      where o.organization_id=p_organization
        and o.id=version_row.opportunity_id and o.deleted_at is null;
  end if;
  if version_row.id is null or version_row.schema_version<>'crm_proposal_version.v2'
     or opportunity_row.id is null
     or not coalesce(actor_role in ('owner','admin')
       or (actor_role='estimator' and opportunity_row.estimator_user_id=p_actor),false)
     or (p_designated_approver_email_hmac_sha256 is not null
       and actor_role not in ('owner','admin'))
     or version_row.package_count is null
     or version_row.package_count<>(select count(*)
       from public.crm_proposal_version_packages a
       where a.organization_id=p_organization
         and a.proposal_version_id=p_proposal_version)
     or (p_purpose='accept_proposal' and exists(
       select 1
       from public.crm_proposal_version_packages a
       join public.crm_site_work_packages p
         on p.organization_id=a.organization_id and p.id=a.work_package_id
       join public.crm_estimate_runs e
         on e.organization_id=a.organization_id and e.id=a.estimate_run_id
       where a.organization_id=p_organization
         and a.proposal_version_id=p_proposal_version
         and (p.proposal_version_id is distinct from p_proposal_version
           or p.status<>'estimated'
           or p.estimate_run_id is distinct from a.estimate_run_id
           or e.work_package_id is distinct from a.work_package_id
           or e.opportunity_id is distinct from a.opportunity_id
           or e.property_id is distinct from a.property_id
           or e.selected_amount_minor is distinct from a.amount_minor
           or e.currency is distinct from a.currency
           or e.pricing_basis is distinct from a.pricing_basis
           or e.input_sha256 is distinct from a.estimate_input_sha256
           or e.output_sha256 is distinct from a.estimate_output_sha256
           or a.association_sha256 is distinct from public.crm_estimate_sha256(
             jsonb_build_object(
               'display_position',a.display_position,
               'work_package_id',a.work_package_id,
               'estimate_run_id',a.estimate_run_id,
               'title',a.customer_visible_title,
               'scope_sha256',a.scope_sha256,
               'amount_minor',a.amount_minor,
               'currency',a.currency,
               'pricing_basis',a.pricing_basis,
               'estimate_input_sha256',a.estimate_input_sha256,
               'estimate_output_sha256',a.estimate_output_sha256)))))
     or (p_purpose='accept_proposal' and version_row.package_set_sha256
       is distinct from (
         select public.crm_estimate_sha256(coalesce(jsonb_agg(jsonb_build_object(
           'displayPosition',a.display_position,
           'workPackageId',a.work_package_id,
           'estimateRunId',a.estimate_run_id,
           'associationSha256',a.association_sha256)
           order by a.display_position),'[]'::jsonb))
         from public.crm_proposal_version_packages a
         where a.organization_id=p_organization
           and a.proposal_version_id=p_proposal_version))
     or exists(select 1 from public.crm_pipeline_stages s
       where s.organization_id=p_organization and s.id=opportunity_row.stage_id
         and s.category in ('won','lost','disqualified','handed_off')) then
    raise exception 'customer action token unavailable' using errcode='42501';
  end if;

  select c.* into command_row from public.crm_customer_action_token_commands c
    where c.organization_id=p_organization and c.actor_user_id=p_actor
      and c.command_kind='issue' and c.request_key=p_request_key
    for update;
  if command_row.request_key is not null then
    if command_row.request_sha256<>p_request_sha256 then
      raise exception 'customer action token request conflict' using errcode='23505';
    end if;
    select t.* into created_token from public.crm_customer_action_tokens t
      where t.organization_id=p_organization and t.id=command_row.token_id;
    return query select created_token.id,created_token.proposal_version_id,
      created_token.purpose,created_token.key_version,created_token.issued_at,
      created_token.expires_at,
      created_token.designated_approver_email_hmac_sha256 is not null,true,false;
    return;
  end if;

  insert into public.crm_proposal_action_eligibility_events(
    organization_id,proposal_version_id,opportunity_id,state,reason,created_by
  ) values(
    p_organization,p_proposal_version,version_row.opportunity_id,
    'enabled','operator issuance',p_actor
  );
  insert into public.crm_customer_action_tokens(
    organization_id,proposal_version_id,opportunity_id,purpose,
    token_hmac_sha256,key_version,designated_approver_email_hmac_sha256,
    issued_by,expires_at
  ) values(
    p_organization,p_proposal_version,version_row.opportunity_id,p_purpose,
    p_token_hmac_sha256,p_key_version,p_designated_approver_email_hmac_sha256,
    p_actor,now()+make_interval(days=>p_expires_in_days)
  ) returning * into created_token;
  insert into public.crm_customer_action_token_commands(
    organization_id,actor_user_id,command_kind,request_key,request_sha256,token_id
  ) values(
    p_organization,p_actor,'issue',p_request_key,p_request_sha256,created_token.id
  );
  insert into public.organization_audit_log(
    organization_id,actor_user_id,action,entity_type,entity_id,metadata
  ) values(
    p_organization,p_actor,'crm.customer_action_token.issued',
    'crm_customer_action_tokens',created_token.id::text,
    jsonb_build_object('proposal_version_id',p_proposal_version,
      'purpose',p_purpose,'key_version',p_key_version,
      'expires_at',created_token.expires_at)
  );
  insert into public.organization_event_outbox(
    organization_id,event_type,aggregate_type,aggregate_id,payload
  ) values(
    p_organization,'proposal.customer_action_token_issued',
    'crm_customer_action_tokens',created_token.id::text,
    jsonb_build_object('token_id',created_token.id,
      'proposal_version_id',p_proposal_version,'purpose',p_purpose)
  );
  return query select created_token.id,created_token.proposal_version_id,
    created_token.purpose,created_token.key_version,created_token.issued_at,
    created_token.expires_at,
    created_token.designated_approver_email_hmac_sha256 is not null,false,true;
end;
$$;
revoke all on function public.command_crm_issue_customer_action_token_internal(
  uuid,uuid,uuid,text,text,integer,text,integer,text,text
) from public,anon,authenticated;
grant execute on function public.command_crm_issue_customer_action_token_internal(
  uuid,uuid,uuid,text,text,integer,text,integer,text,text
) to service_role;

create function public.command_crm_revoke_customer_action_token_internal(
  p_actor uuid,
  p_organization uuid,
  p_proposal_version uuid,
  p_token uuid,
  p_reason text,
  p_request_key text,
  p_request_sha256 text
) returns table(token_id uuid,revoked_at timestamptz,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  actor_role text;
  token_row public.crm_customer_action_tokens%rowtype;
  opportunity_row public.crm_opportunities%rowtype;
  command_row public.crm_customer_action_token_commands%rowtype;
  revocation_row public.crm_customer_action_token_revocations%rowtype;
begin
  if p_actor is null or p_organization is null or p_proposal_version is null
     or p_token is null
     or length(trim(coalesce(p_reason,''))) not between 1 and 240
     or p_request_key is null or length(p_request_key) not between 8 and 200
     or p_request_sha256 is null or p_request_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'customer action token unavailable' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':',
    'veltex-r3-5-c0-token-set',p_organization::text,p_proposal_version::text),0));
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':',
    'veltex-r3-5-c0',p_organization::text,p_actor::text,'revoke',p_request_key),0));
  select m.role into actor_role from public.organization_memberships m
    where m.organization_id=p_organization and m.user_id=p_actor;
  select t.* into token_row from public.crm_customer_action_tokens t
    where t.organization_id=p_organization and t.proposal_version_id=p_proposal_version
      and t.id=p_token;
  if token_row.id is not null then
    select o.* into opportunity_row from public.crm_opportunities o
      where o.organization_id=p_organization and o.id=token_row.opportunity_id;
  end if;
  if token_row.id is null or opportunity_row.id is null
     or not coalesce(actor_role in ('owner','admin')
       or (actor_role='estimator' and opportunity_row.deleted_at is null
         and opportunity_row.estimator_user_id=p_actor),false) then
    raise exception 'customer action token unavailable' using errcode='42501';
  end if;
  select c.* into command_row from public.crm_customer_action_token_commands c
    where c.organization_id=p_organization and c.actor_user_id=p_actor
      and c.command_kind='revoke' and c.request_key=p_request_key
    for update;
  if command_row.request_key is not null then
    if command_row.request_sha256<>p_request_sha256
       or command_row.token_id<>p_token then
      raise exception 'customer action token request conflict' using errcode='23505';
    end if;
    select r.* into revocation_row from public.crm_customer_action_token_revocations r
      where r.organization_id=p_organization and r.token_id=p_token;
    return query select p_token,revocation_row.revoked_at,true;
    return;
  end if;
  begin
    insert into public.crm_customer_action_token_revocations(
      organization_id,token_id,reason,revoked_by
    ) values(p_organization,p_token,trim(p_reason),p_actor)
    returning * into revocation_row;
  exception when unique_violation then
    select r.* into revocation_row from public.crm_customer_action_token_revocations r
      where r.organization_id=p_organization and r.token_id=p_token;
  end;
  insert into public.crm_customer_action_token_commands(
    organization_id,actor_user_id,command_kind,request_key,request_sha256,token_id
  ) values(p_organization,p_actor,'revoke',p_request_key,p_request_sha256,p_token);
  if not exists (
    select 1
    from public.crm_customer_action_tokens sibling
    left join public.crm_customer_action_token_revocations sibling_revocation
      on sibling_revocation.organization_id=sibling.organization_id
     and sibling_revocation.token_id=sibling.id
    where sibling.organization_id=p_organization
      and sibling.proposal_version_id=token_row.proposal_version_id
      and sibling.id<>p_token
      and sibling.expires_at>now()
      and sibling_revocation.id is null
  ) then
    insert into public.crm_proposal_action_eligibility_events(
      organization_id,proposal_version_id,opportunity_id,state,reason,created_by
    ) values(p_organization,token_row.proposal_version_id,token_row.opportunity_id,
      'disabled','token revoked',p_actor);
  end if;
  insert into public.organization_audit_log(
    organization_id,actor_user_id,action,entity_type,entity_id,metadata
  ) values(p_organization,p_actor,'crm.customer_action_token.revoked',
    'crm_customer_action_tokens',p_token::text,
    jsonb_build_object('token_id',p_token,
      'proposal_version_id',token_row.proposal_version_id));
  insert into public.organization_event_outbox(
    organization_id,event_type,aggregate_type,aggregate_id,payload
  ) values(p_organization,'proposal.customer_action_token_revoked',
    'crm_customer_action_tokens',p_token::text,
    jsonb_build_object('token_id',p_token,
      'proposal_version_id',token_row.proposal_version_id));
  return query select p_token,revocation_row.revoked_at,false;
end;
$$;
revoke all on function public.command_crm_revoke_customer_action_token_internal(
  uuid,uuid,uuid,uuid,text,text,text
) from public,anon,authenticated;
grant execute on function public.command_crm_revoke_customer_action_token_internal(
  uuid,uuid,uuid,uuid,text,text,text
) to service_role;

create function public.read_crm_customer_action_token_status(
  p_organization uuid,p_proposal_version uuid
) returns table(
  token_id uuid,purpose text,issued_at timestamptz,expires_at timestamptz,
  revoked_at timestamptz,designated_approver_required boolean,
  status text
) language sql stable security definer set search_path=pg_catalog,public as $$
  select t.id,t.purpose,t.issued_at,t.expires_at,r.revoked_at,
    t.designated_approver_email_hmac_sha256 is not null,
    case when r.id is not null then 'revoked'
      when t.expires_at<=now() then 'expired' else 'active' end
  from public.crm_customer_action_tokens t
  join public.crm_opportunities o
    on o.organization_id=t.organization_id and o.id=t.opportunity_id
  join public.organization_memberships m
    on m.organization_id=t.organization_id and m.user_id=auth.uid()
  left join public.crm_customer_action_token_revocations r
    on r.organization_id=t.organization_id and r.token_id=t.id
  where t.organization_id=p_organization
    and t.proposal_version_id=p_proposal_version
    and (m.role in ('owner','admin')
      or (m.role='estimator' and o.estimator_user_id=auth.uid()))
  order by t.issued_at desc,t.id desc;
$$;
revoke all on function public.read_crm_customer_action_token_status(uuid,uuid)
  from public,anon,service_role;
grant execute on function public.read_crm_customer_action_token_status(uuid,uuid)
  to authenticated;

commit;
