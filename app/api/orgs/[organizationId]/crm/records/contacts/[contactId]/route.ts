import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { contactRecordSchema } from '@/features/crm/schemas/records';
import { authenticatedCrmContext, crmContextError } from '../../../_shared';
type Context = { params: Promise<{ organizationId: string; contactId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PUT(request: NextRequest, { params }: Context) {
  const { organizationId, contactId } = await params; const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create') || !UUID.test(contactId)) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  let json: unknown; try { json = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = contactRecordSchema.safeParse(json); if (!parsed.success) return NextResponse.json({ error: 'Invalid contact.', issues: parsed.error.flatten() }, { status: 400 });
  const v = parsed.data; const { data, error } = await context.supabase.rpc('save_crm_contact_record', {
    p_organization: context.organizationId, p_contact: contactId, p_expected_updated_at: v.expectedUpdatedAt ?? null,
    p_first_name: v.firstName ?? null, p_last_name: v.lastName ?? null, p_email: v.email ?? null,
    p_phone: v.phone ?? null, p_preferred_channel: v.preferredChannel ?? null, p_timezone: v.timezone ?? null,
    p_do_not_contact: v.doNotContact, p_do_not_contact_reason: v.doNotContactReason ?? null,
  });
  if (error) return NextResponse.json({ error: error.code === '40001' ? 'This contact changed. Reload before saving.' : error.code === '42501' ? 'CRM workspace not found.' : 'Unable to save contact.' }, { status: error.code === '40001' ? 409 : error.code === '42501' ? 404 : 422 });
  const result = Array.isArray(data) ? data[0] : data; return NextResponse.json({ data: result }, { status: result?.created ? 201 : 200 });
}
