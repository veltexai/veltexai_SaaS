import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
import {
  DEFAULT_SCOPE_TEMPLATE_ID,
  QuickProposalFlow,
  getScopeTemplate,
  getScopeTemplateIdForDemo,
  pickQuickDesignTemplate,
} from "@/features/proposals/quick";
import { getUserAccessibleTemplates } from "@/lib/templates/template-service";

export const dynamic = "force-dynamic";

interface QuickProposalPageProps {
  searchParams: Promise<{
    demoType?: string;
    scopeTemplateId?: string;
    source?: string;
  }>;
}

async function getDefaultDesignTemplate() {
  try {
    const templates = await getUserAccessibleTemplates();
    const picked = pickQuickDesignTemplate(templates);
    return picked
      ? { id: picked.id, name: picked.display_name || picked.name }
      : undefined;
  } catch (error) {
    console.error("Quick proposal: failed to load design templates:", error);
    return undefined;
  }
}

export default async function QuickProposalPage({
  searchParams,
}: QuickProposalPageProps) {
  const params = await searchParams;
  const templateIdFromDemo = getScopeTemplateIdForDemo(params.demoType);
  const requestedTemplateId = params.scopeTemplateId || templateIdFromDemo;
  const template =
    getScopeTemplate(requestedTemplateId) ??
    getScopeTemplate(DEFAULT_SCOPE_TEMPLATE_ID)!;
  const designTemplate = await getDefaultDesignTemplate();

  return (
    <QuickProposalFlow
      demoType={params.demoType as DemoType | undefined}
      source={params.source}
      requestedScopeTemplateId={requestedTemplateId}
      template={template}
      usedFallback={template.id !== requestedTemplateId}
      designTemplateId={designTemplate?.id}
      designTemplateName={designTemplate?.name}
    />
  );
}
