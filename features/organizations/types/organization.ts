/**
 * R2 organization/team UI types. Role identifiers come from the canonical
 * `features/organizations/domain.ts` contract (import-compatible with
 * backend candidate `d12743a`). This file does not invent a second role
 * enum or permission matrix.
 */

import { ORGANIZATION_ROLES, type OrganizationRole } from "../domain";

export type { OrganizationRole };

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    (ORGANIZATION_ROLES as readonly string[]).includes(value)
  );
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export type MemberStatus = "active" | "invited";

export interface OrganizationMember {
  id: string;
  organizationId: string;
  /** Null while an invited email has no linked account yet. */
  userId: string | null;
  name: string;
  /**
   * Optional and privacy-sensitive. Render only when a server-owned
   * `contactDetailsEnabled` capability is true *and* an authorized
   * projection actually supplied a value. Viewers and estimators must not
   * assume this is present.
   */
  email?: string | null;
  role: OrganizationRole;
  status: MemberStatus;
  avatarUrl?: string | null;
  invitedAt?: string;
  joinedAt?: string;
}

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: OrganizationRole;
}

export interface InviteMemberResult {
  member: OrganizationMember;
}

/**
 * Server-owned feature capabilities. Every flag MUST default to `false`
 * except in an explicit test/story opt-in. There is no accepted invitation
 * or contact-detail projection yet.
 */
export interface TeamCapabilities {
  invitationsEnabled: boolean;
  contactDetailsEnabled: boolean;
}

export interface TeamReadAdapter {
  listOrganizations(): Promise<Organization[]>;
  getActiveOrganizationId(): Promise<string | null>;
  setActiveOrganizationId(organizationId: string): Promise<void>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  getCapabilities(): Promise<TeamCapabilities>;
}

export interface TeamAdapter extends TeamReadAdapter {
  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult>;
}
