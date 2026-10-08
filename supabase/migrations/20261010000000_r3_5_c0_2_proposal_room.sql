begin;

-- R3-5 C0.2: private fragment-exchange sessions and append-only customer
-- responses. Acceptance remains disabled and no anonymous database grant is
-- introduced; public HTTP routes cross this boundary only as service_role.

create table public.crm_customer_action_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  token_id uuid not null,
  proposal_version_id uuid not null,
  session_hmac_sha256 text not null unique check(session_hmac_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '15 minutes'),
  check(expires_at>created_at and expires_at<=created_at+interval '15 minutes'),
  unique(organization_id,id),
  foreign key(organization_id,token_id)
    references public.crm_customer_action_tokens(organization_id,id) on delete restrict,
  foreign key(organization_id,proposal_version_id)
    references public.crm_proposal_versions(organization_id,id) on delete restrict
);
create index crm_customer_action_sessions_lookup_idx
  on public.crm_customer_action_sessions(session_hmac_sha256,expires_at);

create table public.crm_customer_action_exchange_rate_buckets (
  key_version integer not null check(key_version>0),
  token_hmac_sha256 text not null check(token_hmac_sha256 ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  attempt_count integer not null default 0 check(attempt_count between 0 and 1000),
  updated_at timestamptz not null default now(),
  primary key(key_version,token_hmac_sha256,window_started_at)
);

create table public.crm_proposal_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_version_id uuid not null,
  token_id uuid not null,
  session_id uuid not null,
  response_kind text not null check(response_kind in ('question','change_requested','declined')),
  message text not null check(length(trim(message)) between 1 and 2000),
  display_name text check(display_name is null or length(trim(display_name)) between 1 and 160),
  request_key text not null check(length(request_key) between 8 and 200),
  request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(session_id,request_key),
  foreign key(organization_id,proposal_version_id)
    references public.crm_proposal_versions(organization_id,id) on delete restrict,
  foreign key(organization_id,token_id)
    references public.crm_customer_action_tokens(organization_id,id) on delete restrict,
  foreign key(organization_id,session_id)
    references public.crm_customer_action_sessions(organization_id,id) on delete restrict
);
create index crm_proposal_responses_version_idx
  on public.crm_proposal_responses(organization_id,proposal_version_id,created_at,id);

alter table public.crm_customer_action_sessions enable row level security;
alter table public.crm_customer_action_exchange_rate_buckets enable row level security;
alter table public.crm_proposal_responses enable row level security;
revoke all on public.crm_customer_action_sessions,
  public.crm_customer_action_exchange_rate_buckets,public.crm_proposal_responses
  from public,anon,authenticated,service_role;

create trigger guard_crm_customer_action_sessions_append_only
  before update or delete on public.crm_customer_action_sessions
  for each row execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_customer_action_sessions_truncate
  before truncate on public.crm_customer_action_sessions
  for each statement execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_proposal_responses_append_only
  before update or delete on public.crm_proposal_responses
  for each row execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_proposal_responses_truncate
  before truncate on public.crm_proposal_responses
  for each statement execute function public.guard_crm_customer_action_append_only();

create function public.exchange_crm_customer_action_token_internal(
  p_token_hmac_sha256 text,
  p_key_version integer,
  p_session_hmac_sha256 text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public as $$
declare token_row public.crm_customer_action_tokens%rowtype;
  session_row public.crm_customer_action_sessions%rowtype;
  latest_state text;
begin
  if p_token_hmac_sha256 !~ '^[a-f0-9]{64}$' or p_key_version<>1
     or p_session_hmac_sha256 !~ '^[a-f0-9]{64}$' then
    return null;
  end if;
  insert into public.crm_customer_action_exchange_rate_buckets(
    key_version,token_hmac_sha256,window_started_at,attempt_count
  ) values(p_key_version,p_token_hmac_sha256,date_trunc('minute',now()),1)
  on conflict(key_version,token_hmac_sha256,window_started_at) do update
    set attempt_count=public.crm_customer_action_exchange_rate_buckets.attempt_count+1,
      updated_at=now();
  if (select attempt_count from public.crm_customer_action_exchange_rate_buckets
      where key_version=p_key_version and token_hmac_sha256=p_token_hmac_sha256
        and window_started_at=date_trunc('minute',now()))>12 then
    return null;
  end if;
  select t.* into token_row from public.crm_customer_action_tokens t
    where t.key_version=p_key_version and t.token_hmac_sha256=p_token_hmac_sha256
    for share;
  if token_row.id is null then
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':',
    'veltex-r3-5-c0-exchange',token_row.id::text),0));
  select e.state into latest_state from public.crm_proposal_action_eligibility_events e
    where e.organization_id=token_row.organization_id
      and e.proposal_version_id=token_row.proposal_version_id
    order by e.created_at desc,e.id desc limit 1;
  if token_row.expires_at<=now()
     or token_row.designated_approver_email_hmac_sha256 is not null
     or latest_state is distinct from 'enabled'
     or exists(select 1 from public.crm_customer_action_token_revocations r
       where r.organization_id=token_row.organization_id and r.token_id=token_row.id)
     or not exists(select 1 from public.crm_proposal_versions v
       where v.organization_id=token_row.organization_id
         and v.id=token_row.proposal_version_id
         and v.schema_version='crm_proposal_version.v2') then
    return null;
  end if;
  insert into public.crm_customer_action_sessions(
    organization_id,token_id,proposal_version_id,session_hmac_sha256
  ) values(token_row.organization_id,token_row.id,token_row.proposal_version_id,
    p_session_hmac_sha256) returning * into session_row;
  return jsonb_build_object(
    'sessionExpiresAt',session_row.expires_at,
    'versionId',token_row.proposal_version_id,
    'allowedActions',case token_row.purpose
      when 'review_proposal' then '[]'::jsonb
      else '["question","change_requested","declined"]'::jsonb end
  );
end;
$$;
revoke all on function public.exchange_crm_customer_action_token_internal(text,integer,text)
  from public,anon,authenticated;
grant execute on function public.exchange_crm_customer_action_token_internal(text,integer,text)
  to service_role;

create function public.read_crm_customer_proposal_room_internal(
  p_session_hmac_sha256 text
) returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public as $$
declare session_row public.crm_customer_action_sessions%rowtype;
  token_row public.crm_customer_action_tokens%rowtype;
  version_row public.crm_proposal_versions%rowtype;
  org_name text; packages jsonb;
begin
  if p_session_hmac_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  select s.* into session_row from public.crm_customer_action_sessions s
    where s.session_hmac_sha256=p_session_hmac_sha256 and s.expires_at>now();
  if session_row.id is null then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  select t.* into token_row from public.crm_customer_action_tokens t
    where t.organization_id=session_row.organization_id and t.id=session_row.token_id;
  if token_row.id is null or token_row.expires_at<=now()
     or exists(select 1 from public.crm_customer_action_token_revocations r
       where r.organization_id=token_row.organization_id and r.token_id=token_row.id) then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  select v.* into version_row from public.crm_proposal_versions v
    where v.organization_id=session_row.organization_id
      and v.id=session_row.proposal_version_id and v.schema_version='crm_proposal_version.v2';
  if version_row.id is null then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  select o.name into org_name from public.organizations o
    where o.id=session_row.organization_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'associationId',a.id,'displayPosition',a.display_position,
    'title',a.customer_visible_title,'scope',a.customer_visible_scope,
    'amountMinor',a.amount_minor,'currency',a.currency,
    'pricingBasis',a.pricing_basis,'associationSha256',a.association_sha256
  ) order by a.display_position),'[]'::jsonb) into packages
  from public.crm_proposal_version_packages a
  where a.organization_id=session_row.organization_id
    and a.proposal_version_id=session_row.proposal_version_id;
  return jsonb_build_object(
    'organization',jsonb_build_object('displayName',org_name),
    'proposalVersionId',version_row.id,'versionNumber',version_row.version_number,
    'renderedContent',version_row.rendered_content,
    'contentSha256',version_row.content_sha256,
    'renderedSha256',version_row.rendered_sha256,
    'packages',packages,'fullOfferedTotalMinor',version_row.display_amount_minor,
    'selectedSubtotalMinor',version_row.display_amount_minor,
    'currency',version_row.currency,'expiresAt',least(session_row.expires_at,token_row.expires_at),
    'allowedActions',case token_row.purpose when 'review_proposal' then '[]'::jsonb
      else '["question","change_requested","declined"]'::jsonb end,
    'consent',jsonb_build_object('version','veltex-c0-acceptance-v1',
      'text','I have reviewed this proposal version and the selected service packages. By selecting Accept proposal, I confirm my acceptance of those selected packages. I understand that Veltex records the name and email I enter, the proposal version, selected packages, and acceptance time. This is not an electronic-signature process.'),
    'acceptanceEnabled',false
  );
end;
$$;
revoke all on function public.read_crm_customer_proposal_room_internal(text)
  from public,anon,authenticated;
grant execute on function public.read_crm_customer_proposal_room_internal(text)
  to service_role;

create function public.command_crm_customer_proposal_response_internal(
  p_session_hmac_sha256 text,p_response_kind text,p_message text,
  p_display_name text,p_request_key text,p_request_sha256 text
) returns table(response_id uuid,created_at timestamptz,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare session_row public.crm_customer_action_sessions%rowtype;
  token_row public.crm_customer_action_tokens%rowtype;
  existing public.crm_proposal_responses%rowtype;
  created public.crm_proposal_responses%rowtype;
begin
  if p_session_hmac_sha256 !~ '^[a-f0-9]{64}$'
     or p_response_kind not in ('question','change_requested','declined')
     or length(trim(coalesce(p_message,''))) not between 1 and 2000
     or (p_display_name is not null and length(trim(p_display_name)) not between 1 and 160)
     or length(coalesce(p_request_key,'')) not between 8 and 200
     or p_request_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  select s.* into session_row from public.crm_customer_action_sessions s
    where s.session_hmac_sha256=p_session_hmac_sha256 and s.expires_at>now()
    for share;
  select t.* into token_row from public.crm_customer_action_tokens t
    where t.organization_id=session_row.organization_id and t.id=session_row.token_id;
  if session_row.id is null or token_row.purpose not in ('respond_proposal','accept_proposal')
     or token_row.expires_at<=now()
     or exists(select 1 from public.crm_customer_action_token_revocations r
       where r.organization_id=token_row.organization_id and r.token_id=token_row.id) then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(concat_ws(':',
    'veltex-r3-5-c0-response',session_row.id::text,p_request_key),0));
  select r.* into existing from public.crm_proposal_responses r
    where r.session_id=session_row.id and r.request_key=p_request_key;
  if existing.id is not null then
    if existing.request_sha256<>p_request_sha256 then
      raise exception 'proposal response conflict' using errcode='23505';
    end if;
    return query select existing.id,existing.created_at,true;
    return;
  end if;
  insert into public.crm_proposal_responses(
    organization_id,proposal_version_id,token_id,session_id,response_kind,
    message,display_name,request_key,request_sha256
  ) values(session_row.organization_id,session_row.proposal_version_id,
    session_row.token_id,session_row.id,p_response_kind,trim(p_message),
    nullif(trim(p_display_name),''),p_request_key,p_request_sha256)
  returning * into created;
  insert into public.organization_event_outbox(
    organization_id,event_type,aggregate_type,aggregate_id,payload
  ) values(session_row.organization_id,'proposal.customer_response_received',
    'crm_proposal_responses',created.id::text,
    jsonb_build_object('response_id',created.id,
      'proposal_version_id',created.proposal_version_id,'response_kind',created.response_kind));
  return query select created.id,created.created_at,false;
end;
$$;
revoke all on function public.command_crm_customer_proposal_response_internal(
  text,text,text,text,text,text
) from public,anon,authenticated;
grant execute on function public.command_crm_customer_proposal_response_internal(
  text,text,text,text,text,text
) to service_role;

commit;
