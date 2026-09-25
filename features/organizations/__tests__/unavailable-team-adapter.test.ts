import {
  createUnavailableTeamAdapter,
  TEAM_ADAPTER_INVITATIONS_UNAVAILABLE_MESSAGE,
  TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
  UnavailableTeamAdapter,
} from "../lib/unavailable-team-adapter";

/**
 * This adapter is the production-safe default. Every method must fail
 * closed, every time, with no successful resolution and no fixture/demo
 * data — proving "adapter failures never leak mock data" at the lowest
 * level, independent of any component behavior.
 */
describe("UnavailableTeamAdapter", () => {
  it("rejects listOrganizations with the unavailable message", async () => {
    const adapter = createUnavailableTeamAdapter();
    await expect(adapter.listOrganizations()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("rejects getActiveOrganizationId", async () => {
    const adapter = createUnavailableTeamAdapter();
    await expect(adapter.getActiveOrganizationId()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("rejects setActiveOrganizationId, even with a plausible-looking id", async () => {
    const adapter = createUnavailableTeamAdapter();
    await expect(
      adapter.setActiveOrganizationId("org-veltex-cleaning"),
    ).rejects.toThrow(TEAM_ADAPTER_UNAVAILABLE_MESSAGE);
  });

  it("rejects listMembers for any organization id, including a plausible fixture-shaped one", async () => {
    const adapter = createUnavailableTeamAdapter();
    await expect(adapter.listMembers("org-veltex-cleaning")).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("rejects getCapabilities rather than resolving a safe-looking false", async () => {
    const adapter = createUnavailableTeamAdapter();
    await expect(adapter.getCapabilities()).rejects.toThrow(
      TEAM_ADAPTER_UNAVAILABLE_MESSAGE,
    );
  });

  it("rejects inviteMember with an invitation-specific message, never a silent no-op success", async () => {
    const adapter = createUnavailableTeamAdapter();
    await expect(
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "someone@example.com",
        role: "viewer",
      }),
    ).rejects.toThrow(TEAM_ADAPTER_INVITATIONS_UNAVAILABLE_MESSAGE);
  });

  it("the invitation rejection explicitly rules out invitation, seat-billing, and ownership-transfer endpoints", async () => {
    const adapter = new UnavailableTeamAdapter();
    await expect(
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "someone@example.com",
        role: "viewer",
      }),
    ).rejects.toThrow(/invitation|seat-billing|ownership-transfer/i);
  });

  it("never resolves any method successfully", async () => {
    const adapter = createUnavailableTeamAdapter();
    const results = await Promise.allSettled([
      adapter.listOrganizations(),
      adapter.getActiveOrganizationId(),
      adapter.setActiveOrganizationId("org-veltex-cleaning"),
      adapter.listMembers("org-veltex-cleaning"),
      adapter.getCapabilities(),
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "someone@example.com",
        role: "viewer",
      }),
    ]);

    expect(results.every((result) => result.status === "rejected")).toBe(true);
  });
});
