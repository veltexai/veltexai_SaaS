import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { OrganizationRole } from '@/features/organizations/domain';
import { isCrmWorkspaceEnabled } from '@/features/crm/rollout';

const organizationIdSchema = z.string().uuid();
const CRM_UNAVAILABLE = 'CRM is unavailable. Please try again.';

export async function authenticatedCrmContext(rawOrganizationId: string) {
  if (!isCrmWorkspaceEnabled()) return { kind: 'not_found' as const };
  const organization = organizationIdSchema.safeParse(rawOrganizationId);
  if (!organization.success) return { kind: 'invalid' as const };

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { kind: 'unauthorized' as const };

  const { data: membership, error: membershipError } = await supabase
    .from('organization_memberships')
    .select('role')
    .eq('organization_id', organization.data)
    .eq('user_id', authData.user.id)
    .maybeSingle();

  if (membershipError) return { kind: 'unavailable' as const };
  if (!membership) return { kind: 'not_found' as const };

  return {
    kind: 'ok' as const,
    organizationId: organization.data,
    role: membership.role as OrganizationRole,
    user: authData.user,
    supabase,
  };
}

export function crmContextError(kind: 'invalid' | 'unauthorized' | 'not_found' | 'unavailable') {
  if (kind === 'invalid') {
    return NextResponse.json({ error: 'Invalid organization.' }, { status: 400 });
  }
  if (kind === 'unauthorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (kind === 'not_found') {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  return NextResponse.json({ error: CRM_UNAVAILABLE }, { status: 503 });
}

export function requireIdempotencyKey(request: Request) {
  const value = request.headers.get('idempotency-key')?.trim();
  if (!value || value.length < 8 || value.length > 200) return null;
  return value;
}
