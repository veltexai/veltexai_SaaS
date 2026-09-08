import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
import {
  DEFAULT_SCOPE_TEMPLATE_ID,
  QuickProposalFlow,
  getScopeTemplate,
  getScopeTemplateIdForDemo,
  pickQuickDesignTemplate,
} from "@/features/proposals/quick";
import { getUser } from "@/features/auth/services/get-user";
import { getUserAccessibleTemplates } from "@/lib/templates/template-service";
import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/features/auth/constants";
import { buildAuthPathWithRedirect } from "@/features/auth/utils/redirect";

export const dynamic = "force-dynamic";

interface QuickProposalPageProps {
  searchParams: Promise<{
    demoType?: string;
    scopeTemplateId?: string;
    source?: string;
    designTemplateType?: string;
  }>;
}

async function getDefaultDesignTemplate(requestedType?: string) {
  try {
    const templates = await getUserAccessibleTemplates();
    const picked = pickQuickDesignTemplate(templates, requestedType);
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
  const { user } = await getUser();
  const params = await searchParams;

  if (!user) {
    const query = new URLSearchParams();
    for (const key of ["demoType", "scopeTemplateId", "source", "designTemplateType"] as const) {
      if (typeof params[key] === "string") query.set(key, params[key]);
    }
    redirect(buildAuthPathWithRedirect({
      pathname: AUTH_ROUTES.LOGIN,
      redirectTo: `${AUTH_ROUTES.QUICK_PROPOSAL}?${query.toString()}`,
    }));
  }

  const templateIdFromDemo = getScopeTemplateIdForDemo(params.demoType);
  const requestedTemplateId = params.scopeTemplateId || templateIdFromDemo;
  const template =
    getScopeTemplate(requestedTemplateId) ??
    getScopeTemplate(DEFAULT_SCOPE_TEMPLATE_ID)!;
  const designTemplate = await getDefaultDesignTemplate(params.designTemplateType);

  return (
    <QuickProposalFlow
      demoType={params.demoType as DemoType | undefined}
      source={params.source}
      requestedScopeTemplateId={requestedTemplateId}
      template={template}
      usedFallback={template.id !== requestedTemplateId}
      userId={user.id}
      designTemplateId={designTemplate?.id}
      designTemplateName={designTemplate?.name}
    />
  );
}
