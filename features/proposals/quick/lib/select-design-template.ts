interface DesignTemplateCandidate {
  id: string;
  name?: string | null;
  display_name?: string | null;
  hasAccess?: boolean;
}

function isExecutivePremium(template: DesignTemplateCandidate) {
  // Same matching rule as detectTemplateType in features/templates/utils.
  const label =
    `${template.display_name ?? ""} ${template.name ?? ""}`.toLowerCase();
  return label.includes("executive") || label.includes("premium");
}

/**
 * The quick flow always prefers the Executive Premium design template so the
 * generated content structure matches the premium renderer. Falls back to the
 * first accessible template, then the first active one.
 */
export function pickQuickDesignTemplate<T extends DesignTemplateCandidate>(
  templates: T[],
): T | undefined {
  return (
    templates.find(isExecutivePremium) ??
    templates.find((template) => template.hasAccess) ??
    templates[0]
  );
}
