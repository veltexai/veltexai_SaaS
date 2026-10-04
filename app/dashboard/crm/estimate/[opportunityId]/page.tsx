import { notFound, redirect } from 'next/navigation';
import { CatalogWorkbench } from '@/features/service-catalog/components/workbench';
import { getUser } from '@/features/auth/services/get-user';
import { createClient } from '@/lib/supabase/server';
import { isCrmWorkspaceEnabled } from '@/features/crm/rollout';

type Props = { params: Promise<{ opportunityId: string }>;
  searchParams: Promise<{ organizationId?: string; packageId?: string }> };

export default async function CrmEstimatePage({ params, searchParams }: Props) {
  if (!isCrmWorkspaceEnabled()) notFound();
  const [{ opportunityId }, query, { user }] = await Promise.all([params, searchParams, getUser()]);
  if (!user) redirect('/auth/login');
  if (!query.organizationId) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('read_crm_pipeline_board', {
    target_organization: query.organizationId,
  });
  if (error || !data || typeof data !== 'object') notFound();
  const board = data as { opportunities?: Array<{ id: string; name: string; property_id?: string }>;
    work_packages?: Array<{ id: string; opportunity_id: string; property_id: string; updated_at: string }>;
    properties?: Array<{ id: string; customer_id?: string; name: string }>;
    customers?: Array<{ id: string; name: string }> };
  const opportunity = board.opportunities?.find((item) => item.id === opportunityId);
  if (!opportunity?.property_id) notFound();
  const workPackage = query.packageId
    ? board.work_packages?.find((item) => item.id === query.packageId
      && item.opportunity_id === opportunityId && item.property_id === opportunity.property_id)
    : undefined;
  if (query.packageId && !workPackage) notFound();
  const property = board.properties?.find((item) => item.id === opportunity.property_id);
  const customer = property?.customer_id
    ? board.customers?.find((item) => item.id === property.customer_id) : undefined;
  return <CatalogWorkbench crmEstimateContext={{ organizationId: query.organizationId,
    opportunityId, propertyId: opportunity.property_id, opportunityName: opportunity.name,
    customerName: customer?.name, propertyName: property?.name,
    ...(workPackage ? { workPackageId: workPackage.id,
      expectedPackageUpdatedAt: workPackage.updated_at } : {}) }} />;
}
