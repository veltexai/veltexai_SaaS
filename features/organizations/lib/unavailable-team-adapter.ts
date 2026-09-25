import type {
  InviteMemberInput,
  InviteMemberResult,
  Organization,
  OrganizationMember,
  TeamAdapter,
  TeamCapabilities,
} from "../types/organization";

/**
 * Production-safe fail-closed placeholder.
 *
 * This is the default adapter everywhere in this feature — `TeamSettingsShell`
 * and the production page both fall back to it when no explicit adapter is
 * supplied. It is used until Codex supplies an accepted, real implementation
 * of `TeamReadAdapter` (see
 * docs/product/platform-build/CURSOR_R2_CONTRACT_REQUEST.md).
 *
 * This is deliberately **not** a mock: every method rejects, every time,
 * with the same explicit, safe-to-show message. It never returns fixture
 * or demo data, and it never resolves successfully. Existing loading/error
 * UI (the org switcher's disabled/error state, the member list's retryable
 * error alert, the fail-closed invite gate) renders this rejection using
 * its current error-handling paths — no new UI state was invented for this.
 */
export const TEAM_ADAPTER_UNAVAILABLE_MESSAGE =
  "Team management isn't available yet. Check back soon.";

export const TEAM_ADAPTER_INVITATIONS_UNAVAILABLE_MESSAGE =
  "Team invitations are not available yet. There is no invitation, seat-billing, or ownership-transfer endpoint.";

export class UnavailableTeamAdapter implements TeamAdapter {
  async listOrganizations(): Promise<Organization[]> {
    throw new Error(TEAM_ADAPTER_UNAVAILABLE_MESSAGE);
  }

  async getActiveOrganizationId(): Promise<string | null> {
    throw new Error(TEAM_ADAPTER_UNAVAILABLE_MESSAGE);
  }

  async setActiveOrganizationId(): Promise<void> {
    throw new Error(TEAM_ADAPTER_UNAVAILABLE_MESSAGE);
  }

  async listMembers(): Promise<OrganizationMember[]> {
    throw new Error(TEAM_ADAPTER_UNAVAILABLE_MESSAGE);
  }

  async getCapabilities(): Promise<TeamCapabilities> {
    // Fails closed the same way as every other method here. Callers must
    // not special-case this into a successful `{ invitationsEnabled: false
    // }` resolution — a thrown rejection makes the "team management is
    // unavailable" state uniform across every section of the shell, rather
    // than presenting capabilities as a confirmed, successfully-loaded fact.
    throw new Error(TEAM_ADAPTER_UNAVAILABLE_MESSAGE);
  }

  async inviteMember(input: InviteMemberInput): Promise<InviteMemberResult> {
    void input;
    throw new Error(TEAM_ADAPTER_INVITATIONS_UNAVAILABLE_MESSAGE);
  }
}

export function createUnavailableTeamAdapter(): TeamAdapter {
  return new UnavailableTeamAdapter();
}
