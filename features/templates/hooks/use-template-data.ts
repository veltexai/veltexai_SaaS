import { useMemo } from "react";
import { TemplateProps } from "../template-renderer";
import { ScopeRow } from "../utils/split-scope-rows";
import { useSplitContent } from "./use-split-content";
import { getScopeRowChunks } from "../utils/paginate-scope-rows";

interface BrandingData {
  logoUrl: string | null;
  phone: string | null;
  website: string | null;
  companyName: string;
  email: string | null;
}

interface UseTemplateDataReturn {
  branding: BrandingData;
  preparedFor: string;
  content: ReturnType<typeof useSplitContent>;
  scopeRowChunks: ScopeRow[][];
  hasAdditionalScopePages: boolean;
}

export function useTemplateData(
  proposal: TemplateProps["proposal"],
  branding: TemplateProps["branding"],
  pages: TemplateProps["pages"],
  print: TemplateProps["print"],
): UseTemplateDataReturn {
  const resolvedBranding: BrandingData = {
    logoUrl: branding?.logo_url ?? null,
    phone: branding?.phone ?? null,
    website: branding?.website ?? null,
    companyName: branding?.name ?? "Company",
    email: branding?.email ?? null,
  };

  const preparedFor =
    proposal.client_company || proposal.client_name || "Client";

  const splitContent = useSplitContent(proposal.id);

  const content =
    print && pages
      ? ({
          data: null,
          pages,
          templateType: undefined,
          byTitle: new Map(),
          get: () => undefined,
          getAny: () => undefined,
          about: { id: "about", content: pages[0] },
          commitment: { id: "commitment", content: pages[1] },
          whyUs: { id: "whyUs", content: pages[2] },
          scope: { id: "scope", content: pages[3] },
          addons: { id: "addons", content: pages[4] },
          pricing: { id: "pricing", content: pages[5] },
          notes: { id: "notes", content: pages[6] },
          loading: false,
          error: null,
        } as const satisfies ReturnType<typeof useSplitContent>)
      : splitContent;

  // First page: ~12 rows (with title, description)
  const scopeRowChunks = useMemo(
    () => getScopeRowChunks(content?.scope?.content, 12, 14),
    [content?.scope?.content],
  );

  return {
    branding: resolvedBranding,
    preparedFor,
    content,
    scopeRowChunks,
    hasAdditionalScopePages: scopeRowChunks.length > 1,
  };
}
