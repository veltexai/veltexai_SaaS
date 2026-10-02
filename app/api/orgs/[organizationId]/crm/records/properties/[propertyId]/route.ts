import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { propertyRecordSchema } from '@/features/crm/schemas/records';
import { authenticatedCrmContext, crmContextError } from '../../../_shared';
type Context = { params: Promise<{ organizationId: string; propertyId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PUT(request: NextRequest, { params }: Context) {
  const { organizationId, propertyId } = await params; const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create') || !UUID.test(propertyId)) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  let json: unknown; try { json = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = propertyRecordSchema.safeParse(json); if (!parsed.success) return NextResponse.json({ error: 'Invalid property.', issues: parsed.error.flatten() }, { status: 400 });
  const v = parsed.data; const { data, error } = await context.supabase.rpc('save_crm_property_record', {
    p_organization: context.organizationId, p_property: propertyId, p_expected_updated_at: v.expectedUpdatedAt ?? null,
    p_customer: v.customerId ?? null, p_name: v.name, p_address_line_1: v.addressLine1 ?? null,
    p_address_line_2: v.addressLine2 ?? null, p_city: v.city ?? null, p_region: v.region ?? null,
    p_postal_code: v.postalCode ?? null, p_country_code: v.countryCode, p_timezone: v.timezone ?? null,
    p_owner_name: v.ownerName ?? null,
  });
  if (error) return NextResponse.json({ error: error.code === '40001' ? 'This property changed. Reload before saving.' : error.code === '42501' ? 'CRM workspace not found.' : 'Unable to save property.' }, { status: error.code === '40001' ? 409 : error.code === '42501' ? 404 : 422 });
  const result = Array.isArray(data) ? data[0] : data; return NextResponse.json({ data: result }, { status: result?.created ? 201 : 200 });
}
