import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { accountBundleSchema } from '@/features/crm/schemas/records';
import { authenticatedCrmContext, crmContextError } from '../../_shared';
type Context = { params: Promise<{ organizationId: string }> };
export async function POST(request: NextRequest, { params }: Context) {
  const { organizationId } = await params; const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create')) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  let json: unknown; try { json = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = accountBundleSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid customer account.', issues: parsed.error.flatten() }, { status: 400 });
  const v = parsed.data; const { data, error } = await context.supabase.rpc('create_crm_account_bundle', {
    p_organization: context.organizationId, p_customer: v.customerId, p_contact: v.contactId,
    p_property: v.propertyId, p_customer_type: v.customerType, p_customer_name: v.customerName,
    p_contact_first_name: v.contactFirstName ?? null, p_contact_last_name: v.contactLastName ?? null,
    p_contact_email: v.contactEmail ?? null, p_contact_phone: v.contactPhone ?? null,
    p_property_name: v.propertyName, p_address_line_1: v.addressLine1 ?? null,
    p_city: v.city ?? null, p_region: v.region ?? null, p_postal_code: v.postalCode ?? null,
    p_timezone: v.timezone ?? null,
  });
  if (error || !data) {
    if (error?.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error?.code === '40001' || error?.code === '23505') return NextResponse.json({ error: 'Those record identifiers were already used.' }, { status: 409 });
    return NextResponse.json({ error: 'Unable to create customer account.' }, { status: 422 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ data: result }, { status: 201 });
}
