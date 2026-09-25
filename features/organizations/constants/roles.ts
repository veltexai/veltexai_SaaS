import type { OrganizationRole } from "../types/organization";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  estimator: "Estimator",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner:
    "Full access, including billing, organization deletion, and transferring ownership.",
  admin: "Manage teammates, roles, and organization-wide settings.",
  estimator: "Create, edit, and send proposals and pricing.",
  viewer: "View proposals and reports without editing.",
};

/**
 * Roles selectable from the invite dialog. Ownership is a single, sensitive
 * seat that is transferred rather than granted at invite time, so it is
 * intentionally excluded here. This exclusion is called out again as an open
 * question in the Codex contract request. Kept as an explicit literal tuple
 * (rather than derived by filtering) so it type-checks cleanly against zod's
 * `z.enum` and so adding a new role never silently becomes invitable.
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
