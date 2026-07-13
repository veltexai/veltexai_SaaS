import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
import {
  DEFAULT_SCOPE_TEMPLATE_ID,
  QuickProposalFlow,
  getScopeTemplate,
  getScopeTemplateIdForDemo,
} from "@/features/proposals/quick";

export const dynamic = "force-dynamic";

interface QuickProposalPageProps {
  searchParams: Promise<{
    demoType?: string;
    scopeTemplateId?: string;
    source?: string;
  }>;
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

  return (
    <QuickProposalFlow
      demoType={params.demoType as DemoType | undefined}
      source={params.source}
      requestedScopeTemplateId={requestedTemplateId}
      template={template}
      usedFallback={template.id !== requestedTemplateId}
    />
  );
}
