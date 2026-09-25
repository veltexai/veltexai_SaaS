import type {
  InviteMemberInput,
  InviteMemberResult,
  Organization,
  OrganizationMember,
  TeamAdapter,
  TeamCapabilities,
} from "../types/organization";
import { FIXTURE_MEMBERS_BY_ORG, FIXTURE_ORGANIZATIONS } from "./fixtures";

export type MockTeamScenario = "default" | "empty" | "error";

/**
 * Fail-closed default. There is no real, consent-bound, seat-billed
 * invitation endpoint yet, so every caller that does not explicitly opt in
 * (tests/fixtures/an explicit development-only preview) gets a mock adapter
 * that reports invitations as disabled. Do not flip this default without an
 * accepted server contract — see
 * docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md.
 */
const DEFAULT_CAPABILITIES: TeamCapabilities = {
  invitationsEnabled: false,
};

export interface MockTeamAdapterOptions {
  /** Simulated network latency in milliseconds. Set to 0 in tests. */
  latencyMs?: number;
  /**
   * "default" uses the populated fixture, "empty" forces a zero-member
   * organization, and "error" makes every read reject — useful for exercising
   * the member list's error state without a real backend.
   */
  scenario?: MockTeamScenario;
  organizations?: Organization[];
  membersByOrg?: Record<string, OrganizationMember[]>;
  /** Defaults to the first fixture/provided organization's id, if any. */
  activeOrganizationId?: string | null;
  /**
   * Defaults to `{ invitationsEnabled: false }`. Only test/story callers
   * that are explicitly demonstrating the mock invite flow should override
   * this to `{ invitationsEnabled: true }`.
   */
  capabilities?: Partial<TeamCapabilities>;
}

function wait(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cryptoRandomId(prefix: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

/**
 * Local, in-memory stand-in for the future server-backed team adapter.
 * No network calls, no Supabase, no shared domain contracts — this only
 * exists so the UI shell has something real to render against while Codex's
 * server contract is designed and frozen.
 */
export class MockTeamAdapter implements TeamAdapter {
  private readonly latencyMs: number;
  private readonly scenario: MockTeamScenario;
  private readonly organizations: Organization[];
  private readonly membersByOrg: Record<string, OrganizationMember[]>;
  private readonly invitedEmailsByOrg = new Map<string, Set<string>>();
  private readonly capabilities: TeamCapabilities;
  private activeOrganizationId: string | null;

  constructor(options: MockTeamAdapterOptions = {}) {
    this.latencyMs = options.latencyMs ?? 300;
    this.scenario = options.scenario ?? "default";
    this.organizations = options.organizations ?? FIXTURE_ORGANIZATIONS;
    this.capabilities = { ...DEFAULT_CAPABILITIES, ...options.capabilities };
    this.activeOrganizationId =
      options.activeOrganizationId ?? this.organizations[0]?.id ?? null;

    const baseMembers = options.membersByOrg ?? FIXTURE_MEMBERS_BY_ORG;
    this.membersByOrg = Object.fromEntries(
      Object.entries(baseMembers).map(([orgId, members]) => [
        orgId,
        members.map((member) => ({ ...member })),
      ]),
    );
  }

  async listOrganizations(): Promise<Organization[]> {
    await wait(this.latencyMs);

    if (this.scenario === "error") {
      throw new Error("Could not load your organizations. Please try again.");
    }

    return this.organizations.map((org) => ({ ...org }));
  }

  async getActiveOrganizationId(): Promise<string | null> {
    await wait(this.latencyMs);

    if (this.scenario === "error") {
      throw new Error("Could not load your active organization. Please try again.");
    }

    return this.activeOrganizationId;
  }

  async setActiveOrganizationId(organizationId: string): Promise<void> {
    await wait(this.latencyMs);

    if (this.scenario === "error") {
      throw new Error("Could not switch organizations. Please try again.");
    }

    // Mirrors the real trigger-guarded write: only one of the caller's own
    // organizations is a valid target.
    if (!this.organizations.some((org) => org.id === organizationId)) {
      throw new Error("You don't have access to that organization.");
    }

    this.activeOrganizationId = organizationId;
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    await wait(this.latencyMs);

    if (this.scenario === "error") {
      throw new Error("Could not load team members. Please try again.");
    }

    if (this.scenario === "empty") {
      return [];
    }

    return (this.membersByOrg[organizationId] ?? []).map((member) => ({
      ...member,
    }));
  }

  async getCapabilities(): Promise<TeamCapabilities> {
    await wait(this.latencyMs);

    if (this.scenario === "error") {
      throw new Error("Could not load team capabilities. Please try again.");
    }

    return { ...this.capabilities };
  }

  async inviteMember(input: InviteMemberInput): Promise<InviteMemberResult> {
    await wait(this.latencyMs);

    // Defense in depth: even if a caller reaches this method while
    // invitations are disabled (e.g. a UI bug bypasses the capability
    // check), the adapter itself refuses to fabricate an invite or a
    // roster member. Fail closed, not open.
    if (!this.capabilities.invitationsEnabled) {
      throw new Error("Team invitations are not enabled for this organization yet.");
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    if (this.scenario === "error") {
      throw new Error("Could not send the invite. Please try again.");
    }

    const existingMembers = this.membersByOrg[input.organizationId] ?? [];
    const alreadyInvited =
      existingMembers.some(
        (member) => member.email.toLowerCase() === normalizedEmail,
      ) || this.invitedEmailsByOrg.get(input.organizationId)?.has(normalizedEmail);

    if (alreadyInvited) {
      throw new Error("This email has already been invited to this organization.");
    }

    const member: OrganizationMember = {
      id: cryptoRandomId("member"),
      organizationId: input.organizationId,
      userId: null,
      name: normalizedEmail.split("@")[0] ?? normalizedEmail,
      email: normalizedEmail,
      role: input.role,
      status: "invited",
      invitedAt: new Date().toISOString(),
    };

    this.membersByOrg[input.organizationId] = [...existingMembers, member];

    const invitedSet =
      this.invitedEmailsByOrg.get(input.organizationId) ?? new Set<string>();
    invitedSet.add(normalizedEmail);
    this.invitedEmailsByOrg.set(input.organizationId, invitedSet);

    return { member: { ...member } };
  }
}

export function createMockTeamAdapter(
  options?: MockTeamAdapterOptions,
): TeamAdapter {
  return new MockTeamAdapter(options);
}
