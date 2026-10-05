import { notFound, redirect } from 'next/navigation';
import { CatalogWorkbench } from '@/features/service-catalog/components/workbench';
import { getUser } from '@/features/auth/services/get-user';
import { createClient } from '@/lib/supabase/server';
import { isCrmWorkspaceEnabled } from '@/features/crm/rollout';
import Link from 'next/link';

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
  const board = data as { caller_role?: string;
    opportunities?: Array<{ id: string; name: string; property_id?: string; segment?: string }>;
    work_packages?: Array<{ id: string; opportunity_id: string; property_id: string;
      status: string; updated_at: string }>;
    properties?: Array<{ id: string; customer_id?: string; name: string }>;
    customers?: Array<{ id: string; name: string }> };
  if (!['owner', 'admin', 'estimator'].includes(board.caller_role ?? '')) notFound();
  const opportunity = board.opportunities?.find((item) => item.id === opportunityId);
  if (!opportunity?.property_id) notFound();
  if (!['residential', 'turnover'].includes(opportunity.segment ?? '')) {
    return <main className="mx-auto max-w-2xl space-y-4 rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-semibold">This opportunity cannot use the current estimator</h1>
      <p>The current deterministic pricing model is limited to residential and short-term-rental work. Your commercial or specialty workflow remains available in CRM, but Veltex will not disguise it as a residential job or save a misleading price.</p>
      <Link className="underline" href="/dashboard/crm">Return to CRM</Link>
    </main>;
  }
  const workPackage = query.packageId
    ? board.work_packages?.find((item) => item.id === query.packageId
      && item.opportunity_id === opportunityId && item.property_id === opportunity.property_id)
    : undefined;
  if (query.packageId && !workPackage) notFound();
  if (workPackage && !['scoping', 'walkthrough_scheduled', 'estimated'].includes(workPackage.status)) {
    return <main className="mx-auto max-w-2xl space-y-4 rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-semibold">This work package cannot be estimated</h1>
      <p>Proposed, accepted and declined packages are locked against estimate regression. Return to CRM to review the current package status and latest estimate summary.</p>
      <Link className="underline" href="/dashboard/crm">Return to CRM</Link>
    </main>;
  }
  const property = board.properties?.find((item) => item.id === opportunity.property_id);
  const customer = property?.customer_id
    ? board.customers?.find((item) => item.id === property.customer_id) : undefined;
  return <CatalogWorkbench initialJobType={opportunity.segment === 'turnover'
    ? 'airbnb_turnover' : 'recurring_standard'} crmEstimateContext={{ organizationId: query.organizationId,
    opportunityId, propertyId: opportunity.property_id, opportunityName: opportunity.name,
    customerName: customer?.name, propertyName: property?.name,
    ...(workPackage ? { workPackageId: workPackage.id,
      expectedPackageUpdatedAt: workPackage.updated_at } : {}) }} />;
}
