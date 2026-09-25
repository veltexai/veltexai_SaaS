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
 * Read-only seam (plus one narrow active-organization write) that a real,
 * Codex-owned server adapter must satisfy before this UI can leave the mock.
 *
 * This is intentionally the exact surface mapped as `AVAILABLE` in
 * `docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md`'s backend
 * mapping and detailed in that document's "Post-PASS server-adapter
 * implementation plan": `listOrganizations`, the active-organization
 * read/write pair, roster reads, and capability reads. `setActiveOrganizationId`
 * is grouped here (not with membership mutation) because it is a single
 * self-scoped column write on the caller's own profile row, guarded
 * server-side by a membership-validating trigger — not a membership
 * `insert`/`update`/`delete`. No invitation, seat-billing, or
 * ownership-transfer operation belongs on this interface; see `TeamAdapter`
 * below for why `inviteMember` is deliberately excluded from it.
 */
export interface TeamReadAdapter {
  listOrganizations(): Promise<Organization[]>;
  /** The caller's own active organization id, or `null` if unset. */
  getActiveOrganizationId(): Promise<string | null>;
  /**
   * Switches the caller's active organization. A real implementation must
   * reject if `organizationId` is not one of the caller's current
   * memberships — this is a narrow, single-column write, never a general
   * membership mutation.
   */
  setActiveOrganizationId(organizationId: string): Promise<void>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  getCapabilities(): Promise<TeamCapabilities>;
}

/**
 * Frontend-owned data contract for this feature area.
 *
 * This interface is implemented locally today by `MockTeamAdapter`
 * (features/organizations/lib/mock-team-adapter.ts), which is
 * development/test-only, and by `UnavailableTeamAdapter`
 * (features/organizations/lib/unavailable-team-adapter.ts), which is the
 * production-safe fail-closed default until Codex supplies a real
 * implementation of `TeamReadAdapter`. It intentionally has no live network
 * calls, database access, or shared domain-contract imports of its own.
 *
 * `inviteMember` is deliberately **not** part of `TeamReadAdapter`: no
 * accepted server endpoint exists for it (see
 * `docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md` — `NOT
 * IMPLEMENTED`). Any production-facing implementation of this interface
 * MUST reject/throw from `inviteMember` rather than fabricate a result.
 * Only the development/test-only `MockTeamAdapter` demonstrates a working
 * `inviteMember`, and only when explicitly opted in via
 * `capabilities: { invitationsEnabled: true }`.
 */
export interface TeamAdapter extends TeamReadAdapter {
  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult>;
}
