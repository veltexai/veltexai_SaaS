import { MockTeamAdapter } from "../lib/mock-team-adapter";
import { FIXTURE_ORGANIZATIONS } from "../lib/fixtures";

describe("MockTeamAdapter", () => {
  it("lists the fixture organizations", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0 });
    const organizations = await adapter.listOrganizations();
    expect(organizations).toHaveLength(FIXTURE_ORGANIZATIONS.length);
    expect(organizations[0]).toEqual(FIXTURE_ORGANIZATIONS[0]);
  });

  it("lists members for a known organization", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0 });
    const members = await adapter.listMembers("org-veltex-cleaning");
    expect(members.length).toBeGreaterThan(0);
    expect(members.some((m) => m.role === "owner")).toBe(true);
  });

  it("returns an empty roster for an unknown organization id", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0 });
    const members = await adapter.listMembers("org-does-not-exist");
    expect(members).toEqual([]);
  });

  it("forces the empty scenario regardless of organization", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0, scenario: "empty" });
    const members = await adapter.listMembers("org-veltex-cleaning");
    expect(members).toEqual([]);
  });

  it("rejects every read in the error scenario", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0, scenario: "error" });
    await expect(adapter.listOrganizations()).rejects.toThrow();
    await expect(adapter.listMembers("org-veltex-cleaning")).rejects.toThrow();
    await expect(
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "new@example.com",
        role: "viewer",
      }),
    ).rejects.toThrow();
  });

  it("invites a new member and returns it with pending status", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0 });
    const { member } = await adapter.inviteMember({
      organizationId: "org-veltex-cleaning",
      email: "New.Teammate@Example.com",
      role: "estimator",
    });

    expect(member.email).toBe("new.teammate@example.com");
    expect(member.role).toBe("estimator");
    expect(member.status).toBe("invited");

    const members = await adapter.listMembers("org-veltex-cleaning");
    expect(members.some((m) => m.email === "new.teammate@example.com")).toBe(
      true,
    );
  });

  it("rejects inviting an email that already belongs to the organization", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0 });
    await expect(
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "anthony@veltexclean.com",
        role: "viewer",
      }),
    ).rejects.toThrow(/already/i);
  });

  it("rejects inviting the same email twice in one session", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0 });
    await adapter.inviteMember({
      organizationId: "org-veltex-cleaning",
      email: "repeat@example.com",
      role: "viewer",
    });

    await expect(
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "repeat@example.com",
        role: "viewer",
      }),
    ).rejects.toThrow(/already/i);
  });

  it("keeps invited members isolated to their own organization", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0 });
    await adapter.inviteMember({
      organizationId: "org-veltex-cleaning",
      email: "isolated@example.com",
      role: "viewer",
    });

    const otherOrgMembers = await adapter.listMembers("org-summit-facilities");
    expect(
      otherOrgMembers.some((m) => m.email === "isolated@example.com"),
    ).toBe(false);
  });
});
