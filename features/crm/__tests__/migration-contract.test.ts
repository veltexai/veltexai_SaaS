import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261001000000_r3_1_crm_foundation.sql'),
  'utf8',
);
const walkthroughEvidenceMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261003000000_r3_2_walkthrough_evidence.sql'),
  'utf8',
);
const estimateLinkageMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261004000000_r3_3_estimate_scenario_linkage.sql'),
  'utf8',
);
const estimateEntryPage = readFileSync(
  resolve(process.cwd(), 'app/dashboard/crm/estimate/[opportunityId]/page.tsx'),
  'utf8',
);

const tenantTables = [
  'crm_customers',
  'crm_contacts',
  'crm_customer_contacts',
  'crm_properties',
  'crm_pipelines',
  'crm_pipeline_stages',
  'crm_loss_reasons',
  'crm_lead_sources',
  'crm_referral_sources',
  'crm_leads',
  'crm_opportunities',
  'crm_walkthroughs',
  'crm_tasks',
  'crm_site_work_packages',
  'crm_opportunity_stage_history',
  'crm_opportunity_stage_commands',
  'crm_task_commands',
  'crm_assignment_commands',
  'crm_lead_commands',
  'crm_attribution_touches',
  'crm_qualification_responses',
];

describe('R3-1 CRM migration contract', () => {
  it('is one atomic additive migration with every scoped table present', () => {
    expect(migration.trim().startsWith('-- R3-1')).toBe(true);
    expect(migration.match(/^begin;$/gim)).toHaveLength(1);
    expect(migration.match(/^commit;$/gim)).toHaveLength(1);
    for (const table of tenantTables) {
      expect(migration).toContain(`create table public.${table} (`);
      expect(migration).toMatch(new RegExp(`['"]${table}['"]`));
    }
  });

  it('requires tenant ownership and enables RLS for all CRM tables', () => {
    expect(migration.match(/organization_id uuid not null references public\.organizations/g))
      .toHaveLength(21);
    expect(migration).toContain("execute format('alter table public.%I enable row level security'");
    expect(migration).toContain("execute format('revoke all on public.%I from public, anon'");
    expect(migration).toContain('public.can_access_crm_opportunity');
    expect(migration).toContain("public.organization_role(organization_id) = 'estimator'");
  });

  it('keeps stage history append-only and blocks unfinished stage gates', () => {
    expect(migration).toContain('opportunity stage history is append-only');
    expect(migration).toContain('won, lost and disqualified stages cannot be deleted');
    expect(migration).toContain('revoke insert, update, delete, truncate on public.crm_opportunity_stage_history');
    expect(migration).toContain('R3-1 manual wins require a reason');
    expect(migration).toContain('manual wins require owner or admin');
    expect(migration).toContain('handoff is unavailable until the reviewed R3-6 workflow');
    expect(migration).toContain('link a sent proposal before moving to this stage');
  });

  it('requires bounded idempotency keys on every command-created workflow row', () => {
    expect(migration.match(/idempotency_key text not null check \(length\(idempotency_key\) between 8 and 200\)/g))
      .toHaveLength(5);
    expect(migration.match(/unique \(organization_id, idempotency_key\)/g)).toHaveLength(5);
  });

  it('moves stages through one caller-bound idempotent transaction', () => {
    expect(migration).toContain('create table public.crm_opportunity_stage_commands (');
    expect(migration).toContain('unique (organization_id, command_key)');
    expect(migration).toContain('create function public.move_crm_opportunity_stage(');
    expect(migration).toContain('for update;');
    expect(migration).toContain('idempotency key was already used for another transition');
    expect(migration).toContain('not public.can_access_crm_opportunity(target_opportunity)');
    expect(migration).toContain('revoke all on function public.move_crm_opportunity_stage');
  });

  it('converts a lead atomically without retyping or duplicating selected records', () => {
    expect(migration).toContain('create function public.convert_crm_lead(');
    expect(migration).toContain('for update;');
    expect(migration).toContain("if source_lead.status = 'converted' then");
    expect(migration).toContain("p_segment, 'lead_conversion', auth.uid(), auth.uid()");
    expect(migration).toContain('p_existing_customer is not null');
    expect(migration).toContain('p_existing_contact is not null');
    expect(migration).toContain('p_existing_property is not null');
    expect(migration).toContain("and s.category = 'new' and not s.hidden");
    expect(migration).toContain("status = 'converted', converted_customer_id = v_customer");
    expect(migration).toContain('revoke all on function public.convert_crm_lead');
  });

  it('serializes walkthrough scheduling and refuses estimator overlap', () => {
    expect(migration).toContain('create function public.schedule_crm_walkthrough(');
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock(');
    expect(migration).toContain("w.status in ('scheduled', 'rescheduled')");
    expect(migration).toContain('w.window_start < p_window_end and w.window_end > p_window_start');
    expect(migration).toContain("using errcode = '23P01'");
    expect(migration).toContain('idempotency key was already used for another walkthrough');
    expect(migration).toContain('revoke all on function public.schedule_crm_walkthrough');
  });

  it('records idempotent task completion and snooze commands', () => {
    expect(migration).toContain('create table public.crm_task_commands (');
    expect(migration).toContain("action text not null check (action in ('complete', 'snooze'))");
    expect(migration).toContain('create function public.command_crm_task(');
    expect(migration).toContain("current_task.assignee_user_id = auth.uid()");
    expect(migration).toContain("if current_task.status <> 'open' then");
    expect(migration).toContain("status = 'completed', completed_at = now()");
    expect(migration).toContain('idempotency key was already used for another task command');
    expect(migration).toContain('revoke all on function public.command_crm_task');
  });

  it('restricts assignment and optional task transfer to organization managers', () => {
    expect(migration).toContain('create table public.crm_assignment_commands (');
    expect(migration).toContain('create function public.assign_crm_opportunity(');
    expect(migration).toContain('not public.can_manage_organization(p_organization)');
    expect(migration).toContain("m.role in ('owner', 'admin', 'estimator')");
    expect(migration).toContain('p_transfer_open_tasks and p_estimator is not null');
    expect(migration).toContain('assignee_user_id = p_estimator');
    expect(migration).toContain('idempotency key was already used for another assignment');
    expect(migration).toContain('revoke all on function public.assign_crm_opportunity');
  });

  it('reactivates a terminal cycle as a new qualifying opportunity without terminal state', () => {
    expect(migration).toContain('create function public.reactivate_crm_opportunity(');
    expect(migration).toContain("prior_category not in ('won', 'lost', 'disqualified', 'nurture')");
    expect(migration).toContain("s.category = 'qualifying' and not s.hidden");
    expect(migration).toContain("prior_opportunity.id, prior_opportunity.is_parent, 'reactivation'");
    expect(migration).toContain("package.property_id, 'scoping'");
    expect(migration).not.toMatch(/reactivate_crm_opportunity[\s\S]*prior_opportunity\.acceptance_method/);
    expect(migration).not.toMatch(/reactivate_crm_opportunity[\s\S]*prior_opportunity\.value_amount_minor/);
    expect(migration).toContain('revoke all on function public.reactivate_crm_opportunity');
  });

  it('configures stages only through the manager-bound absolute-state RPC', () => {
    expect(migration).toContain('create function public.configure_crm_pipeline_stage(');
    expect(migration).toContain('not public.can_manage_organization(p_organization)');
    expect(migration).toContain("p_hidden and p_category in ('won', 'lost', 'disqualified')");
    expect(migration).toContain('current_stage.pipeline_id is distinct from p_pipeline');
    expect(migration).toContain('grant execute on function public.configure_crm_pipeline_stage(');
  });

  it('updates opportunity details with assigned scope and optimistic concurrency', () => {
    expect(migration).toContain('create function public.update_crm_opportunity_details(');
    expect(migration).toContain('not public.can_access_crm_opportunity(p_opportunity)');
    expect(migration).toContain('current_opportunity.updated_at is distinct from p_expected_updated_at');
    expect(migration).toContain("using errcode = '40001'");
    expect(migration).toContain('grant execute on function public.update_crm_opportunity_details(');
  });

  it('saves manual customer, contact, and property records with retry-safe IDs', () => {
    for (const name of ['customer', 'contact', 'property']) {
      expect(migration).toContain(`create function public.save_crm_${name}_record(`);
      expect(migration).toContain(`grant execute on function public.save_crm_${name}_record(`);
    }
    expect(migration).toContain('not public.can_edit_organization_work(p_organization)');
    expect(migration).toContain('current_record.updated_at is distinct from p_expected_updated_at');
    expect(migration).toContain('c.organization_id=p_organization and c.id=p_customer');
    expect(migration).toContain('create function public.create_crm_account_bundle(');
    expect(migration).toContain("p_customer, p_contact, 'decision_maker', true, auth.uid()");
  });

  it('records append-only qualification and atomically disqualifies not-fit opportunities', () => {
    expect(migration).toContain('create function public.qualify_crm_opportunity(');
    expect(migration).toContain("p_outcome = 'not_fit' and p_loss_reason is null");
    expect(migration).toContain("s.category='disqualified' and not s.hidden");
    expect(migration).toContain('perform * from public.move_crm_opportunity_stage(');
    expect(migration).toContain("'needs_follow_up', (");
  });

  it('runs lead lifecycle changes through private idempotent receipts', () => {
    expect(migration).toContain('create table public.crm_lead_commands (');
    expect(migration).toContain('create function public.command_crm_lead(');
    expect(migration).toContain("p_action='merged' and (p_merged_into_lead is null");
    expect(migration).toContain("p_action='disqualified' then");
    expect(migration).toContain("'leads', (select value from leads)");
  });

  it('implements a caller-bound site work package state machine', () => {
    expect(migration).toContain('create function public.save_crm_site_work_package(');
    expect(migration).toContain("p_status not in ('scoping','walkthrough_scheduled','estimated','proposed','accepted','declined')");
    expect(migration).toContain("p_status='accepted' and not exists");
    expect(migration).toContain('current_package.updated_at<>p_expected_updated_at');
    expect(migration).toContain("'work_packages', (select value from work_packages)");
    expect(migration).toContain('revoke all on function public.save_crm_site_work_package(');
  });

  it('creates direct opportunities with a hidden converted attribution lead', () => {
    expect(migration).toContain('create function public.create_crm_direct_opportunity(');
    expect(migration).toContain("'converted','direct_opportunity'");
    expect(migration).toContain('update public.crm_leads set converted_opportunity_id=p_opportunity');
    expect(migration).toContain("s.category='new' and not s.hidden");
    expect(migration).toContain("'customers', (select value from customers)");
    expect(migration).toContain("'properties', (select value from properties)");
  });

  it('emits reviewed ID-only CRM domain events through the shared outbox', () => {
    expect(migration).toContain('create function public.record_crm_change()');
    for (const event of [
      'lead.created', 'lead.converted', 'lead.disqualified', 'lead.junked', 'lead.merged',
      'customer.created', 'contact.created', 'property.created', 'opportunity.created',
      'opportunity.stage_changed', 'opportunity.owner_changed', 'opportunity.estimator_changed',
      'opportunity.won', 'opportunity.lost', 'opportunity.disqualified',
      'opportunity.reactivated', 'work_package.status_changed', 'walkthrough.scheduled',
      'walkthrough.rescheduled', 'walkthrough.cancelled', 'task.created', 'task.completed',
    ]) expect(migration).toContain(`'${event}'`);
    expect(migration).toContain("jsonb_build_object('record_id',record_id)");
    expect(migration).toContain('execute function public.record_crm_change()');
    expect(migration).not.toContain('execute function public.record_organization_change()');
  });

  it('projects the board through a caller-bound redacted RPC', () => {
    expect(migration).toContain('create function public.read_crm_pipeline_board(target_organization uuid)');
    expect(migration).toContain("public.organization_role(target_organization) as role");
    expect(migration).toContain("c.role in ('owner', 'admin', 'viewer')");
    expect(migration).toContain("c.role = 'estimator'");
    expect(migration).toContain("case when c.role <> 'viewer' then o.value_amount_minor end");
    expect(migration).toContain("case when c.role <> 'viewer' then o.value_basis end");
    expect(migration).toContain("case when c.role <> 'viewer' then o.currency end");
    expect(migration).toContain("case when c.role='viewer' then 'Opportunity' else o.name end");
    expect(migration).toContain("case when c.role<>'viewer' then o.property_id end");
    expect(migration).toContain("case when c.role<>'viewer' then o.owner_user_id end");
    expect(migration).toContain("case when c.role<>'viewer' then o.estimator_user_id end");
    expect(migration).toContain("c.role='estimator' and (x.created_by=auth.uid()");
    expect(migration).toContain("c.role='estimator' and (p.created_by=auth.uid()");
    expect(migration).toContain("o.owner_user_id=auth.uid() or o.estimator_user_id=auth.uid()");
    expect(migration).toContain("'caller_role', (select role from caller)");
    expect(migration).toContain("'loss_reasons', (select value from loss_reasons)");
    expect(migration).toContain("'assignable_members', (select value from assignable_members)");
    expect(migration).toContain("and c.role in ('owner', 'admin')");
    expect(migration).toContain('revoke all on function public.read_crm_pipeline_board(uuid) from public, anon');
    expect(migration).toContain('grant execute on function public.read_crm_pipeline_board(uuid) to authenticated, service_role');
  });

  it('seeds both templates and all eleven canonical categories', () => {
    expect(migration).toContain("'commercial_facility_v1'");
    expect(migration).toContain("'residential_turnover_v1'");
    for (const category of [
      'new', 'qualifying', 'walkthrough', 'estimating', 'proposing', 'negotiating',
      'won', 'handed_off', 'lost', 'disqualified', 'nurture',
    ]) {
      expect(migration).toContain(`'${category}'`);
    }
    expect(migration).toContain('is_unvalidated_default boolean not null default true');
  });

  it('adds nullable proposal links without rewriting proposal rows or content', () => {
    expect(migration).toContain('alter table public.proposals add column crm_opportunity_id uuid');
    expect(migration).toContain('alter table public.proposals add column crm_customer_id uuid');
    expect(migration).toContain('alter table public.proposals add column crm_property_id uuid');
    expect(migration).not.toMatch(/update\s+public\.proposals/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.proposals/i);
    expect(migration).not.toMatch(/alter\s+column\s+(generated_content|pricing_data|tracking_token)/i);
  });

  it('does not introduce out-of-scope automation or touch isolated systems', () => {
    expect(migration).not.toMatch(/marketing_attribution|marketing_funnel_events/);
    expect(migration).not.toMatch(/stripe|billing_history|subscription/i);
    expect(migration).not.toMatch(/(?:create|alter|drop|insert into|update|delete from)\s+(?:table\s+)?public\.(?:organization_invitations|ai_suggestions)/i);
    expect(migration).not.toMatch(/100d/i);
    expect(migration).not.toMatch(/sales_manager/);
  });
});

describe('R3-3 estimate linkage migration contract', () => {
  it('keeps unsupported segments and later package states out of the estimator entry page', () => {
    expect(estimateEntryPage).toContain("!['residential', 'turnover'].includes(opportunity.segment ?? '')");
    expect(estimateEntryPage).toContain("!['scoping', 'walkthrough_scheduled', 'estimated'].includes(workPackage.status)");
    expect(estimateEntryPage).toContain('Proposed, accepted and declined packages are locked');
    expect(estimateEntryPage).toContain("opportunity.segment === 'turnover'");
    expect(estimateEntryPage).toContain("? 'airbnb_turnover' : 'recurring_standard'");
  });

  it('prevents the legacy package command from regressing estimate and terminal lifecycle state', () => {
    expect(estimateLinkageMigration).toContain("old.status='estimated' and new.status not in ('estimated','proposed','declined')");
    expect(estimateLinkageMigration).toContain("old.status='proposed' and new.status not in ('proposed','accepted','declined')");
    expect(estimateLinkageMigration).toContain("old.status in ('accepted','declined') and new.status<>old.status");
    expect(estimateLinkageMigration).toContain("package lifecycle cannot be regressed");
  });

  it('is atomic, additive, append-only, tenant-bound, and engine-version allowlisted', () => {
    expect(estimateLinkageMigration.match(/^begin;$/gim)).toHaveLength(1);
    expect(estimateLinkageMigration.match(/^commit;$/gim)).toHaveLength(1);
    expect(estimateLinkageMigration).toContain('create table public.crm_estimate_runs (');
    expect(estimateLinkageMigration).toContain('unique(organization_id,request_key)');
    expect(estimateLinkageMigration).toContain("p_engine_key<>'service_catalog'");
    expect(estimateLinkageMigration).toContain("p_engine_version<>'2026-09-22.2'");
    expect(estimateLinkageMigration).toContain("check(status<>'estimated' or estimate_run_id is not null)");
    expect(estimateLinkageMigration).toContain('from public,anon,authenticated,service_role');
    expect(estimateLinkageMigration).not.toMatch(/grant\s+(insert|update|delete).*crm_estimate_runs.*authenticated/i);
  });
  it('allowlists supported opportunity/snapshot pairs and guards values, replay, concurrency, and ID-only events', () => {
    expect(estimateLinkageMigration).toContain("coalesce(opportunity_row.segment,'') not in ('residential','turnover')");
    expect(estimateLinkageMigration).toContain("when 'turnover' then 'short_term_rental'");
    expect(estimateLinkageMigration).toContain("p_input_snapshot->>'segment' is distinct from");
    expect(estimateLinkageMigration).toContain('create function public.command_crm_estimate_run_internal(');
    expect(estimateLinkageMigration).toContain(') from public,anon,authenticated;');
    expect(estimateLinkageMigration).toContain(') to service_role;');
    expect(estimateLinkageMigration).toContain("p_input_snapshot ?| array['access','scheduling','scopeAdditions','coverLetter','companyName','operatorNotes']");
    expect(estimateLinkageMigration).toContain("(p_input_snapshot#>'{turnover}') ? 'restockList'");
    expect(estimateLinkageMigration).toContain('foreign key(organization_id,id,opportunity_id,property_id,estimate_run_id)');
    expect(estimateLinkageMigration).toContain('round(selected_value*100)::bigint<>p_selected_amount_minor');
    expect(estimateLinkageMigration).toContain("raise exception 'estimate key already used'");
    expect(estimateLinkageMigration).toContain("raise exception 'site work package changed'");
    expect(estimateLinkageMigration).toContain("jsonb_build_object('record_id',new_run_id::text)");
  });
});

describe('R3-2 walkthrough evidence migration contract', () => {
  it('is atomic, additive, bounded, and keeps photos out pending privacy review', () => {
    expect(walkthroughEvidenceMigration.match(/^begin;$/gim)).toHaveLength(1);
    expect(walkthroughEvidenceMigration.match(/^commit;$/gim)).toHaveLength(1);
    expect(walkthroughEvidenceMigration).toContain('add column if not exists evidence_notes text');
    expect(walkthroughEvidenceMigration).toContain("'completed'" );
    expect(walkthroughEvidenceMigration).not.toMatch(/storage\.objects|storage\.buckets|photo|attachment/i);
    expect(walkthroughEvidenceMigration).not.toMatch(/access_code|door_code|alarm_code/i);
  });

  it('uses an authorization-first idempotent command with optimistic concurrency', () => {
    expect(walkthroughEvidenceMigration).toContain('create table public.crm_walkthrough_evidence_commands(');
    expect(walkthroughEvidenceMigration).toContain('create function public.command_crm_walkthrough_evidence(');
    expect(walkthroughEvidenceMigration.indexOf('select w.* into current_row'))
      .toBeLessThan(walkthroughEvidenceMigration.indexOf('select c.* into existing'));
    expect(walkthroughEvidenceMigration).toContain("current_row.estimator_user_id=auth.uid()");
    expect(walkthroughEvidenceMigration).toContain('current_row.updated_at is distinct from p_expected_updated_at');
    expect(walkthroughEvidenceMigration).toContain("using errcode='40001'");
    expect(walkthroughEvidenceMigration).toContain('walkthrough evidence key already used');
    expect(walkthroughEvidenceMigration).toContain('walkthrough evidence is already final');
    expect(walkthroughEvidenceMigration).toContain("public.organization_role(p_organization)='estimator'");
    expect(walkthroughEvidenceMigration).toContain('w.estimator_user_id=auth.uid()');
  });

  it('keeps receipts private and emits only ID-only evidence events', () => {
    expect(walkthroughEvidenceMigration).toContain(
      'revoke all on public.crm_walkthrough_evidence_commands from public,anon,authenticated',
    );
    expect(walkthroughEvidenceMigration).toContain("'walkthrough.completed'");
    expect(walkthroughEvidenceMigration).toContain("'walkthrough.evidence_saved'");
    expect(walkthroughEvidenceMigration).toContain("jsonb_build_object('record_id',new.id::text)");
    expect(walkthroughEvidenceMigration).not.toMatch(/jsonb_build_object\([^)]*evidence_notes/);
  });

  it('removes direct evidence-column reads while preserving the guarded operational projection', () => {
    expect(walkthroughEvidenceMigration).toContain(
      'revoke select on public.crm_walkthroughs from authenticated',
    );
    expect(walkthroughEvidenceMigration).toContain('grant select (');
    expect(walkthroughEvidenceMigration).toContain('created_at,updated_at');
    expect(walkthroughEvidenceMigration).toContain(
      'and public.can_access_crm_opportunity(w.opportunity_id)',
    );
    expect(walkthroughEvidenceMigration).toContain('then w.evidence_notes else null end');
    expect(walkthroughEvidenceMigration).toContain(
      'or new.evidence_completed_at is distinct from old.evidence_completed_at',
    );
  });
});
