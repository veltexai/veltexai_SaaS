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
 * The quick flow's default design.
 *
 * Prefers Executive Premium so the generated content structure matches the
 * premium renderer, but only ever returns a template the user is entitled to —
 * a locked default would be pre-selected and un-deselectable in the picker, and
 * would be rejected by the server guard on generate. Falls back to the first
 * accessible template, and to `undefined` when the user has access to none.
 */
export function pickQuickDesignTemplate<T extends DesignTemplateCandidate>(
  templates: T[],
  requestedType?: string,
): T | undefined {
  const accessible = templates.filter((template) => template.hasAccess);

  // The demo hint is never an entitlement: resolve it only within accessible designs.
  const requested = requestedType && ["basic", "executive_premium", "modern_corporate", "luxury_elite"].includes(requestedType)
    ? accessible.find((t) => t.name?.toLowerCase().replace(/[ -]+/g, "_") === requestedType)
    : undefined;
  return requested || accessible.find(isExecutivePremium) || accessible[0];
}
