/**
 * R2 organization/team UI shell — local type contracts.
 *
 * These types describe what the UI needs. They are a *request*, not a
 * guarantee of the eventual server/database shape. Codex owns the real
 * domain contract (see docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md).
 */

/** Canonical R2 roles, per the coordination plan and Prompt 2 architecture. */
export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "estimator",
  "viewer",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

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
  email: string;
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
 * Local, adapter-reported feature capabilities. This is the fail-closed
 * switch the UI checks before showing (or acting on) the invite flow.
 *
 * `invitationsEnabled` MUST default to `false` everywhere except test/story
 * fixtures that explicitly opt in. There is no real, consent-bound,
 * seat-billed invitation endpoint yet (see
 * docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md), so the
 * production-facing adapter must never report this as `true`.
 */
export interface TeamCapabilities {
  invitationsEnabled: boolean;
}

/**
 * Frontend-owned data contract for this feature area.
 *
 * This interface is implemented locally today by `MockTeamAdapter`
 * (features/organizations/lib/mock-team-adapter.ts). It intentionally has no
 * live network calls, database access, or shared domain-contract imports —
 * Codex is expected to supply a server-backed implementation that satisfies
 * this shape (or the UI will be adjusted after the real contract is frozen).
 */
export interface TeamAdapter {
  listOrganizations(): Promise<Organization[]>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  getCapabilities(): Promise<TeamCapabilities>;
  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult>;
}
