import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260925002000_r2_organization_tenancy.sql',
  ),
  'utf8',
);
const remediation = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260925003000_r2_claude_security_remediation.sql',
  ),
  'utf8',
);
const secondRemediation = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260925004000_r2_second_security_remediation.sql',
  ),
  'utf8',
);
const thirdRemediation = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260925005000_r2_third_security_remediation.sql',
  ),
  'utf8',
);
const sendRoute = fs.readFileSync(
  path.join(process.cwd(), 'app/api/proposals/[id]/send/route.ts'),
  'utf8',
);

describe('R2 tenancy migration contract', () => {
  it('binds authorization helpers to auth.uid instead of a user parameter', () => {
    expect(migration).toContain('m.user_id = auth.uid()');
    expect(migration).not.toMatch(/is_organization_member\([^)]*user/i);
    expect(migration).not.toMatch(/organization_role\([^)]*user/i);
  });

  it('keeps legacy attribution while adding mandatory proposal tenancy', () => {
    expect(migration).toContain(
      'alter table public.proposals add column organization_id',
    );
    expect(migration).toContain(
      'alter table public.proposals alter column organization_id set not null',
    );
    expect(migration).not.toContain('drop column user_id');
    expect(migration).toContain('alter table public.company_profiles alter column organization_id set not null');
    expect(migration).toContain('alter table public.user_branding_settings alter column organization_id set not null');
  });

  it('makes infrastructure records non-writable by browser roles', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on public.organization_audit_log from anon, authenticated',
    );
    expect(migration).toContain(
      'revoke all on public.organization_event_outbox from public, anon, authenticated',
    );
    expect(migration).toContain(
      'revoke all on public.organization_event_inbox from public, anon, authenticated',
    );
  });

  it('prevents tenant reassignment and preserves at least one owner', () => {
    expect(migration).toContain('organization ownership cannot be changed in place');
    expect(migration).toContain('organization must retain at least one owner');
    expect(migration).toContain('only an owner can grant owner role');
    expect(migration).toContain('only an owner can revoke owner role');
  });

  it('writes audit and outbox records in the source transaction', () => {
    expect(migration).toContain('create function public.record_organization_change()');
    expect(migration).toContain('insert into public.organization_audit_log');
    expect(migration).toContain('insert into public.organization_event_outbox');
  });

  it('replaces the legacy restrictive creator-only guards with tenant guards', () => {
    expect(migration).toContain('drop policy if exists catalog_owner_guard on public.proposals');
    expect(migration).toContain('public.is_organization_member(organization_id)');
    expect(migration).toContain('drop policy if exists catalog_owner_guard on public.proposal_tracking');
    expect(migration).toContain('drop policy if exists catalog_owner_guard on public.proposal_views');
  });
});

describe('R2 Claude security remediation contract', () => {
  it('keeps team membership mutation fail-closed', () => {
    expect(remediation).toContain('drop policy if exists memberships_manager_insert');
    expect(remediation).toContain(
      'revoke insert, update, delete, truncate on public.organization_memberships',
    );
    expect(remediation).toContain(
      'team memberships are disabled until invitation consent and seat billing ship',
    );
  });

  it('allows deletion of an empty private bootstrap tenant without weakening work retention', () => {
    expect(remediation).toContain('create or replace function public.delete_empty_private_organization()');
    expect(remediation).toContain('before delete on public.profiles');
    expect(remediation).toContain('delete from public.organization_audit_log');
  });

  it('serializes final-owner checks and removes viewer access to raw proposal costs', () => {
    expect(remediation).toContain(
      'perform 1 from public.organizations where id = tenant_id for update',
    );
    expect(remediation).toContain(
      'using (public.can_edit_organization_work(organization_id))',
    );
  });

  it('inherits tenant boundaries for exports and proposal add-ons', () => {
    expect(remediation).toContain('drop policy if exists "Users can create own pdf exports"');
    expect(remediation).toContain('create policy proposal_addons_organization_insert');
    expect(remediation).toContain('where p.id = proposal_id and public.can_edit_organization_work');
  });

  it('uses the organization billing owner for tracked paid access', () => {
    expect(remediation).toContain('join public.organizations o on o.id = p.organization_id');
    expect(remediation).toContain('where s.user_id = o.created_by');
  });

  it('suppresses anonymous counter noise and records membership role transitions', () => {
    expect(remediation).toContain("auth.uid() is null");
    expect(remediation).toContain("'old_role'");
    expect(remediation).toContain("'new_role'");
  });

  it('revokes destructive infrastructure and tracking operations', () => {
    expect(remediation).toContain(
      'revoke insert, update, delete, truncate on public.proposal_tracking from anon, authenticated',
    );
    expect(remediation).toContain(
      'revoke insert, update, delete, truncate on public.organization_audit_log',
    );
  });
});

describe('R2 second security remediation contract', () => {
  it('restores tenant-safe tracking inserts while retaining destructive denial', () => {
    expect(secondRemediation).toContain(
      'create policy proposal_tracking_organization_insert',
    );
    expect(secondRemediation).toContain(
      'where p.id = proposal_id and public.can_edit_organization_work',
    );
    expect(secondRemediation).toContain(
      'revoke update, delete, truncate on public.proposal_tracking',
    );
    expect(sendRoute).not.toContain('.eq("user_id", user.id)');
    expect(sendRoute).toContain('.eq("organization_id", proposal.organization_id)');
  });

  it('binds cleanup exceptions to nested triggers rather than a spoofable setting alone', () => {
    expect(secondRemediation).toContain('pg_trigger_depth() >= 2');
    expect(secondRemediation).toContain("current_setting('r2.private_cleanup', true)");
  });

  it('uses organization identity for public tracked-link branding', () => {
    expect(secondRemediation).toContain(
      'left join public.company_profiles c on c.organization_id=p.organization_id',
    );
    expect(secondRemediation).not.toContain(
      'left join public.company_profiles c on c.user_id=p.user_id',
    );
  });

  it('denies viewer access to raw service costs and direct tenant lifecycle writes', () => {
    expect(secondRemediation).toContain(
      'using (public.can_edit_organization_work(organization_id))',
    );
    expect(secondRemediation).toContain(
      'revoke insert, delete, truncate on public.organizations',
    );
  });

  it('gives outbox events a monotonic delivery sequence', () => {
    expect(secondRemediation).toContain(
      'event_sequence bigint generated always as identity',
    );
    expect(secondRemediation).toContain('(available_at, event_sequence)');
  });
});

describe('R2 third security remediation contract', () => {
  it('defers the two circular private-account references without cascading profiles', () => {
    expect(thirdRemediation).toContain('on delete no action deferrable initially deferred');
    expect(thirdRemediation).not.toContain('on delete cascade;');
    expect(thirdRemediation).toContain('delete from public.organizations where id = tenant_id');
  });

  it('requires every organization to commit with its creator as owner', () => {
    expect(thirdRemediation).toContain('create constraint trigger require_organization_owner_on_commit');
    expect(thirdRemediation).toContain('deferrable initially deferred');
    expect(thirdRemediation).toContain("m.user_id = new.created_by");
    expect(thirdRemediation).toContain("m.role = 'owner'");
  });

  it('suppresses pure delivery telemetry regardless of recipient auth state', () => {
    expect(thirdRemediation).toContain("tg_table_name = 'proposals' and tg_op = 'UPDATE'");
    expect(thirdRemediation).not.toContain("auth.uid() is null");
  });
});
