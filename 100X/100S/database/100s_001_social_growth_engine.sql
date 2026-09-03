-- 100S migration ledger id: 100s_001. Additive, unapplied, publishing-disabled foundation.
create extension if not exists pgcrypto;

do $$ begin create role veltex_100s_reviewer nologin; exception when duplicate_object then null; end $$;
do $$ begin create role veltex_100s_operator nologin; exception when duplicate_object then null; end $$;

create table if not exists public.social_campaigns (
  id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null,
  market text not null check (market = 'US'), traffic_medium text not null check (traffic_medium in ('organic_social','paid_social')), audience text not null, objective text not null,
  offer text not null, destination_url text not null, active boolean not null default false,
  publishing_enabled boolean not null default false,
  approval_mode text not null default 'two_person' check (approval_mode in ('two_person','timed_self_review')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.social_platform_accounts (
  id uuid primary key default gen_random_uuid(), platform text not null check (platform in ('facebook','instagram','linkedin','youtube')),
  label text not null, handle text, provider_account_id text, owner_label text not null, approver_label text not null,
  active boolean not null default false, unique(platform, provider_account_id)
);
create table if not exists public.social_research_sources (
  id uuid primary key default gen_random_uuid(), url text not null, publisher text not null, retrieved_at timestamptz not null,
  snapshot_hash text, created_at timestamptz not null default now(), unique(url, retrieved_at)
);
create table if not exists public.social_research_claims (
  id uuid primary key default gen_random_uuid(), source_id uuid not null references public.social_research_sources(id),
  assertion text not null, claim_type text not null check (claim_type in ('statistic','definition','product_capability','opinion')),
  substantiation text not null, verified_by uuid not null references auth.users(id), verified_at timestamptz not null,
  expires_at timestamptz, unique(source_id, assertion)
);
create table if not exists public.social_creative_units (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.social_campaigns(id),
  idempotency_key text unique not null, series_id text not null, hook_variant_id text not null, pillar text not null,
  funnel_stage text not null, working_title text not null, script jsonb not null, b_roll_manifest jsonb not null default '[]',
  product_screens jsonb not null default '[]', created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.social_creative_claims (
  creative_unit_id uuid not null references public.social_creative_units(id) on delete cascade,
  claim_id uuid not null references public.social_research_claims(id), primary key (creative_unit_id, claim_id)
);
create table if not exists public.social_placements (
  id uuid primary key default gen_random_uuid(), creative_unit_id uuid not null references public.social_creative_units(id) on delete cascade,
  account_id uuid references public.social_platform_accounts(id), idempotency_key text unique not null,
  platform text not null check (platform in ('facebook','instagram','linkedin','youtube')),
  format text not null check (format in ('reel','short','native_video','carousel','document','story','link')),
  title text not null, body text not null, call_to_action text not null, first_comment text not null default '',
  thumbnail_text text not null default '', hashtags jsonb not null default '[]', destination_url text not null,
  content_hash text not null, state text not null default 'draft' check (state in ('draft','needs_review','approved','scheduled','published','rejected')),
  scheduled_for timestamptz, published_at timestamptz, provider text, provider_post_id text,
  rejected_reason text, reviewer_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(provider, account_id, provider_post_id), check (state <> 'scheduled' or scheduled_for is not null)
);
create table if not exists public.social_compliance_verdicts (
  id uuid primary key default gen_random_uuid(), placement_id uuid not null references public.social_placements(id) on delete cascade,
  rules_version text not null, content_hash text not null, approved boolean not null, flags jsonb not null default '[]',
  evaluated_by uuid not null references auth.users(id), evaluated_at timestamptz not null default now()
);
create table if not exists public.social_approval_events (
  id uuid primary key default gen_random_uuid(), placement_id uuid not null references public.social_placements(id) on delete cascade,
  from_state text not null, to_state text not null, content_hash text not null, actor_id uuid not null references auth.users(id),
  reviewer_notes text, created_at timestamptz not null default now()
);
create table if not exists public.social_placement_metrics_daily (
  placement_id uuid not null references public.social_placements(id) on delete cascade, provider text not null,
  metric_date date not null, snapshot_type text not null default 'cumulative' check (snapshot_type in ('cumulative','daily_delta')),
  reach integer not null default 0, impressions integer not null default 0, three_second_views integer not null default 0,
  video_views integer not null default 0, watch_seconds numeric not null default 0, video_length_seconds numeric not null default 0,
  completions integer not null default 0, saves integer not null default 0, shares integer not null default 0,
  comments integer not null default 0, follows integer not null default 0, profile_visits integer not null default 0,
  link_taps integer not null default 0, primary key (placement_id, provider, metric_date, snapshot_type)
);
create table if not exists public.social_revenue_cohorts (
  campaign_slug text not null, series_id text not null, cohort_month date not null, sessions integer not null default 0,
  calculator_uses integer not null default 0, demos integer not null default 0, signups integer not null default 0,
  activated_users integer not null default 0, trials integer not null default 0, subscribers integer not null default 0,
  revenue_cents integer not null default 0, reconciled_at timestamptz, primary key (campaign_slug, series_id, cohort_month)
);
create table if not exists public.social_decision_log (
  id uuid primary key default gen_random_uuid(), subject_type text not null, subject_id text not null, decision text not null,
  metric_snapshot jsonb not null, rule_version text not null, decided_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.social_engagement_queue (
  id uuid primary key default gen_random_uuid(), placement_id uuid references public.social_placements(id), provider_comment_id text,
  classification text not null check (classification in ('question','objection','complaint','spam','lead','legal_risk')),
  original_text text not null, ai_draft text, state text not null default 'needs_review', assigned_to uuid references auth.users(id),
  reviewed_by uuid references auth.users(id), reviewed_at timestamptz, created_at timestamptz not null default now(),
  unique(placement_id, provider_comment_id), check (classification not in ('complaint','legal_risk') or ai_draft is null)
);

create or replace function public.social_compute_placement_hash(p_placement uuid)
returns text language sql stable set search_path = public, pg_temp as $$
  select encode(digest(concat_ws(chr(31), p.platform, p.format, p.title, p.body, p.call_to_action,
    p.first_comment, p.thumbnail_text, p.hashtags::text, p.destination_url, u.script::text,
    coalesce((select string_agg(cc.claim_id::text, ',' order by cc.claim_id::text) from social_creative_claims cc where cc.creative_unit_id = u.id), '')), 'sha256'), 'hex')
  from social_placements p join social_creative_units u on u.id = p.creative_unit_id where p.id = p_placement
$$;

create or replace function public.social_refresh_placement_hash()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.content_hash := encode(digest(concat_ws(chr(31), new.platform, new.format, new.title, new.body,
    new.call_to_action, new.first_comment, new.thumbnail_text, new.hashtags::text, new.destination_url,
    (select script::text from social_creative_units where id = new.creative_unit_id),
    coalesce((select string_agg(claim_id::text, ',' order by claim_id::text) from social_creative_claims where creative_unit_id = new.creative_unit_id), '')), 'sha256'), 'hex');
  if tg_op = 'UPDATE' and new.content_hash <> old.content_hash then new.state := 'draft'; new.scheduled_for := null; end if;
  return new;
end $$;
drop trigger if exists social_refresh_placement_hash_trigger on public.social_placements;
create trigger social_refresh_placement_hash_trigger before insert or update of creative_unit_id, platform, format, title, body, call_to_action, first_comment, thumbnail_text, hashtags, destination_url on public.social_placements for each row execute function public.social_refresh_placement_hash();

create or replace function public.social_invalidate_creative_approvals()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  update social_placements set content_hash = social_compute_placement_hash(id), state = 'draft', scheduled_for = null, updated_at = now() where creative_unit_id = new.id;
  return new;
end $$;
drop trigger if exists social_invalidate_creative_approvals_trigger on public.social_creative_units;
create trigger social_invalidate_creative_approvals_trigger after update of script on public.social_creative_units for each row execute function public.social_invalidate_creative_approvals();

create or replace function public.social_approve_placement(p_placement uuid, p_notes text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role text; v_hash text; v_verdict record; v_creator uuid; v_mode text; v_created_at timestamptz; v_claim_count integer; v_invalid_claims integer;
begin
  select role into v_role from profiles where id = auth.uid();
  if coalesce(v_role, '') <> 'admin' then raise exception 'admin approval required'; end if;
  select content_hash into v_hash from social_placements where id = p_placement for update;
  if v_hash is null then raise exception 'placement not found'; end if;
  select u.created_by, c.approval_mode, u.created_at into v_creator, v_mode, v_created_at
    from social_placements p join social_creative_units u on u.id = p.creative_unit_id join social_campaigns c on c.id = u.campaign_id where p.id = p_placement;
  if v_mode = 'two_person' and v_creator = auth.uid() then raise exception 'drafter and approver must differ'; end if;
  if v_mode = 'timed_self_review' and v_creator = auth.uid() and (now() - v_created_at < interval '30 minutes' or nullif(trim(p_notes), '') is null) then raise exception 'self review requires 30 minutes and reviewer notes'; end if;
  select count(*), count(*) filter (where c.expires_at is not null and c.expires_at <= now()) into v_claim_count, v_invalid_claims
    from social_placements p join social_creative_claims cc on cc.creative_unit_id = p.creative_unit_id join social_research_claims c on c.id = cc.claim_id where p.id = p_placement;
  if v_claim_count = 0 or v_invalid_claims > 0 then raise exception 'current substantiated claims required'; end if;
  select * into v_verdict from social_compliance_verdicts where placement_id = p_placement order by evaluated_at desc limit 1;
  if v_verdict is null or not v_verdict.approved or v_verdict.content_hash <> v_hash or jsonb_array_length(v_verdict.flags) <> 0 then raise exception 'current clean compliance verdict required'; end if;
  insert into social_approval_events(placement_id, from_state, to_state, content_hash, actor_id, reviewer_notes)
    select id, state, 'approved', content_hash, auth.uid(), p_notes from social_placements where id = p_placement;
  update social_placements set state = 'approved', reviewer_notes = p_notes, updated_at = now() where id = p_placement;
end $$;

create or replace function public.social_schedule_placement(p_placement uuid, p_scheduled_for timestamptz)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role text; v_hash text; v_approved_hash text; v_account_active boolean; v_campaign_active boolean; v_publish_enabled boolean; v_platform text;
begin
  select role into v_role from profiles where id = auth.uid();
  if coalesce(v_role, '') <> 'admin' then raise exception 'admin scheduling required'; end if;
  if p_scheduled_for <= now() then raise exception 'scheduled time must be in the future'; end if;
  select p.content_hash, a.active, c.active, c.publishing_enabled, p.platform
    into v_hash, v_account_active, v_campaign_active, v_publish_enabled, v_platform
    from social_placements p
    join social_platform_accounts a on a.id = p.account_id
    join social_creative_units u on u.id = p.creative_unit_id
    join social_campaigns c on c.id = u.campaign_id
    where p.id = p_placement and p.state = 'approved' for update of p;
  if v_hash is null then raise exception 'approved placement with configured account required'; end if;
  select content_hash into v_approved_hash from social_approval_events
    where placement_id = p_placement and to_state = 'approved' order by created_at desc limit 1;
  if v_approved_hash is distinct from v_hash then raise exception 'approval is stale'; end if;
  if not v_account_active or not v_campaign_active or not v_publish_enabled then raise exception 'account and campaign publishing switches must be active'; end if;
  if exists (
    select 1 from social_placements
    where id <> p_placement and platform = v_platform and state in ('scheduled','published')
      and scheduled_for >= date_trunc('day', p_scheduled_for at time zone 'America/New_York') at time zone 'America/New_York'
      and scheduled_for < (date_trunc('day', p_scheduled_for at time zone 'America/New_York') + interval '1 day') at time zone 'America/New_York'
  ) then raise exception 'global daily platform cadence exceeded'; end if;
  update social_placements set state = 'scheduled', scheduled_for = p_scheduled_for, updated_at = now() where id = p_placement;
  insert into social_approval_events(placement_id, from_state, to_state, content_hash, actor_id, reviewer_notes)
    values (p_placement, 'approved', 'scheduled', v_hash, auth.uid(), 'Manual supervised scheduling');
end $$;

alter table public.social_campaigns enable row level security;
alter table public.social_platform_accounts enable row level security;
alter table public.social_research_sources enable row level security;
alter table public.social_research_claims enable row level security;
alter table public.social_creative_units enable row level security;
alter table public.social_creative_claims enable row level security;
alter table public.social_placements enable row level security;
alter table public.social_compliance_verdicts enable row level security;
alter table public.social_approval_events enable row level security;
alter table public.social_placement_metrics_daily enable row level security;
alter table public.social_revenue_cohorts enable row level security;
alter table public.social_decision_log enable row level security;
alter table public.social_engagement_queue enable row level security;
revoke all on all tables in schema public from veltex_100s_reviewer, veltex_100s_operator;
grant select on public.social_campaigns, public.social_platform_accounts, public.social_research_sources, public.social_research_claims, public.social_creative_units, public.social_creative_claims, public.social_placements, public.social_compliance_verdicts, public.social_approval_events, public.social_placement_metrics_daily, public.social_revenue_cohorts, public.social_decision_log, public.social_engagement_queue to veltex_100s_reviewer;
grant execute on function public.social_approve_placement(uuid, text) to authenticated;
grant execute on function public.social_schedule_placement(uuid, timestamptz) to authenticated;

comment on table public.social_campaigns is '100S campaign kill switch: active and publishing_enabled default false.';
comment on table public.social_approval_events is 'Append-only evidence of supervised review transitions.';
