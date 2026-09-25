export const ORGANIZATION_ROLES = [
  'owner',
  'admin',
  'estimator',
  'viewer',
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type OrganizationPermission =
  | 'organization:read'
  | 'organization:manage'
  | 'members:manage'
  | 'work:read'
  | 'work:write'
  | 'audit:read';

export const ORGANIZATION_PERMISSIONS = {
  owner: ['organization:read', 'organization:manage', 'work:read', 'work:write', 'audit:read'],
  admin: ['organization:read', 'organization:manage', 'work:read', 'work:write', 'audit:read'],
  estimator: ['organization:read', 'work:read', 'work:write'],
  // Raw work records include cost, wage and margin fields. Viewer access stays
  // fail-closed until a reviewed redacted projection exists.
  viewer: ['organization:read'],
} as const satisfies Record<OrganizationRole, readonly OrganizationPermission[]>;

export function roleHasPermission(
  role: OrganizationRole,
  permission: OrganizationPermission,
): boolean {
  return (ORGANIZATION_PERMISSIONS[role] as readonly string[]).includes(permission);
}
