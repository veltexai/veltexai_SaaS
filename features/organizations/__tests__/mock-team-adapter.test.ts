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

  it("rejects every read in the error scenario, including capabilities", async () => {
    const adapter = new MockTeamAdapter({ latencyMs: 0, scenario: "error" });
    await expect(adapter.listOrganizations()).rejects.toThrow();
    await expect(adapter.listMembers("org-veltex-cleaning")).rejects.toThrow();
    await expect(adapter.getCapabilities()).rejects.toThrow();
    await expect(adapter.getActiveOrganizationId()).rejects.toThrow();
    await expect(
      adapter.setActiveOrganizationId("org-veltex-cleaning"),
    ).rejects.toThrow();
    await expect(
      adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "new@example.com",
        role: "viewer",
      }),
    ).rejects.toThrow();
  });

  describe("active organization (read-only seam, plus one narrow write)", () => {
    it("defaults the active organization to the first fixture organization", async () => {
      const adapter = new MockTeamAdapter({ latencyMs: 0 });
      await expect(adapter.getActiveOrganizationId()).resolves.toBe(
        "org-veltex-cleaning",
      );
    });

    it("honors an explicit initial active organization", async () => {
      const adapter = new MockTeamAdapter({
        latencyMs: 0,
        activeOrganizationId: "org-summit-facilities",
      });
      await expect(adapter.getActiveOrganizationId()).resolves.toBe(
        "org-summit-facilities",
      );
    });

    it("switches the active organization to another of the caller's own organizations", async () => {
      const adapter = new MockTeamAdapter({ latencyMs: 0 });
      await adapter.setActiveOrganizationId("org-summit-facilities");
      await expect(adapter.getActiveOrganizationId()).resolves.toBe(
        "org-summit-facilities",
      );
    });

    it("rejects switching to an organization the caller does not belong to, mirroring the real trigger-guarded write", async () => {
      const adapter = new MockTeamAdapter({ latencyMs: 0 });
      await expect(
        adapter.setActiveOrganizationId("org-not-a-member-of"),
      ).rejects.toThrow(/don't have access/i);

      // The rejected write must not have silently changed the active id.
      await expect(adapter.getActiveOrganizationId()).resolves.toBe(
        "org-veltex-cleaning",
      );
    });
  });

  describe("capabilities (fail-closed invitation gate)", () => {
    it("defaults invitations to disabled when no capabilities are supplied", async () => {
      const adapter = new MockTeamAdapter({ latencyMs: 0 });
      const capabilities = await adapter.getCapabilities();
      expect(capabilities).toEqual({ invitationsEnabled: false });
    });

    it("refuses to invite a member while invitations are disabled, even if called directly", async () => {
      const adapter = new MockTeamAdapter({ latencyMs: 0 });
      await expect(
        adapter.inviteMember({
          organizationId: "org-veltex-cleaning",
          email: "bypass@example.com",
          role: "viewer",
        }),
      ).rejects.toThrow(/not enabled/i);

      // No roster mutation happened: the member was not fabricated.
      const members = await adapter.listMembers("org-veltex-cleaning");
      expect(
        members.some((m) => m.email === "bypass@example.com"),
      ).toBe(false);
    });

    it("honors an explicit opt-in to enable invitations (test/fixture use only)", async () => {
      const adapter = new MockTeamAdapter({
        latencyMs: 0,
        capabilities: { invitationsEnabled: true },
      });
      const capabilities = await adapter.getCapabilities();
      expect(capabilities).toEqual({ invitationsEnabled: true });

      const { member } = await adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "opted.in@example.com",
        role: "viewer",
      });
      expect(member.email).toBe("opted.in@example.com");
    });
  });

  describe("invitations enabled (mock demonstration only)", () => {
    it("invites a new member and returns it with pending status", async () => {
      const adapter = new MockTeamAdapter({
        latencyMs: 0,
        capabilities: { invitationsEnabled: true },
      });
      const { member } = await adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "New.Teammate@Example.com",
        role: "estimator",
      });

      expect(member.email).toBe("new.teammate@example.com");
      expect(member.role).toBe("estimator");
      expect(member.status).toBe("invited");

      const members = await adapter.listMembers("org-veltex-cleaning");
      expect(
        members.some((m) => m.email === "new.teammate@example.com"),
      ).toBe(true);
    });

    it("rejects inviting an email that already belongs to the organization", async () => {
      const adapter = new MockTeamAdapter({
        latencyMs: 0,
        capabilities: { invitationsEnabled: true },
      });
      await expect(
        adapter.inviteMember({
          organizationId: "org-veltex-cleaning",
          email: "anthony@veltexclean.com",
          role: "viewer",
        }),
      ).rejects.toThrow(/already/i);
    });

    it("rejects inviting the same email twice in one session", async () => {
      const adapter = new MockTeamAdapter({
        latencyMs: 0,
        capabilities: { invitationsEnabled: true },
      });
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

    it("rejects a duplicate email that only differs by case", async () => {
      const adapter = new MockTeamAdapter({
        latencyMs: 0,
        capabilities: { invitationsEnabled: true },
      });
      await expect(
        adapter.inviteMember({
          organizationId: "org-veltex-cleaning",
          email: "ANTHONY@VELTEXCLEAN.COM",
          role: "viewer",
        }),
      ).rejects.toThrow(/already/i);
    });

    it("keeps invited members isolated to their own organization", async () => {
      const adapter = new MockTeamAdapter({
        latencyMs: 0,
        capabilities: { invitationsEnabled: true },
      });
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

    it("simulates network latency before resolving", async () => {
      jest.useFakeTimers();
      const adapter = new MockTeamAdapter({
        latencyMs: 500,
        capabilities: { invitationsEnabled: true },
      });

      const promise = adapter.inviteMember({
        organizationId: "org-veltex-cleaning",
        email: "slow.network@example.com",
        role: "viewer",
      });

      let settled = false;
      promise.then(() => {
        settled = true;
      });

      await Promise.resolve();
      expect(settled).toBe(false);

      jest.advanceTimersByTime(500);
      await promise;
      expect(settled).toBe(true);

      jest.useRealTimers();
    });
  });
});
