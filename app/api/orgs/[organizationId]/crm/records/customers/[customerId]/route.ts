import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { customerRecordSchema } from '@/features/crm/schemas/records';
import { authenticatedCrmContext, crmContextError } from '../../../_shared';
type Context = { params: Promise<{ organizationId: string; customerId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PUT(request: NextRequest, { params }: Context) {
  const { organizationId, customerId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create') || !UUID.test(customerId))
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  let json: unknown; try { json = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }
  const parsed = customerRecordSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid customer.', issues: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await context.supabase.rpc('save_crm_customer_record', {
    p_organization: context.organizationId, p_customer: customerId,
    p_expected_updated_at: parsed.data.expectedUpdatedAt ?? null,
    p_customer_type: parsed.data.customerType, p_name: parsed.data.name,
  });
  if (error) return NextResponse.json({ error: error.code === '40001' ? 'This customer changed. Reload before saving.' : error.code === '42501' ? 'CRM workspace not found.' : 'Unable to save customer.' }, { status: error.code === '40001' ? 409 : error.code === '42501' ? 404 : 422 });
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ data: result }, { status: result?.created ? 201 : 200 });
}
