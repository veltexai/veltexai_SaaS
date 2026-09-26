import type {
  InviteMemberInput,
  InviteMemberResult,
  Organization,
  OrganizationMember,
  TeamAdapter,
  TeamCapabilities,
} from "../types/organization";

const INVITATIONS_DISABLED =
  "Team invitations are not available yet.";

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as
    | { data?: T; error?: string }
    | null;

  if (!response.ok || !body || !("data" in body)) {
    throw new Error(body?.error ?? "Team management is unavailable. Please try again.");
  }

  return body.data as T;
}

/** Authenticated browser adapter. All authorization and projection happens server-side. */
export class ServerTeamAdapter implements TeamAdapter {
  private readonly request: typeof fetch;

  constructor(request?: typeof fetch) {
    this.request = request ?? ((...args) => globalThis.fetch(...args));
  }

  async listOrganizations(): Promise<Organization[]> {
    return readJson(await this.request("/api/team/organizations", { cache: "no-store" }));
  }

  async getActiveOrganizationId(): Promise<string | null> {
    return readJson(await this.request("/api/team/active-organization", { cache: "no-store" }));
  }

  async setActiveOrganizationId(organizationId: string): Promise<void> {
    await readJson(
      await this.request("/api/team/active-organization", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      }),
    );
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    const query = new URLSearchParams({ organizationId });
    return readJson(
      await this.request(`/api/team/members?${query.toString()}`, { cache: "no-store" }),
    );
  }

  async getCapabilities(): Promise<TeamCapabilities> {
    try {
      return await readJson(
        await this.request("/api/team/capabilities", { cache: "no-store" }),
      );
    } catch {
      // Capability ambiguity must never enable a privacy- or write-sensitive feature.
      return { invitationsEnabled: false, contactDetailsEnabled: false };
    }
  }

  async inviteMember(input: InviteMemberInput): Promise<InviteMemberResult> {
    void input;
    // Deliberately no corresponding HTTP endpoint exists.
    throw new Error(INVITATIONS_DISABLED);
  }
}

export function createServerTeamAdapter(): TeamAdapter {
  return new ServerTeamAdapter();
}
