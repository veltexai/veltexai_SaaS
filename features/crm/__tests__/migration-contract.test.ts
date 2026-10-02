import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261001000000_r3_1_crm_foundation.sql'),
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
      .toHaveLength(20);
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

  it('projects the board through a caller-bound redacted RPC', () => {
    expect(migration).toContain('create function public.read_crm_pipeline_board(target_organization uuid)');
    expect(migration).toContain("public.organization_role(target_organization) as role");
    expect(migration).toContain("c.role in ('owner', 'admin', 'viewer')");
    expect(migration).toContain("c.role = 'estimator'");
    expect(migration).toContain("case when c.role <> 'viewer' then o.value_amount_minor end");
    expect(migration).toContain("case when c.role <> 'viewer' then o.value_basis end");
    expect(migration).toContain("case when c.role <> 'viewer' then o.currency end");
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
