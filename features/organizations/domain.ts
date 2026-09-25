export const ORGANIZATION_ROLES = [
  'owner',
  'admin',
  'estimator',
  'viewer',
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const ORGANIZATION_PERMISSIONS = {
  owner: ['organization:read', 'organization:manage', 'members:manage', 'work:read', 'work:write', 'audit:read'],
  admin: ['organization:read', 'organization:manage', 'members:manage', 'work:read', 'work:write', 'audit:read'],
  estimator: ['organization:read', 'work:read', 'work:write'],
  viewer: ['organization:read', 'work:read'],
} as const satisfies Record<OrganizationRole, readonly string[]>;

export type OrganizationPermission =
  (typeof ORGANIZATION_PERMISSIONS)[OrganizationRole][number];

export function roleHasPermission(
  role: OrganizationRole,
  permission: OrganizationPermission,
): boolean {
  return (ORGANIZATION_PERMISSIONS[role] as readonly string[]).includes(permission);
}
