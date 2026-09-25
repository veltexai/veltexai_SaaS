import type { OrganizationRole } from "../domain";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  estimator: "Estimator",
  viewer: "Viewer",
};

/**
 * Neutral descriptions of behavior actually enforced at backend `d12743a`.
 * Team mutation is disabled for every runtime role. These must not claim
 * organization deletion, ownership transfer, teammate administration,
 * proposal sending, or reports.
 */
export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner:
    "Can view this organization, manage its settings, and edit operational work. Cannot invite teammates or transfer ownership.",
  admin:
    "Can view this organization, manage its settings, and edit operational work. Cannot invite teammates or change ownership.",
  estimator:
    "Can view this organization and edit operational work. Cannot manage organization settings or membership.",
  viewer:
    "Can view this organization's identity. Cannot view proposal pricing or cost details.",
};

/**
 * Roles selectable from the invite dialog. Owner is excluded because
 * ownership transfer is not implemented. Invitations themselves are also
 * disabled until a later accepted contract.
 */
export const INVITABLE_ROLES = [
  "admin",
  "estimator",
  "viewer",
] as const satisfies readonly Exclude<OrganizationRole, "owner">[];

export function getRoleBadgeVariant(
  role: OrganizationRole,
): "default" | "secondary" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "estimator":
    case "viewer":
    default:
      return "outline";
  }
}
