import {
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLES,
  roleHasPermission,
} from '../domain';

describe('organization domain contract', () => {
  it('freezes the four R2 roles', () => {
    expect(ORGANIZATION_ROLES).toEqual(['owner', 'admin', 'estimator', 'viewer']);
  });

  it('keeps membership and audit administration away from estimators and viewers', () => {
    expect(roleHasPermission('owner', 'members:manage')).toBe(false);
    expect(roleHasPermission('admin', 'members:manage')).toBe(false);
    expect(roleHasPermission('estimator', 'members:manage')).toBe(false);
    expect(roleHasPermission('viewer', 'audit:read')).toBe(false);
  });

  it('makes viewer read-only and estimator work-scoped', () => {
    expect(ORGANIZATION_PERMISSIONS.viewer).toEqual(['organization:read']);
    expect(roleHasPermission('estimator', 'work:write')).toBe(true);
    expect(roleHasPermission('estimator', 'organization:manage')).toBe(false);
  });

  it('keeps team mutation unavailable until invitation consent and seat billing ship', () => {
    expect(roleHasPermission('owner', 'members:manage')).toBe(false);
    expect(roleHasPermission('admin', 'members:manage')).toBe(false);
  });
});
