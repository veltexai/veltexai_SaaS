import { redirect, notFound } from 'next/navigation';
import { getUser } from '@/features/auth/services/get-user';
import { createClient } from '@/lib/supabase/server';
import { getUserAccessibleTemplates } from '@/lib/templates/template-service';
import { pickQuickDesignTemplate } from '@/features/proposals/quick';
import { CatalogWorkbench } from '@/features/service-catalog/components/workbench';
import { jobTypeSchema } from '@/features/service-catalog/schema';
import { isCatalogProposal } from '@/features/service-catalog/proposal';
import { proposalFormSchema } from '@/features/proposals/schemas/proposal';

export const dynamic = 'force-dynamic';
export default async function CategoryProposalPage({ searchParams }: { searchParams: Promise<{ id?: string; job?: string; demo?: string; source?: string; demoType?: string; designTemplateType?: string; templateId?: string }> }) {
  const params = await searchParams;
  const { user } = await getUser();
  if (!user) redirect(`/auth/login?redirectTo=${encodeURIComponent('/dashboard/proposals/category?' + new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string')).toString())}`);
  if (params.id) {
    const db = await createClient();
    const { data, error } = await db.from('proposals').select('*').eq('id', params.id).eq('user_id', user.id).single();
    if (error || !data || !isCatalogProposal(data)) notFound();
    const proposal = proposalFormSchema.parse({ ...data, template_id: data.template_id ?? undefined });
    return <CatalogWorkbench initialProposal={proposal} proposalId={params.id} />;
  }
  const templates = await getUserAccessibleTemplates();
  const template = templates.find(t => t.id === params.templateId) ?? pickQuickDesignTemplate(templates, params.designTemplateType);
  const job = jobTypeSchema.safeParse(params.job);
  return <CatalogWorkbench source={params.source} demoType={params.demoType} templateId={template?.id} initialJobType={job.success ? job.data : undefined} demo={params.demo === '1'} />;
}
